define([], function () {
  return {
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
});
