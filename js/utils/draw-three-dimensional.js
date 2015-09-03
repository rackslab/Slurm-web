define(['jquery', 'three'], function ($, THREE) {
  return function () {
    var self = this;
    this.map = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 2, 2, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 2, 2, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 2, 2, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ];

    this.mapWidth = this.map.length;
    this.mapHeight = this.map[0].length;

    this.camera;
    this.controls;
    this.clock;

    function addCamera(canvas) {
      self.camera = new THREE.PerspectiveCamera(60, canvas.width() / canvas.height(), 1, 10000);
      self.scene.add(self.camera);
    }

    function render() {
      requestAnimationFrame(render);

      self.cube.rotation.x += 0.01;
      self.cube.rotation.y += 0.01;

      self.renderer.render(self.scene, self.camera);
    }

    this.init = function (canvas) {
      this.renderer = new THREE.WebGLRenderer({ canvas: canvas[0] });
      this.scene = new THREE.Scene();

      addCamera(canvas);

      var geometry = new THREE.BoxGeometry( 1, 1, 1 );
      var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
      this.cube = new THREE.Mesh( geometry, material );
      this.scene.add( this.cube );

      this.camera.position.z = 5;

      render();
    }

    return this;
  }; 
});
