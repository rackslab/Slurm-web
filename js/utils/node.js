define(['jquery', 'text!/js/core/config.json', 'token'], function ($, config, token) {
  return {
    getNodes: function () {
      var slurmNodes = null;
      var options = {
        method: 'POST',
        url: config.apiURL + config.apiPath + '/nodes',
        cache: false,
        async: false,
        type: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token.getToken()
        })
      };

      $.ajax(options)
        .success(function (nodes) {
          slurmNodes = nodes;
        });

      return slurmNodes;
    }
  };
});
