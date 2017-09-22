import Raven from 'raven-js';
import CCMap from '../models';

const GoogleMapsApiLoader = require('google-maps-api-loader');

$(document).ready(() => {
  const publicMap = $('#public-map-canvas').length;
  if (publicMap !== 0) {
    const id = typeof $('.m-id.hidden')[0] !== 'undefined' ? $('.m-id.hidden')[0].innerHTML : 'none';
    GoogleMapsApiLoader({
      libraries: ['places'],
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    })
      .then((googleApi) => {
        const ccmap = new CCMap.Map({
          elm: 'public-map-canvas',
          event_id: id,
          form_map: false,
          google: googleApi,
        });

        $('.select_incident').change(() => {
          const eventId = $('.select_incident').val();
          ccmap.setEventId(eventId);
        });
      }, (err) => {
        Raven.captureMessage(err);
      });
  }
});
