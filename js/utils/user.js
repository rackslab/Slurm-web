define(['jquery'], function ($) {
  var user = {
    setUser: function (username, role) {
      var user = JSON.stringify({
        username: username,
        role: role
      });

      localStorage.setItem('user', user);
    },
    getUser: function () {
      return JSON.parse(localStorage.getItem('user'));
    },
    removeUser: function () {
      localStorage.removeItem('user');
    }
  };

  $(document).on('logout', function (e) {
    e.preventDefault();

    user.removeUser();
  });

  return user;
});
