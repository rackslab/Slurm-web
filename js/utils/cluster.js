define([
  'jquery',
  'token-utils'
], function ($, token) {
  return {
    getClusterSync: function (config) {
      var cluster = {};

      var options = {
        type: 'POST',
        dataType: 'json',
        async: false,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/cluster', options)
        .success(function (data) {
          cluster = data;
        });

      return cluster;
    }
  };
});
