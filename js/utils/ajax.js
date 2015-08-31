define(['jquery', 'token-utils', 'user-utils'], function (token, user) {
  $(document).ajaxError(function (event, jqueryXHR, error, errorThrown) {
    if (jqueryXHR.status && (jqueryXHR.status === 403)) {
      token.removeToken();
      user.removeUser();
      $(document).trigger('logout');
    }
  });
});
