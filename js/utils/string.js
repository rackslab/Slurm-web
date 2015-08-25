define([], function () {
  return {
    capitalize: function () {
      return (this.charAt(0).toUpperCase() + this.slice(1));
    }
  };
});
