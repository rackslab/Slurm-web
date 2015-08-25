define(['jquery', 'text!config.json', 'token'], function ($, config, token) {
  config = JSON.parse(config);

  return function () {
    var self = this;
    var options = {
      type: 'POST',
      dataType: 'json',
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

    $.ajax(config.apiURL + config.apiPath + '/cluster', options)
      .success(function (cluster) {
        self.setCluster(cluster);
      });

    this.setCluster = function (cluster) {
      this.cluster = cluster;
    };

    this.getCluster = function () {
      return this.cluster;
    };

    return this;
  };
});
