define(['jquery'], function ($) {
  var token =  {
    getToken: function (cluster) {
      return localStorage.getItem('jwt-' + cluster.id);
    },
    setToken: function (cluster, token) {
      localStorage.setItem('jwt-' + cluster.id, token);
    },
    removeToken: function (cluster) {
      localStorage.removeItem('jwt-' + cluster.id);
    }
  };

  $(document).on('logout', function (e, options) {
    e.preventDefault();
    if (options && options.cluster) {
      token.removeToken(options.cluster);
    }
  });

  return token;
});
