define(['jquery', 'text!config.json', 'token-utils'], function ($, config, token) {
  config = JSON.parse(config);

  return {
    getClusterAsync: function () {
      var cluster = {};

      var options = {
        type: 'POST',
        dataType: 'json',
        async: false,
        crossDomain: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken()
        })
      };

      var self = this;
      $.ajax(config.apiURL + config.apiPath + '/cluster', options)
        .success(function (cluster) {
          cluster = cluster;
        });

      return cluster;
    }
  };
});
