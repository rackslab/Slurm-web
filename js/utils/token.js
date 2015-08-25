define([], function () {
  return {
    getToken: function () {
      return 'eyJhbGciOiJIUzI1NiIsImV4cCI6MTQ0MTA4NjcxOCwiaWF0IjoxNDQwNDg2NzE4fQ.eyJ1c2VybmFtZSI6ImVkZiIsInBhc3N3b3JkIjoiZmRlZmRlIn0.PwRiFktcXisv2mZeDf7HqAKyC4s0hBE3BbFMK7X2oLY';
    },
    setToken: function () {

    }
  };
});

/*
  var apiPath = '/slurm-restapi';
  var apiURL = 'http://62.210.105.204:8081';
  var postAuthOptions = {
    'mimeType': "multipart/form-data",
    'crossDomain': true,
    'username': '*',
    'password': '*'
  };

  $.post(apiURL + apiPath + '/login', postAuthOptions, function (credentials) {
    console.log(credentials);
  });

  var postReservationsOptions = {
    'crossDomain': true,
    'data': {
      'token': ''
    }
  }

  $.post(apiURL + apiPath + '/reservations', postReservationsOptions, function (reservations) {
    console.log(reservations);
  });
*/