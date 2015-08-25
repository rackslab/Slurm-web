define(['jquery', 'text!config.json', 'token-utils'], function ($, config, token) {
  config = JSON.parse(config);

  return function () {
    this.setCluster = function (cluster) {
      this.cluster = cluster;
    };

    this.getCluster = function () {
      return this.cluster;
    };

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

    this.cluster = {
      name: ''
    };

    var self = this;
    $.ajax(config.apiURL + config.apiPath + '/cluster', options)
      .success(function (cluster) {
        self.setCluster(cluster);
      });

    return this;
  };
});
