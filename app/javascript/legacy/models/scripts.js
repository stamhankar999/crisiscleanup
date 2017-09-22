import Raven from 'raven-js';
import CCMap from '.';

const GoogleMapsApiLoader = require('google-maps-api-loader');

$(document).ready(() => {
  const path = $(window.location).attr('pathname');
  const pathArray = path.split('/');
  const workerMap = $('#worker-map-canvas').length;
  let eventId;

  // if a map is on the page get incident id
  if (workerMap !== 0) {
    eventId = typeof $('.m-id.hidden')[0] !== 'undefined' ? $('.m-id.hidden')[0].innerHTML : 'none';

    GoogleMapsApiLoader({
      libraries: ['places'],
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    })
      .then((googleApi) => {
        const siteId = parseInt($('#site-id').html());
        const ccmap = new CCMap.Map({
          elm: 'worker-map-canvas',
          eventId,
          siteId,
          public_map: false,
          form_map: pathArray.indexOf('form') !== -1,
          google: googleApi,
        });
        // TODO: remove this once the worker map instantiation is setting the event correctly.
        ccmap.setEventId(eventId);
      }, (err) => {
        Raven.captureMessage(err);
      });
  }

  let csvDownloadBtnText = 'CSV';
  if (!eventId || eventId === 'undefined') {
    eventId = $('#incident-chooser').find(':selected').val();
    csvDownloadBtnText = 'Download CSV';
  }

  // Setup the download-csv-button if it's present
  const $dlbtn = $('#download-csv-btn');
  if ($dlbtn) {
    let jobId;
    let enabled = true;

    const requestCsv = () => {
      $.ajax({
        type: 'GET',
        url: `/worker/incident/${eventId}/download-sites.json?job_id=${jobId}`,
        success(response) {
          if (response.status === 200 && Object.prototype.hasOwnProperty.call(response, 'url')) {
            window.location.replace(response.url);
            enabled = true;
            $dlbtn.html(csvDownloadBtnText);
          } else if (Object.prototype.hasOwnProperty.call(response, 'message')) {
            setTimeout(requestCsv, 5000);
          } else {
            setTimeout(requestCsv, 5000);
          }
        },
      });
    };

    $dlbtn.click((e) => {
      e.preventDefault();
      if (enabled) {
        enabled = false;
        $dlbtn.html('<span>Generating CSV, please wait . . . </span><i class="fa fa-spinner fa-spin"></i>');

        $.get(`/worker/incident/${eventId}/download-sites`, (data) => {
          jobId = data.job_id;
          requestCsv();
        });
      }
    });
  }
});
