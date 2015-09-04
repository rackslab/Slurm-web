define(['jquery', 'three'], function ($, THREE) {

/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 */

THREE.FirstPersonControls = function ( object, domElement ) {

  this.object = object;
  this.target = new THREE.Vector3( 0, 0, 0 );

  this.domElement = ( domElement !== undefined ) ? domElement : document;

  this.movementSpeed = 1.0;
  this.lookSpeed = 0.005;

  this.noFly = false;
  this.lookVertical = true;
  this.autoForward = false;

  this.activeLook = true;

  this.heightSpeed = false;
  this.heightCoef = 1.0;
  this.heightMin = 0.0;

  this.constrainVertical = false;
  this.verticalMin = 0;
  this.verticalMax = Math.PI;

  this.autoSpeedFactor = 0.0;

  this.mouseX = 0;
  this.mouseY = 0;

  this.lat = 0;
  this.lon = 0;
  this.phi = 0;
  this.theta = 0;

  this.moveForward = false;
  this.moveBackward = false;
  this.moveLeft = false;
  this.moveRight = false;
  this.freeze = false;

  this.mouseDragOn = false;

  if ( this.domElement === document ) {

    this.viewHalfX = window.innerWidth / 2;
    this.viewHalfY = window.innerHeight / 2;

  } else {

    this.viewHalfX = this.domElement.offsetWidth / 2;
    this.viewHalfY = this.domElement.offsetHeight / 2;
    this.domElement.setAttribute( 'tabindex', -1 );

  }

  this.onMouseDown = function ( event ) {

    if ( this.domElement !== document ) {

      this.domElement.focus();

    }

    event.preventDefault();
    event.stopPropagation();

    if ( this.activeLook ) {

      switch ( event.button ) {

        case 0: this.moveForward = true; break;
        case 2: this.moveBackward = true; break;

      }

    }

    this.mouseDragOn = true;

  };

  this.onMouseUp = function ( event ) {

    event.preventDefault();
    event.stopPropagation();

    if ( this.activeLook ) {

      switch ( event.button ) {

        case 0: this.moveForward = false; break;
        case 2: this.moveBackward = false; break;

      }

    }

    this.mouseDragOn = false;

  };

  this.onMouseMove = function ( event ) {

    if ( this.domElement === document ) {

      this.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointerY = -(event.clientY / window.innerHeight) * 2 + 1;

      this.mouseX = event.pageX - this.viewHalfX;
      this.mouseY = event.pageY - this.viewHalfY;

    } else {

      this.mouseX = event.pageX - this.domElement.offsetLeft - this.viewHalfX;
      this.mouseY = event.pageY - this.domElement.offsetTop - this.viewHalfY;

    }

  };

  this.onKeyDown = function ( event ) {

    switch( event.keyCode ) {

      case 38: /*up*/     this.moveForward = true; break;
      case 87: /*W*/      this.moveForward = true; break;

      case 37: /*left*/   this.moveLeft = true; break;
      case 65: /*A*/      this.moveLeft = true; break;

      case 40: /*down*/   this.moveBackward = true; break;
      case 83: /*S*/      this.moveBackward = true; break;

      case 39: /*right*/  this.moveRight = true; break;
      case 68: /*D*/      this.moveRight = true; break;

      case 82: /*R*/ this.moveUp = true; break;
      case 70: /*F*/ this.moveDown = true; break;

      case 81: /*Q*/ this.freeze = !this.freeze; break;

    }

  };

  this.onKeyUp = function ( event ) {

    switch( event.keyCode ) {

      case 38: /*up*/
      case 87: /*W*/ this.moveForward = false; break;

      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = false; break;

      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = false; break;

      case 39: /*right*/
      case 68: /*D*/ this.moveRight = false; break;

      case 82: /*R*/ this.moveUp = false; break;
      case 70: /*F*/ this.moveDown = false; break;

    }

  };

  this.update = function( delta ) {
    var actualMoveSpeed = 0;
    if ( !this.freeze ) {

      if ( this.heightSpeed ) {

        var y = THREE.Math.clamp( this.object.position.y, this.heightMin, this.heightMax );
        var heightDelta = y - this.heightMin;

        this.autoSpeedFactor = delta * ( heightDelta * this.heightCoef );

      } else {

        this.autoSpeedFactor = 0.0;

      }

      actualMoveSpeed = delta * this.movementSpeed;

      if ( this.moveForward || ( this.autoForward && !this.moveBackward ) ) this.object.translateZ( - ( actualMoveSpeed + this.autoSpeedFactor ) );
      if ( this.moveBackward ) this.object.translateZ( actualMoveSpeed );

      if ( this.moveLeft ) this.object.translateX( - actualMoveSpeed );
      if ( this.moveRight ) this.object.translateX( actualMoveSpeed );

      if ( this.moveUp ) this.object.translateY( actualMoveSpeed );
      if ( this.moveDown ) this.object.translateY( - actualMoveSpeed );

      var actualLookSpeed = delta * this.lookSpeed;

      if ( !this.activeLook ) {

        actualLookSpeed = 0;

      }

      this.lon += this.mouseX * actualLookSpeed;
      if( this.lookVertical ) this.lat -= this.mouseY * actualLookSpeed;

      this.lat = Math.max( - 85, Math.min( 85, this.lat ) );
      this.phi = ( 90 - this.lat ) * Math.PI / 180;
      this.theta = this.lon * Math.PI / 180;

      var targetPosition = this.target,
        position = this.object.position;

      targetPosition.x = position.x + 100 * Math.sin( this.phi ) * Math.cos( this.theta );
      targetPosition.y = position.y + 100 * Math.cos( this.phi );
      targetPosition.z = position.z + 100 * Math.sin( this.phi ) * Math.sin( this.theta );

    }

    var verticalLookRatio = 1;

    if ( this.constrainVertical ) {

      verticalLookRatio = Math.PI / ( this.verticalMax - this.verticalMin );

    }

    this.lon += this.mouseX * actualLookSpeed;
    if( this.lookVertical ) this.lat -= this.mouseY * actualLookSpeed * verticalLookRatio;

    this.lat = Math.max( - 85, Math.min( 85, this.lat ) );
    this.phi = ( 90 - this.lat ) * Math.PI / 180;

    this.theta = this.lon * Math.PI / 180;

    if ( this.constrainVertical ) {

      this.phi = THREE.Math.mapLinear( this.phi, 0, Math.PI, this.verticalMin, this.verticalMax );

    }

    var targetPosition = this.target,
      position = this.object.position;

    targetPosition.x = position.x + 100 * Math.sin( this.phi ) * Math.cos( this.theta );
    targetPosition.y = position.y + 100 * Math.cos( this.phi );
    targetPosition.z = position.z + 100 * Math.sin( this.phi ) * Math.sin( this.theta );

    this.object.lookAt( targetPosition );

  };

  this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

  this.domElement.addEventListener( 'mousemove', bind( this, this.onMouseMove ), false );
  this.domElement.addEventListener( 'mousedown', bind( this, this.onMouseDown ), false );
  this.domElement.addEventListener( 'mouseup', bind( this, this.onMouseUp ), false );
  this.domElement.addEventListener( 'keydown', bind( this, this.onKeyDown ), false );
  this.domElement.addEventListener( 'keyup', bind( this, this.onKeyUp ), false );

  function bind( scope, fn ) {

    return function () {

      fn.apply( scope, arguments );

    };

  };

};

  return function () {
    /* Later, put it in config */
    var MOVESPEED = 1;
    var LOOKSPEED = 0.05;
    var UNITSIZE = 1;
    var WALLHEIGHT = UNITSIZE / 3;
    /**/
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
    this.clock;

    function onMouseMove(e) {
      e.preventDefault();

      //self.mouse.x = (e.clientX / self.canvas.width()) * 2 - 1;
      //self.mouse.y = -(e.clientY / self.canvas.height()) * 2 + 1;
    }

    function onMouseDown(evenet) {
      event.preventDefault();
 

       var vector = new THREE.Vector3();

var canvasMouseX = event.clientX - self.canvasRect.left; 
var canvasMouseY = event.clientY - self.canvasRect.top; 
vector.set((canvasMouseX / $('canvas').width()) * 2 - 1, -(canvasMouseY / $('canvas').height()) * 2 + 1, 0.5);


      vector.unproject( self.camera );

      self.raycaster.set( self.camera.position, vector.sub( self.camera.position ).normalize() );

      //self.raycaster.setFromCamera( vector, self.camera );

      var intersects = self.raycaster.intersectObjects( self.scene.children, true );
      console.log(intersects)
      for ( var i = 0; i < intersects.length; i++ ) {
        //intersects[ i ].object.material.color.set( 0xff0000 );
      }
    }

    function setControls() {
      self.mouse = { x: 0, y: 0 };
      self.controls = new THREE.FirstPersonControls(self.camera);
      self.controls.movementSpeed = MOVESPEED;
      self.controls.lookSpeed = LOOKSPEED;
      self.controls.lookVertical = true;
      self.controls.noFly = true;
      //$(self.canvas).on('mousemove', onMouseMove);
      $(self.canvas).on('mousedown', onMouseDown);
    }

    function addLight() {
      var directionalLight1 = new THREE.DirectionalLight( 0xF7EFBE, 1 );
      directionalLight1.position.set( 0.5, 1, 0.5 );
      self.scene.add( directionalLight1 );
      var directionalLight2 = new THREE.DirectionalLight( 0xF7EFBE, 1 );
      directionalLight2.position.set( -0.5, -1, -0.5 );
      self.scene.add( directionalLight2 );
    }

    function addFloor() {
      var texture = THREE.ImageUtils.loadTexture('static/floor.jpg');
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set( 32, 32 );
      var floorMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      var floorGeometry = new THREE.PlaneGeometry(self.mapWidth * UNITSIZE, self.mapHeight * UNITSIZE, 100, 100);
      var floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = (-Math.PI / 2);
      console.log(floor);
      self.scene.add(floor);
    }

    function addWall() {
      var texture = THREE.ImageUtils.loadTexture('static/floor.jpg');
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set( self.mapWidth, self.mapHeight );

      var cube = new THREE.CubeGeometry(UNITSIZE, UNITSIZE, UNITSIZE);
      var materials = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      for (var i = 0; i < self.mapWidth; i++) {
        for (var j = 0, m = self.map[i].length; j < m; j++) {
          if (self.map[i][j] === 1) {
            var wall = new THREE.Mesh(cube, materials);
            wall.position.x = (i - self.mapWidth / 2) * UNITSIZE;
            wall.position.y = WALLHEIGHT / 2;
            wall.position.z = (j - self.mapWidth / 2) * UNITSIZE;
            self.scene.add(wall);
          }
        }
      }
    }

    function addRack() {

    }

    function addCamera() {
      self.camera = new THREE.PerspectiveCamera(60, self.canvas.width() / self.canvas.height(), 1, 10000);
      self.scene.add(self.camera);
    }

    function render() {
      var delta = self.clock.getDelta();
      self.controls.update(delta);

      requestAnimationFrame(render);
      self.renderer.render(self.scene, self.camera);
    }

    this.init = function (canvas) {
      this.canvas = canvas;
      this.clock = new THREE.Clock();
      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      console.log(this.raycaster.near)
      console.log(this.raycaster.far)
      //this.raycaster.near = 1000000;
      //this.raycaster.far = 1000000;
      this.renderer = new THREE.WebGLRenderer({ canvas: canvas[0] });
      this.scene = new THREE.Scene();


      this.canvasRect = this.renderer.domElement.getBoundingClientRect();

      addCamera(canvas);
      setControls();
      //addFloor();

      var geometry = new THREE.BoxGeometry( 1, 1, 1 );
      var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
      this.cube = new THREE.Mesh( geometry, material );
      this.cube.custom = {
        type: 'cube'
      };
      this.cube.position.y = 0.5;
      this.scene.add(this.cube);

      this.camera.position.z = 5;

      render();
    }

    return this;
  }; 
});
