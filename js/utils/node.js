define(['jquery', 'text!config.json', 'token-utils'], function ($, config, token) {
  config = JSON.parse(config);

  return {
    getNodes: function () {
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
          token: token.getToken()
        })
      };

      $.ajax(config.apiURL + config.apiPath + '/nodes', options)
        .success(function (nodes) {
          slurmNodes = nodes;
        });

      return slurmNodes;
    }
  };
});
