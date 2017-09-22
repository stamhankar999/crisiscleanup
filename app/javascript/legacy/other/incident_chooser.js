$(document).ready(() => {
  $('#incident-chooser').change(() => {
    window.location = `/worker/incident-chooser?id=${$('#incident-chooser').val()}`;// + "&path=" + window.location.pathname
  });
});
