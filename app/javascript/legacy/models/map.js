/**
 * Initializes a Google map object
 * @constructor
 * @param {Object} params - The configuration paramters
 * @param {string} params.elm - The id of the map div
 * @param {number} params.event_id - The id of the event
 * @param {number=0} [params.site_id] - The id of the site for the edit form
 * @param {number=4} [params.zoom] - The initial zoom level of the map
 * @param {number=39} [params.lat] - Latitude of the initial map center
 * @param {number=-90} [params.lng] - Longitutde of the initial map center
 * @param {boolean=true} [params.public_map] - Whether or not it's a public map
 * @param {boolean=true} [params.form_map] - Whether or not it's a form map
 */

import { Filters } from './filter';
import Form from './form';
import Site from './marker';
import Raven from 'raven-js';

export default function (params) {
  const $infobox = $('#map-infobox');

  const allSites = [];
  let activeMarkers = [];
  const markerClustererOptions = {
    maxZoom: 11,
    styles: [
      {
        textColor: 'black',
        url: window.image_path('map_icons/m1.png'),
        height: 53,
        width: 52,
      },
      {
        textColor: 'black',
        url: window.image_path('map_icons/m2.png'),
        height: 56,
        width: 55,
      },
      {
        textColor: 'black',
        url: window.image_path('map_icons/m3.png'),
        height: 66,
        width: 65,
      },
      {
        textColor: 'black',
        url: window.image_path('map_icons/m4.png'),
        height: 78,
        width: 77,
      },
      {
        textColor: 'black',
        url: window.image_path('map_icons/m5.png'),
        height: 90,
        width: 89,
      },
    ],
  };

  this.canvas = document.getElementById(params.elm);
  this.event_id = params.event_id;
  this.site_id = typeof params.site_id !== 'undefined' ? params.site_id : 0;
  this.public_map = typeof params.public_map !== 'undefined' ? params.public_map : true;
  this.form_map = typeof params.form_map !== 'undefined' ? params.form_map : true;
  this.zoom = typeof params.zoom !== 'undefined' ? params.zoom : 4;
  this.latitude = typeof params.lat !== 'undefined' ? params.lat : 39;
  this.longitude = typeof params.lng !== 'undefined' ? params.lng : -90;
  this.options = {
    center: new params.google.maps.LatLng(this.latitude, this.longitude),
    zoom: this.zoom,
    maxZoom: 18,
    mapTypeId: params.google.maps.MapTypeId.ROADMAP,
    scrollwheel: false,
  };
  this.map = new params.google.maps.Map(this.canvas, this.options);
  this.markerBounds = new params.google.maps.LatLngBounds();
  this.markerClusterer = new window.MarkerClusterer(this.map, [], markerClustererOptions);

  this.map.addListener('click', () => {
    $('#filters-anchor').click();
    $infobox.hide();
    this.showFilters();
  });

  // Setting this up this way just in case we end up with dynamic filters per incident.
  // Eventually, it could require a filters[] param, for example.
  // This could also end up in the setEventId method.
  const filters = new Filters({
    onUpdate: populateMap.bind(this),
  });

  this.setEventId = function (event_id) {
    $('#map-infobox').hide();
    this.event_id = event_id;
    // TODO: refactor this nonsense.
    if (this.form_map) {
      setupAddressAutocomplete.call(this);
      new Form({
        event_id: this.event_id,
        google: params.google
      });
    } else {
      $infobox.empty();
      buildMarkers.call(this);
    }
  };

  this.showFilters = function () {
    const $filtersView = $('#filters-view');
    const $formView = $('#form-view');
    const $historyView = $('#history-view');

    if ($filtersView.hasClass('hide')) {
      $formView.addClass('hide');
      $historyView.addClass('hide');
      $filtersView.removeClass('hide');
    }
  };

  this.showForm = function () {
    // Hacky way to hide the form alert box between edits.
    const $formView = $('#form-view');
    $formView.find('.alert-box a.close').click();

    const $filtersView = $('#filters-view');
    const $historyView = $('#history-view');

    if ($formView.hasClass('hide')) {
      $filtersView.addClass('hide');
      $historyView.addClass('hide');
      $formView.removeClass('hide');
    }
  };

  this.showHistory = function () {
    const $formView = $('#form-view');
    $formView.find('.alert-box a.close').click();

    const $filtersView = $('#filters-view');
    const $historyView = $('#history-view');

    if ($historyView.hasClass('hide')) {
      $filtersView.addClass('hide');
      $formView.addClass('hide');
      $historyView.removeClass('hide');
    }
  };

  function zoomToMarkerLocal(id) {
    const matchArray = $.grep(allSites, site => site.site.id === id);
    if (matchArray.length > 0) {
      const marker = matchArray[0].marker;
      this.map.setZoom(17);
      this.map.setCenter(marker.getPosition());
      marker.setAnimation(params.google.maps.Animation.BOUNCE);
      // Stop the animation after awhile
      setTimeout(() => {
        marker.setAnimation(null);
      }, 6000);
    } else {
      Raven.captureMessage('Matching site not found.', { level: 'warning' });
    }
  }
  let zoomToMarker = zoomToMarkerLocal.bind(this);

  function setupSearch(siteList) {
    const $searchBtn = $('#map-search-btn');
    // Initialize the search typeahead
    // TODO: this shouldn't be loaded or even rendered on every page.
    if ($searchBtn) {
      const siteBh = new window.Bloodhound({
        datumTokenizer(obj) {
          return window.Bloodhound.tokenizers.whitespace(obj.siteStr);
        },
        queryTokenizer: window.Bloodhound.tokenizers.whitespace,
        identify(obj) {
          return obj.id;
        },
        local: siteList.map((site) => {
          let siteStr = `${site.site.case_number}: `;
          siteStr += ` ${site.site.name}`;
          siteStr += ` ${site.site.address}`;
          siteStr += ` ${site.site.city}`;
          siteStr += ` ${site.site.state}`;
          siteStr += ` ${site.site.zip_code}`;
          return {
            id: site.site.id,
            siteStr,
          };
        }),
      });

      const searchOpts = {
        minLength: 3,
        highlight: true,
      };

      const sourceOpts = {
        name: 'sites',
        limit: 5,
        displayKey: 'siteStr',
        source: siteBh.ttAdapter(),
        templates: {
          notFound: [
            '<div class="empty-message">',
            'No sites match your query',
            '</div>',
          ].join('\n'),
        },
      };

      $searchBtn.typeahead(searchOpts, sourceOpts);
      $searchBtn.bind('typeahead:select', (event, selection) => {
        zoomToMarker(selection.id);
      });
    }
  }

  function getMarkers(route, page) {
    return $.ajax({
      type: 'GET',
      context: this,
      url: route + page,
      success(data) {
        if (data != null && data.length > 0) {
          if (route.indexOf('public') >= 0) {
            data.forEach(function (obj) {
              const lat_lng = new params.google.maps.LatLng(parseFloat(obj.blurred_latitude), parseFloat(obj.blurred_longitude));
              this.markerBounds.extend(lat_lng);
              const site = new Site({
                map: this.map,
                ccmap: this,
                position: lat_lng,
                site: obj,
                google: params.google
              });
              allSites.push(site);
              activeMarkers.push(site);
            }, this);
          } else {
            data.forEach(function (obj) {
              const lat_lng = new params.google.maps.LatLng(parseFloat(obj.latitude), parseFloat(obj.longitude));
              this.markerBounds.extend(lat_lng);
              const site = new Site({
                map: this.map,
                ccmap: this,
                position: lat_lng,
                site: obj,
                google: params.google
              });
              allSites.push(site);
              activeMarkers.push(site);
            }, this);
          }

          this.map.fitBounds(this.markerBounds);
          this.markerClusterer.addMarkers(activeMarkers.map(site => site.marker));
        } else {
          Raven.captureMessage(`Something is wrong with the map data: ${data.constructor}`);
        }
      },
      error() {
        Raven.captureMessage('500 error in map site request');
      },
    });
  }

  function buildMarkers() {
    $('.map-wrapper').append('<div class="loading"></div>');
    const PAGE_SIZE = 15000;

    let route = '';
    if (this.public_map) {
      route = `/api/public/map/${this.event_id}/${PAGE_SIZE}/`;
    } else {
      route = `/api/map/${this.event_id}/${PAGE_SIZE}/`;
    }

    $.ajax({
      url: `/api/count/${this.event_id}`,
      method: 'get',
      context: this,
      success(data) {
        clearOverlays.call(this);

        const pageLimit = Math.ceil(data / PAGE_SIZE);
        const ajaxCalls = [];
        for (let page = 1; page <= pageLimit; page++) {
          ajaxCalls.push(getMarkers.call(this, route, page));
        }

        $.when.apply(this, ajaxCalls).done(() => {
          setupSearch(allSites);
          $('.loading').remove();
          if (this.site_id > 0) {
            editSite.call(this);
          }
        });
      },
    });
  }

  // zooms in on the marker of the site
  // to edit and shows the form
  function editSite() {
    zoomToMarker(this.site_id);

    const site = activeMarkers.find(function (obj) {
      return obj.site.id === this.site_id;
    }, this);
    params.google.maps.event.trigger(site.marker, 'click');
  }

  function clearOverlays() {
    for (let i = 0; i < activeMarkers.length; i++) {
      activeMarkers[i].marker.setMap(this.map);
    }
    activeMarkers = [];
    if (typeof this.markerClusterer !== 'undefined') {
      this.markerClusterer.clearMarkers();
    }
  }

  function populateMap() {
    clearOverlays.call(this);
    activeMarkers = filters.getFilteredSites(allSites);
    this.markerClusterer.addMarkers(activeMarkers.map(site => site.marker));
  }

  // Address autocomplete
  function setupAddressAutocomplete() {
    const addressField = document.getElementById('legacy_legacy_site_address');
    const city = document.getElementById('legacy_legacy_site_city');
    const county = document.getElementById('legacy_legacy_site_county');
    const state = document.getElementById('legacy_legacy_site_state');
    const country = document.getElementById('legacy_legacy_site_country');
    const zip = document.getElementById('legacy_legacy_site_zip_code');

    if (!addressField) { return; }
    const options = {};
    const addressAC = new params.google.maps.places.Autocomplete(addressField, options);
    const map = this.map;

    addressAC.bindTo('bounds', map);

    params.google.maps.event.addListener(addressAC, 'place_changed', function () {
      const place = this.getPlace();
      populateAddressFields.call(this, place);
    });

    city.addEventListener('change', geocodeQuery.bind(this));
    state.addEventListener('change', geocodeQuery.bind(this));
    zip.addEventListener('change', geocodeQuery.bind(this));

    function geocodeQuery() {
      let num_values = 0;
      if (city.value !== '') { num_values++; }
      if (state.value !== '') { num_values++; }
      if (zip.value !== '') { num_values++; }

      if (addressField.value !== '' && num_values > 0) {
        const address = `${addressField.value},+${city.value},+${state.value}+${zip.value}`;
        $.ajax({
          method: 'get',
          url: `https://maps.googleapis.com/maps/api/geocode/json?address=${address}`,
          context: this,
          success(data) {
            if (data.status === 'OK') {
              populateAddressFields.call(this, data.results[0]);
            } else {
              Raven.captureMessage('Something went wrong with the geocoding query.', { level: 'warning' });
            }
          },
        });
      }
    }

    function populateAddressFields(place) {
      let updateZip = false;

      // populate the form with the returned place info
      for (let i = 0; i < place.address_components.length; i++) {
        const addressType = place.address_components[i].types[0];
        switch (addressType) {
          case 'street_number':
            addressField.value = place.address_components[i].long_name;
            break;
          case 'route':
            addressField.value += ` ${place.address_components[i].long_name}`;
            break;
          case 'locality':
            if (city && city.value === '') {
              city.value = place.address_components[i].long_name;
            }
            break;
          case 'administrative_area_level_2':
            if (county && county.value === '') {
              county.value = place.address_components[i].long_name;
            }
            break;
          case 'administrative_area_level_1':
            if (state && state.value === '') {
              state.value = place.address_components[i].long_name;
            }
            break;
          case 'country':
            if (country && country.value === '') {
              country.value = place.address_components[i].long_name;
            }
            break;
          case 'postal_code':
            if (zip && zip.value === '') {
              zip.value = place.address_components[i].long_name;
              updateZip = true;
            }
            break;
          case 'postal_code_suffix':
            if (zip && updateZip) {
              zip.value += `-${place.address_components[i].long_name}`;
            }
            break;
        }
      }

      if (!place.geometry) {
        return;
      }

      setLatLng(place.geometry.location);

      if (place.geometry.viewport) {
        map.fitBounds(new params.google.maps.LatLngBounds(place.geometry.viewport.southwest, place.geometry.viewport.northeast));
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }

      // Set the position of the marker using the place ID and location.
      const marker = new params.google.maps.Marker({
        draggable: true,
        position: place.geometry.location,
        map,
      });

      marker.addListener('drag', function () {
        setLatLng(this.position);
      });
    }

    // Takes a google marker position object. Seems to be called location sometimes as well.
    // Whatever. It's the marker attribute that has lat and lng methods on it.
    // TODO: move this to the form.js. It's already there for marker dragging only.
    function setLatLng(position) {
      const latInput = document.getElementById('legacy_legacy_site_latitude');
      const lngInput = document.getElementById('legacy_legacy_site_longitude');
      if (latInput && lngInput) {
        // A little hacky
        if (typeof position.lat === 'function') {
          // This came in from the marker drag event
          latInput.value = position.lat();
          lngInput.value = position.lng();
        } else {
          // This came in from the geocode result
          latInput.value = position.lat;
          lngInput.value = position.lng;
        }
      }
    }
  }

  // Geolocation
  const defaultRandomLocation = { lat: 31.4181, lng: 73.0776 };
  const myLocationMarker = new params.google.maps.Marker({
    map: this.map,
    animation: params.google.maps.Animation.DROP,
    position: defaultRandomLocation,
    visible: false,
  });
  function addLocationButton(map, marker) {
    const controlDiv = document.createElement('div');

    const firstChild = document.createElement('button');
    firstChild.style.backgroundColor = '#fff';
    firstChild.style.border = 'none';
    firstChild.style.outline = 'none';
    firstChild.style.width = '28px';
    firstChild.style.height = '28px';
    firstChild.style.borderRadius = '2px';
    firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
    firstChild.style.cursor = 'pointer';
    firstChild.style.marginRight = '10px';
    firstChild.style.padding = '0px';
    firstChild.title = 'Your Location';
    controlDiv.appendChild(firstChild);

    const secondChild = document.createElement('div');
    secondChild.style.margin = '5px';
    secondChild.style.width = '18px';
    secondChild.style.height = '18px';
    secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-1x.png)';
    secondChild.style.backgroundSize = '180px 18px';
    secondChild.style.backgroundPosition = '0px 0px';
    secondChild.style.backgroundRepeat = 'no-repeat';
    secondChild.id = 'you_location_img';
    firstChild.appendChild(secondChild);

    params.google.maps.event.addListener(map, 'dragend', () => {
      $('#you_location_img').css('background-position', '0px 0px');
    });

    firstChild.addEventListener('click', () => {
      let imgX = '0';
      const animationInterval = setInterval(() => {
        if (imgX == '-18') imgX = '0';
        else imgX = '-18';
        $('#you_location_img').css('background-position', `${imgX}px 0px`);
      }, 500);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const latlng = new params.google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          marker.setPosition(latlng);
          marker.setVisible(true);
          map.setCenter(latlng);
          map.setZoom(14);
          clearInterval(animationInterval);
          $('#you_location_img').css('background-position', '-144px 0px');
        }, () => {
          alert('There has been a problem detecting your location!  You may have geolocation deactivated in your browser or mobile device privacy settings.');
        });
      } else {
        clearInterval(animationInterval);
        $('#you_location_img').css('background-position', '0px 0px');
      }
    });

    controlDiv.index = 1;
    map.controls[params.google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
  }
  if (navigator.geolocation) {
    addLocationButton(this.map, myLocationMarker);
  }
}
