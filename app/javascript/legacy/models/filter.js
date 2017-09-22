/**
 * Initializes a map filter object
 * @constructor
 * @param {Object} params - The configuration parameters
 * @param {string} params.id - The id used for DOM elements
 * @param {string} params.label - The visible label show to the user
 * @param {function} params.condition - Test site must pass to be in this set
 */
export function Filter(params) {
  this.id = params.id;
  this.label = params.label;
  this.condition = params.condition;

  this.build = function () {
    this.input = document.createElement('input');
    this.input.setAttribute('id', this.id);
    this.input.setAttribute('type', 'checkbox');
    const label = document.createElement('label');
    label.setAttribute('for', this.id);
    label.appendChild(document.createTextNode(this.label));
    const row = document.createElement('div');
    row.className = 'row';
    const labelCell = document.createElement('div');
    labelCell.className = 'small-10 medium-10 large-10 columns';
    labelCell.appendChild(label);
    const inputCell = document.createElement('div');
    inputCell.className = 'small-2 medium-2 large-2 columns';
    inputCell.appendChild(this.input);
    row.appendChild(labelCell);
    row.appendChild(inputCell);

    return row;
  }.bind(this);
}


/**
 * Build all of the CCMap.Map filters here
 * @constructor
 * @param {Object} params - The configuration parameters
 * @param {function} params.onUpdate - The function called when filters update
 */
export function Filters(params) {
  let userOrgId;
  let userOrgName;
  // TODO: Update this mess once we get lodash in here.
  if (window.InitialState) {
    userOrgId = window.InitialState.user.org_id;
    userOrgName = window.InitialState.user.org_name;
  }
  const { onUpdate } = params;
  const filterParams = [
    {
      id: 'claimed-by',
      label: `Claimed by ${userOrgName}`,
      condition(site) {
        return site.site.claimed_by === userOrgId;
      },
    },
    {
      id: 'reported-by',
      label: `Reported by ${userOrgName}`,
      condition(site) {
        return site.site.reported_by === userOrgId;
      },
    },
    {
      id: 'unclaimed',
      label: 'Unclaimed',
      condition(site) {
        return site.site.claimed_by === null;
      },
    },
    {
      id: 'open',
      label: 'Open',
      condition(site) {
        return /Open/.test(site.site.status);
      },
    },
    {
      id: 'closed',
      label: 'Closed',
      condition(site) {
        return /Closed/.test(site.site.status);
      },
    },
    {
      id: 'flood-damage',
      label: 'Primary problem is flood damage',
      condition(site) {
        return site.site.work_type === 'Flood';
      },
    },
    {
      id: 'trees',
      label: 'Primary problem is trees',
      condition(site) {
        return site.site.work_type === 'Trees';
      },
    },
    {
      id: 'debris',
      label: 'Debris removal',
      condition(site) {
        return /Debris/.test(site.site.work_type);
      },
    },
    {
      id: 'other',
      label: 'Other',
      condition(site) {
        return /^(?!Debris|Trees|Flood).*$/.test(site.site.work_type);
      },
    },
  ];
  const filters = [];
  let activeFilters = [];
  const filterList = document.getElementById('map-filters');

  function setFilters(event) {
    // Only trigger for the input element
    if (event.target.tagName === 'INPUT') {
      activeFilters = filters.filter(filter => filter.input.checked).map(filter => filter);
      onUpdate();
    }
  }

  function renderFilters() {
    filterParams.forEach(function (filter) {
      const filterObj = new Filter(filter);
      const filterDOM = filterObj.build();
      filterDOM.addEventListener('click', setFilters.bind(this), true);
      filterList.appendChild(filterDOM);
      filters.push(filterObj);
    }, this);
  }

  if (filterList) {
    renderFilters.call(this);
  }

  this.getFilteredSites = (allSites) => {
    if (activeFilters.length === 0) {
      return allSites;
    }

    const sites = [];

    allSites.forEach((site) => {
      let passes = true;
      for (let i = 0; i < activeFilters.length; i += 1) {
        if (!activeFilters[i].condition(site)) {
          passes = false;
          break;
        }
      }

      if (passes) {
        sites.push(site);
      }
    });

    return sites;
  };
}
