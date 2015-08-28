define([], function () {
  return function (pageName) {
    this.pageName = pageName;

    this.init = function () { return; };
    this.refresh = function () { return; };
    this.destroy = function () { return; };

    this.getPageName = function () {
      return this.pageName;
    };

    return this;
  };
});
