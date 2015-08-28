define(['jquery'], function () {
  $(document).ajaxError(function (event, jqueryXHR, error, errorThrown) {
      if (jqueryXHR.status && jqueryXHR.status === 403) {
        $(document).trigger('show', { page: 'login' });
      }
    });
});
