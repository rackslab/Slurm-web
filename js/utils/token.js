define([], function () {
  return {
    getToken: function () {
      return 'eyJhbGciOiJIUzI1NiIsImV4cCI6MTQ0MjA0NDA5OSwiaWF0IjoxNDQwNzQ4MDk5fQ.eyJ1c2VybmFtZSI6IioiLCJwYXNzd29yZCI6IioifQ.MpdQVjhaLMvLaow0G1AkDqsozSjXtMPhQSpKmsx4dxo';
      //return localStorage.getItem('jwt');
    },
    setToken: function (token) {
      localStorage.setItem('jwt', token)
    }
  };
});
