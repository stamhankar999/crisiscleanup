import Vue from 'vue';
import Raven from 'raven-js';
import HistoryVue from './components/history/HistoryVue';

Vue.filter('phone', phone => phone.replace(/[^0-9]/g, '')
  .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'));


if (document.getElementById('history-data')) {
  var historyVueManager = new Vue({
    el: '#history-data',
    components: {
      HistoryVue,
    },
    data: {
      historyData: {},
      claimedByUser: '',
      loading: false,
      hasError: false,
    },
    methods: {
      loadHistoryData(site) {
        const that = this;
        this.loading = true;
        this.$http.get(`/api/site-history/${site.id}`).then((response) => {
          that.historyData = response.body.history;
          that.claimedByUser = response.body.claimed_by_user;
          that.loading = false;
        }, (error) => {
          that.loading = false;
          that.hasError = true;
          Raven.captureException(error.toString());
        });
      },
    },
  });
}

export default historyVueManager;
