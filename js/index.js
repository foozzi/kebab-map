jQuery(function($) {
  var map, userPosition, CreatePoint, Markers,
    $body = $('body');
  $('#createPopup').hide();

  function initialize() {
    var i,
      mapOptions = {
        zoom: 13,
        center: userPosition,
        zoomControl: true,
        disableDefaultUI: true,
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle.SMALL,
          position: google.maps.ControlPosition.RIGHT_TOP
        }
      };

    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    google.maps.event.addListener(map, 'bounds_changed', $.debounce(function() {
      var sw = map.getBounds().getSouthWest(),
        ne = map.getBounds().getNorthEast(),
        center = map.getCenter();

      $.ajax({
        type: 'GET',
        url: 'points/list.json',
        dataType: "json",
        success: function(response) {
          var items;
          items = response.response.items;
          items.forEach(function(item, k) {

            setTimeout(function() {
              Markers.add({
                id: item.point.id,
                description: item.point.name + "\n" + item.point.description,
                lat: item.point.location.lat,
                lng: item.point.location.lng
              });
            }, 100 * k);

          });
        }
      });

    }, 100));

    geolocate();
    $body.addClass('page_init_yes');
  }

  function geolocate() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        userPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        map.setCenter(userPosition);
        map.setZoom(13);

        google.maps.event.addListener(map, 'bounds_changed', $.debounce(function() {
          var sw = map.getBounds().getSouthWest(),
            ne = map.getBounds().getNorthEast(),
            center = map.getCenter();
          $.ajax({
            type: 'GET',
            url: 'https://api.foursquare.com/v2/venues/explore',
            data: {
              ll: position.coords.latitude + ',' + position.coords.longitude,
              limit: 50,
              query: config.foursquare_query,
              client_id: config.foursquare_client_id,
              client_secret: config.foursquare_client_secret,
              v: 20160925
            },
            dataType: "jsonp",
            success: function(response) {
              position.coords.latitude
              var items;

              if (response && response.response && response.response.groups && response.response.groups[0] &&
                response.response.groups[0].items) {

                items = response.response.groups[0].items;
                items.forEach(function(item, k) {
                  if (item.venue && item.venue.name && item.venue.location && item.venue.location.lat && item.venue.location.lng && item.tips && item.tips[0]) {

                    setTimeout(function() {
                      Markers.add({
                        id: item.venue.id,
                        description: item.venue.name + "\n" + item.tips[0].text,
                        lat: item.venue.location.lat,
                        lng: item.venue.location.lng
                      });

                    }, 100 * k);
                  }
                });
              }
            }
          });

        }, 100));

      });
    }

    Markers = {
      cache: {},
      infoWindow: null,

      add: function(data) {
        var marker,
          that = this,
          cacheKey = data.src + '_' + data.id;

        if (!this.cache.hasOwnProperty(cacheKey)) {
          marker = new google.maps.Marker({
            position: new google.maps.LatLng(data.lat, data.lng),
            map: map,
            icon: image,
            animation: google.maps.Animation.DROP
          });

          google.maps.event.addListener(marker, 'click', function() {
            that.showHint(cacheKey);
          });

          data.marker = marker;
          this.cache[cacheKey] = data;
        }
      },

      showHint: function(cacheKey) {
        var data;

        if (this.cache.hasOwnProperty(cacheKey)) {
          data = this.cache[cacheKey];

          this.getInfoWindow().setContent(escapeHTML(data.description).replace("\n", "<br />"));
          this.getInfoWindow().open(map, data.marker);
        }
      },
      getInfoWindow: function() {
        return this.infoWindow || (this.infoWindow = new google.maps.InfoWindow({
          content: 'test'
        }));
      }
    };
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var image = {
    url: 'images/icon.png',
    size: new google.maps.Size(16, 16),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(16, 16)
  };

  Markers = {
    cache: {},
    infoWindow: null,

    add: function(data) {
      var marker,
        that = this,
        cacheKey = data.src + '_' + data.id;

      if (!this.cache.hasOwnProperty(cacheKey)) {
        marker = new google.maps.Marker({
          position: new google.maps.LatLng(data.lat, data.lng),
          map: map,
          icon: image,
          animation: google.maps.Animation.DROP
        });

        google.maps.event.addListener(marker, 'click', function() {
          that.showHint(cacheKey);
        });

        data.marker = marker;
        this.cache[cacheKey] = data;
      }
    },

    showHint: function(cacheKey) {
      var data;

      if (this.cache.hasOwnProperty(cacheKey)) {
        data = this.cache[cacheKey];

        this.getInfoWindow().setContent(escapeHTML(data.description).replace("\n", "<br />"));
        this.getInfoWindow().open(map, data.marker);
      }
    },

    getInfoWindow: function() {
      return this.infoWindow || (this.infoWindow = new google.maps.InfoWindow({
        content: 'test'
      }));
    }
  };

  CreatePoint = {
    active: false,
    marker: null,
    infowindow: null,

    changeState: function() {
      this.active ? this.hide() : this.show();
    },

    show: function() {
      var that = this;

      if (this.active) {
        return;
      }

      this.active = true;

      this.marker = new google.maps.Marker({
        map: map,
        position: userPosition,
        draggable: true
      });

      if (!this.infowindow) {
        this.infowindow = new google.maps.InfoWindow({
          content: $('#createPopup').html()
        });

        google.maps.event.addListener(this.infowindow, 'domready', function() {
          $('.add-popup > form').unbind('submit').submit(function(e) {
            e.preventDefault();

            var $this = $(this),
              position = that.marker.getPosition(),
              val = $this.find('textarea').val();

            $this.find('.add-popup__error').hide();
            $this.find('input').attr('disabled', 'disabled');

            $.ajax({
              url: '//formspree.io/'+config.main_mail,
              type: 'POST',
              data: {
                lat: position.lat(),
                lng: position.lng(),
                description: val
              },
              dataType: "json",
              success: function(data) {
                that.hide();
                $this.find('textarea').val('');
                $this.find('input').removeAttr('disabled');
                alert('Спасибо! Мы обязательно проверим и добавим Вашу точку на карту.');               
              },
              error: function(data) {
                $this.find('input').removeAttr('disabled');
                $this.find('.add-popup__error').show().text('Произошла ошибка. Попробуйте позже.');
              }
            });

            return false;
          });
        });
      }

      this.infowindow.open(map, this.marker);

      google.maps.event.addListener(this.infowindow, 'closeclick', function() {
        that.hide();
      });

      $('.add-button').addClass('button_active_yes');
    },

    hide: function() {
      if (!this.active) {
        return;
      }

      this.active = false;
      this.marker.setMap(null);
      $('.add-button').removeClass('button_active_yes');
    }
  };

  $('.add-button').click(function() {
    CreatePoint.changeState();
  });

  userPosition = new google.maps.LatLng(50.45015, 30.52651); // Начальные координаты
  google.maps.event.addDomListener(window, 'load', initialize);
});