define([], function () {
  return function () {
    this.init = function () { return; };
    this.refresh = function () { return; };
    this.destroy = function () { return; };

    return this;
  };
});
