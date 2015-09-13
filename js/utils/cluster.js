define(['jquery', 'token-utils'], function ($, token) {

  return {
    getClusterAsync: function (config) {
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
          token: token.getToken(config.cluster)
        })
      };

      var self = this;
      $.ajax(config.cluster.api.url + config.cluster.api.path + '/cluster', options)
        .success(function (cluster) {
          cluster = cluster;
        });

      return cluster;
    }
  };
});
