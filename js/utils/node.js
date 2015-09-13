define(['jquery', 'token-utils'], function ($, token) {

  return {
    getNodes: function (config) {
      var slurmNodes = null;
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

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/nodes', options)
        .success(function (nodes) {
          slurmNodes = nodes;
        });

      return slurmNodes;
    }
  };
});
