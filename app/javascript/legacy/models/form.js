/* eslint-disable block-scoped-var,no-restricted-syntax,max-len,no-continue,prefer-destructuring */

import Raven from 'raven-js';

/**
 * Initialize the site form - requires jQuery
 * @constructor
 * @param {Object} params - The configuration paramters
 * @param {number} params.event_id
 * @param {function} [params.onCancel] - cancel callback
 * @param {function} [params.onSave] - save callback
 */
export default function (params) {
  // TODO: remove simple_form on the server
  // Silly generated id because we're using simple_form on the server
  const self = this; // This is messy, but easier atm.
  const form = document.getElementById('new_legacy_legacy_site');
  const header = document.getElementById('form-header');
  const cancelBtn = document.getElementById('cancel-form-btn');
  const claimBtn = document.getElementById('claim-form-btn');
  const saveBtn = document.getElementById('save-form-btn');
  if (!params.event_id) {
    Raven.captureMessage('CCMap.Form requires an eventId');
    return;
  }
  const eventId = params.event_id;

  // Autopopulate the request_date field if empty (hydrate should overwrite this on edit forms)
  const date = new Date();
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
  const dd = date.getDate().toString();
  const dateStr = `${yyyy}-${mm[1] ? mm : `0${mm[0]}`}-${dd[1] ? dd : `0${dd[0]}`}`;
  if (form && form.elements.legacy_legacy_site_request_date) {
    form.elements.legacy_legacy_site_request_date.value = dateStr;
  }

  // Set site marker position, remove drag event, and disable dragging
  const disableMarkerDragging = function () {
    const lat = parseFloat(self.ccsite.site.latitude);
    const lng = parseFloat(self.ccsite.site.longitude);
    const latLng = new params.google.maps.LatLng(lat, lng);
    self.ccsite.marker.setPosition(latLng);

    self.ccsite.marker.setDraggable(false);
    self.markerListener.remove();
  };

  // Enable marker dragging and add drag event to update lat/lng
  const enableMarkerDragging = () => {
    self.ccsite.marker.setDraggable(true);
    self.markerListener = self.ccsite.marker.addListener('drag', setLatLng);
  };

  const getErrors = () => {
    const list = [];
    $.each($('form input.required'), (i, v) => {
      if (v.value === '') { list.push(v); }
    });
    return list;
  };

  // Takes a google marker position object. Seems to be called location sometimes as well.
  // Whatever. It's the marker attribute that has lat and lng methods on it.
  const setLatLng = () => {
    const { position } = this;
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
  };

  // Most of this is hacking around the simple_form stuff we're not using anyway...
  const buildData = (localForm) => {
    const postData = {
      legacy_legacy_site: {
        data: {},
      },
    };

    // TODO: maybe make this suck slighly less by dynamically building it server
    //   side based on the current state of the LegacySite model.
    //   The params would be great.
    const topLevelFields = [
      'address',
      'blurred_latitude',
      'blurred_longitude',
      'case_number',
      'claim',
      'claimed_by',
      'legacy_event_id',
      'latitude',
      'longitude',
      'name',
      'city',
      'county',
      'state',
      'zip_code',
      'phone1',
      'phone2',
      'reported_by',
      'requested_at',
      'status',
      'work_type',
      'data',
      'created_at',
      'updated_at',
      'request_date',
      'appengine_key',
      'work_requested',
      'skip_duplicates',
    ];
    // create the data object from all of the inputs that are not top level
    const inputs = localForm.elements;
    for (let i = 0; i < inputs.length; i += 1) {
      if (inputs[i].type === 'button') { continue; }
      if (inputs[i].type === 'submit') { continue; }
      let fieldName = /\[(.*)\]/.exec(inputs[i].name);
      if (fieldName && fieldName.length > 1) {
        fieldName = fieldName[1];
        if (topLevelFields.indexOf(fieldName) > -1) {
          // Put it top level
          // deal with the checkboxes...
          if (inputs[i].type === 'checkbox') {
            if (inputs[i].checked) {
              postData.legacy_legacy_site[fieldName] = inputs[i].value;
            }
          } else {
            postData.legacy_legacy_site[fieldName] = inputs[i].value;
          }
        } else {
          // Put it in data
          // deal with the checkboxes...
          if (inputs[i].type === 'checkbox') {
            if (inputs[i].checked) {
              postData.legacy_legacy_site.data[fieldName] = inputs[i].value;
            }
          } else {
            postData.legacy_legacy_site.data[fieldName] = inputs[i].value;
          }
        }
      } else {
        postData[inputs[i].name] = inputs[i].value;
      }
    }
    return postData;
  };

  this.hydrate = (ccsite) => {
    if (!form) {
      return;
    }

    // Update the form action to update the site
    form.action = `/worker/incident/${eventId}/edit/${ccsite.site.id}`;

    // Change the Reset button label to "Cancel"
    if (cancelBtn) {
      $(cancelBtn).html('Cancel');
    }

    // Set the site so it can be updated on save
    this.ccsite = ccsite;

    // Loop over the site attribues and populate the corresponding inputs if they exist
    for (const field in ccsite.site) {
      if (Object.prototype.hasOwnProperty.call(ccsite.site, field) && typeof form.elements[`legacy_legacy_site[${field}]`] !== 'undefined') {
        form.elements[`legacy_legacy_site[${field}]`].value = ccsite.site[field];
      }
    }

    // Loop over the site.data attribues and populate the corresponding inputs if they exist
    for (const field in ccsite.site.data) {
      if (Object.prototype.hasOwnProperty.call(ccsite.site.data, field) && typeof form.elements[`legacy_legacy_site[${field}]`] !== 'undefined') {
        const input = form.elements[`legacy_legacy_site[${field}]`];
        // Deal with checkboxes. I'm honestly at a loss how to do this a better way.
        if (input.length === 2 && ccsite.site.data[field] === 'y') {
          // assume it's a checkbox
          input[1].checked = true;
        } else {
          input.value = ccsite.site.data[field];
        }
      }
    }

    // Update or hide the claim/unclaim submit button
    if (window.InitialState.user.admin || ccsite.site.claimed_by === window.InitialState.user.org_id || !ccsite.site.claimed_by) {
      $(claimBtn).show();
      if (ccsite.site.claimed_by) {
        claimBtn.value = 'Unclaim & Save';
      } else {
        claimBtn.value = 'Claim & Save';
      }
    } else {
      $(claimBtn).hide();
    }

    // Update the form header title
    header.innerHTML = `Edit Case ${ccsite.site.case_number}`;

    // Enable marker dragging and add the event to set the lat/lng
    enableMarkerDragging();
  };

  // Cancel on edit form. Reset new form.
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      form.reset();
      form.scrollTop = 0;
      // Disable the marker dragging and remove the drag event
      disableMarkerDragging();

      if (params.onCancel) {
        params.onCancel();
      }
    });
  }

  if (claimBtn) {
    claimBtn.addEventListener('click', () => {
      form.elements.legacy_legacy_site_claim.value = true;
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      form.elements.legacy_legacy_site_claim.value = false;
    });
  }

  // Submit
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      $('.error, .alert-box').remove();
      const errorList = getErrors();
      if (errorList.length === 0) {
        const localBuildData = buildData(this);
        $.ajax({
          type: 'POST',
          url: this.action,
          localBuildData,
          success(data) {
            if (data.duplicates) {
              const duplicatesList = $('<ul>', { id: 'duplicates-list' });
              data.duplicates.forEach((dup) => {
                duplicatesList.append(`<li><a href="/worker/incident/${dup.event_id}/edit/${dup.id}" target="_blank">${
                  dup.case_number
                }: ${
                  dup.address
                }</a></li>`);
              });
              var alertHtml = $('<div data-alert class="alert-box info">'
                + '<p><strong>Possible Duplicates</strong></p>'
                + '<a href="#" class="close">&times;</a>'
                + '</div>').append(duplicatesList);

              // Skip duplicates and ignore buttons
              alertHtml.append($('<div class="row">'
                + '<div class="small-12 medium-12 large-12">'
                + '<a id="skip-and-save" class="button tiny">Skip Duplicates and Save</a>'
                + '</div></div>'
                + '<div class="row">'
                + '<div class="small-12 medium-12 large-12">'
                + '<a id="skip-and-claim" class="button tiny">Skip Duplicates and Claim</a>'
                + '</div></div>'));

              $('form').prepend(alertHtml);

              const skipDup = $('#legacy_legacy_site_skip_duplicates');
              $('#skip-and-save').click(() => {
                skipDup.prop('checked', true);
                saveBtn.click();
              });
              $('#skip-and-claim').click(() => {
                skipDup.prop('checked', true);
                claimBtn.click();
              });
            } else if (data.errors) {
              const errorList = $('<div>', { id: 'error-list' });
              data.errors.forEach((error) => {
                errorList.append(`<p>${error}</p>`);
              });
              const alertHtml = $('<div data-alert class="alert-box warning"><a href="#" class="close">&times;</a></div>').append(errorList);
              $('form').prepend(alertHtml);
            } else if (data.id === undefined && data.updated === undefined) {
              const html = `<div data-alert class='alert-box'>${data}<a href='#' class='close'>&times;</a></div>`;
              $('.close').click(() => {
                $('form').prepend(html);
                $('.alert-box').remove();
              });
            } else if (data.updated !== undefined) {
              // Successful save on the edit form
              const nameStr = `${data.updated.case_number} - ${data.updated.name}`;
              const html = `<div data-alert class='alert-box'>${nameStr} was successfully saved<a href='#' class='close'>&times;</a></div>`;
              $('#alert-container').html(html);
              form.reset();
              form.scrollTop = 0;
              if (params.onSave) {
                params.onSave();
              }

              // update the site info
              // TODO: Set up the legacy_organization association everywhere. name only.
              if (data.updated.legacy_organization) {
                data.updated.org_name = data.updated.legacy_organization.name;
              }
              self.ccsite.site = data.updated;

              // update the map marker
              self.ccsite.marker.setIcon(self.ccsite.generateIconFilename());

              // Disable the marker dragging and remove the drag event
              disableMarkerDragging();

              // update the infobox
              self.ccsite.updateInfoboxHtml();
            } else {
              // Successful save on the new site form
              let nameStr = `${data.case_number} - ${data.name}`;
              let html = `<div data-alert class='alert-box'>${nameStr} was successfully saved<a href='#' class='close'>&times;</a></div>`;
              $('#alert-container').html(html);
              form.reset();
              form.scrollTop = 0;
            }
            form.scrollTop = 0;
            window.scrollTo(0, 0);
          },
          error() {
            alert('Server-side Error (400 or 500). The server did not receive an expected piece of information. This is usually a temporary error. Try refreshing or opening this page in a new window.'); // Make sure the address contains a street number.
          },
        });
      } else {
        $.each(errorList, (i, v) => {
          $(v).parent().append("<small class='error'>can't be blank</small>");
        });
      }
      return false;
    });
  }




}
