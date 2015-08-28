define([], function () {
  return {
    getToken: function () {
      return localStorage.getItem('jwt');
    },
    setToken: function (token) {
      localStorage.setItem('jwt', token)
    }
  };
});
