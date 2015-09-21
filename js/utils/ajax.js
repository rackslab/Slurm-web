define([
  'jquery',
], function ($) {
  $(document).ajaxError(function (event, jqueryXHR, error, errorThrown) {
    if (!jqueryXHR.status) {
      console.log(JSON.stringify(event), JSON.stringify(jqueryXHR), JSON.stringify(error), JSON.stringify(errorThrown));
    }
    if ((jqueryXHR.status === 403) && (error.url !== '/slurm-restapi/login')) {
      $(document).trigger('logout');
    }
  });
});
