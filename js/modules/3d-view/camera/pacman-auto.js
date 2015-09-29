define([
  'jquery',
  'three',
  'text!../config/3d.config.json'
], function ($, THREE, d3config) {
  d3config = JSON.parse(d3config);

  THREE.PacmanAuto = function (camera, domElement, map) {
    var self = this;
    this.camera = camera;
    this.map = map;
    this.domElement = ( domElement !== undefined ) ? domElement : document;
    this.target = new THREE.Vector3(self.map.width * d3config.UNITSIZE / 2, self.map.altitude * d3config.RACKHEIGHT * d3config.UNITSIZE / 2, -1 * self.map.height * d3config.UNITSIZE / 2);

    this.enabled = true;

    this.movementSpeed = 10;
    this.lookSpeed = 0.1;

    function resetCamera() {
      var z = (1 + (d3config.PATHSIZE / 2)) * d3config.UNITSIZE - (self.map.height / 2 * d3config.UNITSIZE);

      self.camera.position.z = z;
    }

    this.update = function(delta) {
      if (this.enabled) {


        this.camera.lookAt(this.target);
      }
    }

    resetCamera();
  };

});
