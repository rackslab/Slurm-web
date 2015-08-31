define(['jquery'], function ($) {
  var token =  {
    getToken: function () {
      return localStorage.getItem('jwt');
    },
    setToken: function (token) {
      localStorage.setItem('jwt', token);
    },
    removeToken: function () {
      localStorage.removeItem('jwt');
    }
  };

  $(document).on('logout', function (e) {
    e.preventDefault();

    token.removeToken();
  });

  return token;
});
