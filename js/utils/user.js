define(['jquery'], function ($) {
  var user = {
    setUser: function(cluster, username, role) {
      var user = JSON.stringify({
        username: username,
        role: role
      });

      localStorage.setItem('user-' + cluster.id, user);
    },
    getUser: function(cluster) {
      return JSON.parse(localStorage.getItem('user-' + cluster.id));
    },
    removeUser: function(cluster) {
      localStorage.removeItem('user-' + cluster.id);
    }
  };

  $(document).on('logout', function (e, options) {
    e.preventDefault();

    if (options && options.cluster) {
      user.removeUser(options.cluster);
    }
  });

  return user;
});
