/*
 * build map with all of the pins clustered
 */
import Form from './form';
import UnclaimedStatusColorMap from './UnclaimedStatusColorMap';
import historyVueManager from '../../history';

export default function (params) {
  const $infobox = $('#map-infobox');

  const self = this;
  this.map = params.map;
  this.ccmap = params.ccmap;
  this.site = params.site;
  this.updateInfoboxHtml = toInfoboxHtml.bind(this); // Gross. Calling this in form.js.
  this.site_fetched = this.ccmap.public_map; // If it's a public_map set to true.

  // TODO: check if the file exists on the server or some other validation here.
  this.generateIconFilename = function () {
    let color;
    if (this.site.claimed_by || /Closed/.test(this.site.status)) {
      color = UnclaimedStatusColorMap[this.site.status];
    } else {
      color = 'red';
    }
    // this is the key sent to the image_path function in app/assets/javascripts/images.js.erb
    return window.image_path(`map_icons/${this.site.work_type.replace(/\s+/g, '_')}_${color}.png`);
  };

  this.marker = new params.google.maps.Marker({
    position: params.position,
    map: params.map,
    icon: self.generateIconFilename.call(self),
  });

  function toggleInfobox() {
    if (this.ccmap.public_map) {
      toPublicInfoboxHtml.call(this);
    } else {
      toInfoboxHtml.call(this);
    }
    if ($infobox.is(':hidden')) {
      $infobox.slideToggle();
    }
    this.ccmap.showFilters();
  }

  this.marker.addListener('click', () => {
    // Call site endpoint here.
    if (!this.site_fetched) {
      $.ajax({
        type: 'GET',
        context: this,
        url: `/api/site/${this.site.id}`,
        success(data) {
          this.site = data;
          this.site_fetched = true;
          toggleInfobox.call(this);
        },
      });
    } else {
      toggleInfobox.call(this);
    }
  });

  /**
   * Takes a legacy_site obj and returns an html table (string) of the attributes
   * for the public map
   */
  function toPublicInfoboxHtml() {
    const wrapper = document.createElement('div');
    const closeBtn = document.createElement('a');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    const row = document.createElement('div');
    row.className = 'row';
    const header = document.createElement('div');
    header.className = 'small-12 columns';
    closeBtn.addEventListener('click', () => {
      $infobox.slideToggle();
    });
    header.appendChild(closeBtn);
    row.appendChild(header);
    wrapper.appendChild(row);

    const caseNumberText = document.createTextNode(`Case #: ${this.site.case_number}`);
    const caseNumberH4 = document.createElement('h4');
    caseNumberH4.appendChild(caseNumberText);
    wrapper.appendChild(caseNumberH4);

    const notice = document.createTextNode('Name, Address, Phone Number are removed from the public map');
    const noticeP = document.createElement('p');
    noticeP.appendChild(notice);
    wrapper.appendChild(noticeP);

    let addressString = `Address: ${this.site.address}, ${this.site.city}, ${this.site.state}`;
    if (this.site.zip_code) {
      addressString += `  ${this.site.zip_code.substring(0, 5)}`;
    }
    const addressText = document.createTextNode(addressString);
    const addressP = document.createElement('p');
    addressP.appendChild(addressText);
    wrapper.appendChild(addressP);

    const workTypeText = document.createTextNode(`Work Type: ${this.site.work_type}`);
    const workTypeP = document.createElement('p');
    workTypeP.appendChild(workTypeText);
    wrapper.appendChild(workTypeP);

    const statusText = document.createTextNode(`Status: ${this.site.status}`);
    const statusP = document.createElement('p');
    statusP.appendChild(statusText);
    wrapper.appendChild(statusP);

    $infobox.html(wrapper);
  }

  /**
   * Takes a legacy_site obj and returns an html table (string) of the attributes
   */
  function toInfoboxHtml() {
    const table = document.createElement('div');
    const closeBtn = document.createElement('a');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    const row = document.createElement('div');
    row.className = 'row';
    const header = document.createElement('div');
    header.className = 'small-12 columns';
    closeBtn.addEventListener('click', () => {
      $infobox.slideToggle();
    });
    // header.appendChild(closeBtn);
    // row.appendChild(header);
    // table.appendChild(row);

    // TODO: fix this with a templating library (Handlebars.js)
    // Case number
    table.appendChild(createTableRow(
      document.createTextNode('Case Number'),
      document.createTextNode(this.site.case_number),
    ));

    // Phone 1
    let phone1;
    if (this.site.phone1) {
      phone1 = this.site.phone1;
    } else if (this.site.data && this.site.data.phone1 && this.site.data.phone1 !== '') {
      phone1 = this.site.data.phone1;
    }
    if (phone1) {
      const phone1tag = document.createElement('a');
      phone1tag.appendChild(document.createTextNode(phone1));
      phone1tag.href = `tel:${phone1}`;
      table.appendChild(createTableRow(
        document.createTextNode('Phone 1'),
        phone1tag,
      ));
    }

    // Phone 2
    let phone2;
    if (this.site.phone2) {
      phone2 = this.site.phone2;
    } else if (this.site.data && this.site.data.phone2 && this.site.data.phone2 !== '') {
      phone2 = this.site.data.phone2;
    }
    if (phone2) {
      const phone2tag = document.createElement('a');
      phone2tag.appendChild(document.createTextNode(phone2));
      phone2tag.href = `tel:${phone2}`;
      table.appendChild(createTableRow(
        document.createTextNode('Phone 2'),
        phone2tag,
      ));
    }

    // claimed by
    if (this.site.claimed_by) {
      const claimedLink = document.createElement('a');
      const url = `/worker/incident/${this.ccmap.event_id}/organizations/${this.site.claimed_by}`;
      claimedLink.href = url;
      claimedLink.target = '_blank';
      claimedLink.appendChild(document.createTextNode(this.site.org_name));
      table.appendChild(createTableRow(
        document.createTextNode('Claimed By:'),
        claimedLink,
      ));
    }

    // TODO: Get rid of this displayObj thing or refactor. It turned out to be a bad idea pretty quickly.
    // Create an object of key value pairs to display
    const displayObj = {
      Name: this.site.name,
    };

    // Requests
    if (this.site.data && this.site.data.work_requested) {
      displayObj.Requests = this.site.data.work_requested;
    }

    // Address
    displayObj.Address = `${this.site.address}, ${this.site.city}, ${this.site.state}`;

    // Test for zip_code. I don't see any zip codes in the current data
    if (this.site.zip_code) {
      displayObj.Address += `  ${this.site.zip_code}`;
    }

    // Data field
    if (this.site.data) {
      // Phone field
      const phone = [];
      if (this.site.data.phone1 && this.site.data.phone1.length > 10) {
        phone.push(this.site.data.phone1);
      }
      if (this.site.data.phone2 && this.site.data.phone2.length > 10) {
        phone.push(this.site.data.phone2);
      }
      if (phone.length > 0) {
        displayObj.Phone = phone.join(', ');
      }
      // end Phone field

      // data hstore field stuff
      const details = formattedDetails(this.site.data);
      if (details) {
        displayObj.Details = details;
      }
    }

    for (var key in displayObj) {
      if (displayObj.hasOwnProperty(key)) {
        table.appendChild(createTableRow(
          document.createTextNode(`${key}:`),
          document.createTextNode(displayObj[key]),
        ));
      }
    }

    // status dropdown
    const statusDropdown = document.createElement('select');
    statusDropdown.onchange = statusSelect.bind(this);
    const statusOptions = [
      'Open, unassigned',
      'Open, assigned',
      'Open, partially completed',
      'Open, needs follow-up',
      'Closed, completed',
      'Closed, incomplete',
      'Closed, out of scope',
      'Closed, done by others',
      'Closed, no help wanted',
      'Closed, rejected',
      'Closed, duplicate',
    ];
    statusOptions.forEach((optionLabel) => {
      const option = document.createElement('option');
      if (optionLabel === this.site.status) {
        option.selected = 'selected';
      }
      option.appendChild(document.createTextNode(optionLabel));
      statusDropdown.appendChild(option);
    });
    table.appendChild(createTableRow(
      document.createTextNode('Status:'),
      statusDropdown,
    ));

    // action buttons
    // TODO: a button class would be cool here, so we could attach the click event callbacks and whatnot.
    const actionButtons = {};
    if (this.site.claimed_by) {
      actionButtons['Contact Org'] = contactOrg.bind(this);
    }

    actionButtons.Print = print.bind(this);

    actionButtons.Edit = edit.bind(this);

    actionButtons.History = history.bind(this);

    if (this.site.claimed_by === window.InitialState.user.org_id || (window.InitialState.user.admin && this.site.claimed_by !== null)) {
      actionButtons.Unclaim = claim.bind(this);
    } else if (this.site.claimed_by === null) {
      actionButtons.Claim = claim.bind(this);
    }
    const buttonRow = document.createElement('div');
    buttonRow.className = 'row';
    const buttonCell = document.createElement('div');
    buttonCell.className = 'small-12 medium-9 medium-offset-3 large-9 large-offset-3 columns';
    for (var k in actionButtons) {
      if (actionButtons.hasOwnProperty(k)) {
        const button = document.createElement('a');
        button.className = 'button tiny';
        button.appendChild(document.createTextNode(k));
        button.onclick = actionButtons[k];
        buttonCell.appendChild(button);
      }
    }
    buttonRow.appendChild(buttonCell);
    buttonRow.appendChild(closeBtn);
    table.insertBefore(buttonRow, table.firstChild);

    $infobox.html(table);
  }

  /**
   * Takes a legacy_site.data obj and returns a string of details to show in the infobox
   */
  function formattedDetails(data) {
    // TODO: clean this up once some of these fields are moved to the primary, LegacySite, model
    const blackList = [
      'address_digits',
      'address_metaphone',
      'assigned_to',
      'city_metaphone',
      'claim_for_org',
      'county',
      'cross_street',
      'damage_level',
      'date_closed',
      'do_not_work_before',
      'event',
      'event_name',
      'habitable',
      'hours_worked_per_volunteer',
      'ignore_similar',
      'initials_of_resident_present',
      'inspected_by',
      'landmark',
      'member_of_assessing_organization',
      'modified_by',
      'name_metaphone',
      'phone1', // This is being shown in its own field
      'phone2', // This is being shown in its own field
      'phone_normalised',
      'prepared_by',
      'priority',
      'release_form',
      'temporary_address',
      'time_to_call',
      'total_loss',
      'total_volunteers',
      'unrestrained_animals',
      'work_requested', // This is being shown in its own field
      'zip_code', // This is being shown in the address field
    ];
    const details = [];

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if (blackList.indexOf(key) !== -1) { continue; }
        if (!data[key]) { continue; }
        if (data[key] === 'n') { continue; }
        if (data[key] === '0') { continue; }

        let formattedKey = key.replace(/_/g, ' ');
        let formattedValue = data[key].replace(/_/g, ' ');
        formattedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
        formattedValue = formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1);
        details.push(`${formattedKey}: ${formattedValue}`);
      }
    }

    if (details.length > 0) {
      return details.join(', ');
    }
    return false;
  }

  /**
   * Creates a table row of two cells created from two DOM nodes
   *
   * @param {HTMLElement} labelNode - the label
   * @param {HTMLElement} valueNode - the value
   *
   * @returns {HTMLElement} row - a tr with two td's
   */
  function createTableRow(labelNode, valueNode) {
    const row = document.createElement('div');
    row.className = 'row';
    const labelCell = document.createElement('div');
    labelCell.className = 'small-12 medium-3 large-3 columns';
    const strongLabel = document.createElement('strong');
    const valueCell = document.createElement('div');
    valueCell.className = 'small-12 medium-9 large-9 columns';
    strongLabel.appendChild(labelNode);
    labelCell.appendChild(strongLabel);
    valueCell.appendChild(valueNode);
    row.appendChild(labelCell);
    row.appendChild(valueCell);

    return row;
  }

  function statusSelect(event) {
    const status = event.target.value;
    $.ajax({
      url: `/api/update-site-status/${this.site.id}`,
      type: 'POST',
      context: this,
      data: {
        status,
      },
      dataType: 'json',
      success(data) {
        if (data.status === 'success') {
          this.site.claimed_by = data.claimed_by;
          this.site.status = status;
          this.marker.setIcon(this.generateIconFilename.call(this));
          // TODO: this will all be better in React. I promise.
          toInfoboxHtml.call(this);
        }
      },
      error() {
      },
    });
  }

  function contactOrg() {
    if (this.site.claimed_by) {
      const url = `/worker/incident/${this.ccmap.event_id}/organizations/${this.site.claimed_by}`;
      const win = window.open(url, '_blank');
      win.focus();
    }
  }

  function print() {
    const url = `/worker/incident/${this.ccmap.event_id}/print/${this.site.id}`;
    const win = window.open(url, '_blank');
    win.focus();
  }

  function edit() {
    $infobox.slideToggle();
    const form = new Form({
      event_id: this.ccmap.event_id,
      onCancel: function () {
        this.ccmap.showFilters();
        $infobox.slideToggle();
      }.bind(this),
      onSave: function () {
        this.ccmap.showFilters();
        $infobox.slideToggle();
      }.bind(this),
      google: params.google
    });

    form.hydrate(this);

    this.ccmap.showForm();
  }

  function history() {
    if (historyVueManager != null) {
      historyVueManager.loadHistoryData(this.site);
    }

    this.ccmap.showHistory();
  }

  // This should work like a toggle
  function claim() {
    $.ajax({
      url: `/api/claim-site/${this.site.id}`,
      type: 'POST',
      context: this,
      dataType: 'json',
      success(data) {
        if (data.status === 'success') {
          // This is kinda gross and asking for trouble. React?
          this.site.claimed_by = data.claimed_by;
          this.site.status = data.site_status;
          this.site.org_name = data.org_name;
          this.marker.setIcon(this.generateIconFilename.call(this));
          // TODO: this will all be better in React. I promise.
          toInfoboxHtml.call(this);
        }
      },
      error() {
      },
    });
  }
}
