define([
  'jquery',
  'text!../config/3d.config.json',
  'text!../config/3d.colors.config.json',
  'three',
  'factor-utils',
  'draw-colors-utils',
  'three-orbit-controls',
  'three-first-person-controls',
  'three-pacman-auto'
], function ($, config, colors, THREE, factor, drawColors) {
  config = JSON.parse(config);
  colors = JSON.parse(colors);

  return function (map, racks, nodes, jobs) {
    var self = this;

    this.map = map;
    this.racks = racks;
    this.nodes = nodes;
    this.jobs = jobs;

    this.camera;
    this.clock;

    function onMouseDown(event) {
      event.preventDefault();

      var canvasMouseX = event.clientX - self.canvasRectangle.left; 
      var canvasMouseY = event.clientY - self.canvasRectangle.top;

      self.mouse.set((canvasMouseX / self.canvas.width) * 2 - 1, -(canvasMouseY / self.canvas.height) * 2 + 1, 0.5);
      self.mouse.unproject(self.camera);

      self.raycaster.set(self.camera.position, self.mouse.sub( self.camera.position ).normalize());

      var intersects = self.raycaster.intersectObjects( self.scene.children, true );
      for (var i = 0; i < intersects.length; i++) {
        //console.log(intersects[i].object);
      }
    }

    function getMapValue(x, y) {
      return self.map.data[y * self.map.width + x];
    }

    function setControls(canvas) {
      addCamera(canvas);

      switch (self.interfaceOptions.cameraType) {
        case 'fps':
          self.controls = new THREE.FirstPersonControls(self.camera, canvas);
          self.controls.movementSpeed = config.MOVESPEED;
          self.controls.lookSpeed = config.LOOKSPEED;
          self.controls.lookVertical = true;
          self.controls.noFly = true;
          $(self.canvas).on('mousedown', onMouseDown);
        break;
        case 'pacman':
          self.controls = new THREE.PacmanAuto(self.camera, canvas, self.map);
        break;
        default:
          self.controls = new THREE.OrbitControls(self.camera, canvas);
      }

    }

    function addLight() {
      var light = new THREE.AmbientLight(0x404040);
      self.scene.add(light);
    }

    function addWalls() {
      var wallMaterial = new THREE.MeshBasicMaterial({ color: 0xA9A9A9 });

      var topWallGeometry = new THREE.PlaneGeometry(self.map.width * config.UNITSIZE, config.WALLHEIGHT * config.UNITSIZE, 1, 1);
      var bottomWallGeometry = new THREE.PlaneGeometry(self.map.width * config.UNITSIZE, config.WALLHEIGHT * config.UNITSIZE, 1, 1);
      var leftWallGeometry = new THREE.PlaneGeometry(self.map.height * config.UNITSIZE, config.WALLHEIGHT * config.UNITSIZE, 1, 1);
      var rightWallGeometry = new THREE.PlaneGeometry(self.map.height * config.UNITSIZE, config.WALLHEIGHT * config.UNITSIZE, 1, 1);

      var topWall = new THREE.Mesh(topWallGeometry, wallMaterial);
      var bottomWall = new THREE.Mesh(bottomWallGeometry, wallMaterial);
      var leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
      var rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);

      topWall.position.z = -(self.map.height * config.UNITSIZE / 2);
      topWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;

      bottomWall.position.z = (self.map.height * config.UNITSIZE / 2);
      bottomWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      bottomWall.rotation.x = 180 * Math.PI / 180;

      leftWall.position.x = -(self.map.width * config.UNITSIZE / 2);
      leftWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      leftWall.rotation.y = 90 * Math.PI / 180;

      rightWall.position.x = self.map.width * config.UNITSIZE / 2;
      rightWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      rightWall.rotation.y = -90 * Math.PI / 180;

      self.scene.add(topWall);
      self.scene.add(bottomWall);
      self.scene.add(leftWall);
      self.scene.add(rightWall);
    }

    function addFloor() {
      var texture = THREE.ImageUtils.loadTexture('static/floor.jpg');
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(8, 8);
      var floorMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      var floorGeometry = new THREE.PlaneGeometry(self.map.width * config.UNITSIZE, self.map.height * config.UNITSIZE, 1, 1);
      var floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = 90 * Math.PI / 180;
      self.scene.add(floor);
    }

    function addCores(node, x, y, z, nodeWidth, nodeHeight, rackDepth, temperatureCoefficient) {
      var ledDimensions = nodeWidth * config.LEDDIMENSIONS;

      var cpus = self.nodes[node.name].cpus;

      if (!cpus) {
        return
      }

      var geometry;
      var color;
      var material;
      var mesh;
      var jobId;
      var positionX;
      var positionY;
      var positionZ;

      var jobs = [];
      var i;
      if (self.jobs.hasOwnProperty(node.name)) {
        for (jobId in self.jobs[node.name]){
          if (self.jobs[node.name].hasOwnProperty(jobId)) {
            for (i = 0; i < self.jobs[node.name][jobId]; i++) {
              jobs.push(jobId)
            }
          }
        };
      }

      var width = nodeWidth - (3 * ledDimensions);
      var height = nodeHeight;
      var tab = factor.bestFactor(width, height, cpus);
      var row = tab[0];
      var column = tab[1];

      if (row / column === 1) {
        cpuDimensions = Math.min(width, height);
        var cpuDepth = nodeWidth * config.CPUDEPTH;
      } else {
        var cpuDimensions = width / column;
        var cpuDepth = nodeWidth * config.CPUDEPTH;
      }

      var factorWidth = column * cpuDimensions;
      var factorHeight = row * cpuDimensions;

      var cpuPadding = cpuDimensions * config.CPUPADDING;
      for (cpu = 0; cpu < cpus; cpu++) {
        geometry = new THREE.BoxGeometry(cpuDimensions - cpuPadding, cpuDimensions - cpuPadding, cpuDepth);

        if (!jobs[cpu]) {
          color = colors.NOJOB;
        } else {
          color = drawColors.findJobColor(jobs[cpu]);
        }

        material = new THREE.MeshBasicMaterial({ color: color });
        mesh = new THREE.Mesh(geometry, material);

        positionX = x - -temperatureCoefficient * (factorWidth / 2) + ledDimensions * -temperatureCoefficient + -temperatureCoefficient * (cpuDimensions / 2) + -temperatureCoefficient * (Math.floor(cpu % column) * cpuDimensions);
        positionY = y + (factorHeight / 2) - (Math.floor(cpu / column) * cpuDimensions) - (cpuDimensions / 2);
        positionZ = z - (rackDepth / 2) * temperatureCoefficient;

        mesh.position.x = positionX;
        mesh.position.y = positionY;
        mesh.position.z = positionZ;

        self.scene.add(mesh);
      }
    }

    function addLed(node, x, y, z, nodeWidth, nodeHeight, rackDepth, temperatureCoefficient) {
      var ledDimensions = nodeWidth * config.LEDDIMENSIONS;
      var ledDepth = nodeWidth * config.LEDDEPTH;

      var geometry = new THREE.BoxGeometry(ledDimensions, ledDimensions, ledDepth);

      var material = new THREE.MeshBasicMaterial({ color: drawColors.findLEDColor(self.nodes[node.name]).state });
      var mesh = new THREE.Mesh(geometry, material);

      mesh.position.x = x - ((nodeWidth / 2) - (ledDimensions + 0.5 * ledDimensions)) * -1 * temperatureCoefficient;
      mesh.position.y = y;
      mesh.position.z = z - (rackDepth / 2) * temperatureCoefficient;

      self.scene.add(mesh);
    }

    function addNode(node, x, y, z, temperatureCoefficient) {
      var nodeWidth = node.width * config.RACKWIDTH * config.UNITSIZE;
      var nodeX = node.posx * config.RACKWIDTH * config.UNITSIZE;
      var nodeHeight = node.height * config.RACKHEIGHT * config.UNITSIZE;
      nodeHeight -= nodeHeight * config.NODEPADDINGTOP;
      var nodeY = node.posy * config.RACKHEIGHT * config.UNITSIZE;

      var geometry = new THREE.BoxGeometry(nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE);
      var material = new THREE.MeshBasicMaterial({ color: colors.NODE });
      var mesh = new THREE.Mesh(geometry, material);

      var positionX = x - -temperatureCoefficient * (config.RACKWIDTH * config.UNITSIZE / 2) + -temperatureCoefficient * nodeX + -temperatureCoefficient * (nodeWidth / 2);
      var positionY = y + (config.RACKHEIGHT * config.UNITSIZE / 2) + nodeY + (nodeHeight / 2);
      var positionZ = z;

      mesh.position.x = positionX;
      mesh.position.y = positionY;
      mesh.position.z = positionZ;

      self.scene.add(mesh);

      addLed(node, positionX, positionY, positionZ, nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE, temperatureCoefficient);
      addCores(node, positionX, positionY, positionZ, nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE, temperatureCoefficient);
    }

    function addRack() {
      var rack;
      var positionX;
      var positionY;
      var positionZ;

      var geometry;
      var material;
      var mesh;

      var x;
      var y;
      var range = 1;
      var currentRange = 1;
      var temperatureCoefficient = 1;
      var index;
      for (y = 0; y < self.map.height; y++) {
        for (x = 0; x < self.map.width; x++) {
          if (getMapValue(x, y) !== 1 && getMapValue(x, y) !== 0 && self.racks.hasOwnProperty(getMapValue(x, y))) {
            rack = self.racks[getMapValue(x, y)];

            if (x === 1 + config.PATHSIZE) {
              range++;
            }

            if (range !== currentRange) {
              temperatureCoefficient *= -1;
              currentRange = range;
            }

            positionX = (x - (self.map.width - 1) / 2) * (config.UNITSIZE * config.RACKWIDTH + config.UNITSIZE * config.RACKMARGIN + 2 * config.RACKCLOSURE * config.RACKWIDTH);
            positionY = (config.UNITSIZE * config.RACKHEIGHT / 2);
            positionZ = (y - (self.map.height - 1) / 2) * (config.UNITSIZE * config.RACKDEPTH + config.UNITSIZE * config.RACKMARGIN);

            for (index in rack.nodes) {
              if (rack.nodes.hasOwnProperty(index)) {
                addNode(rack.nodes[index], positionX, positionY, positionZ, temperatureCoefficient);
              }
            }

            geometry = new THREE.BoxGeometry(
              config.UNITSIZE * config.RACKWIDTH - config.UNITSIZE * config.RACKPADDING + 2 * config.RACKCLOSURE * config.RACKWIDTH,
              (self.map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT,
              config.UNITSIZE * config.RACKDEPTH - config.UNITSIZE * config.RACKPADDING + config.RACKCLOSURE * config.RACKDEPTH
            );
            material = new THREE.MeshBasicMaterial({ color: colors.RACK });
            mesh = new THREE.Mesh(geometry, material);

            mesh.position.x = positionX;
            mesh.position.y = ((self.map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT / 2);
            mesh.position.z = positionZ + temperatureCoefficient * config.RACKCLOSURE * config.RACKDEPTH;

            self.scene.add(mesh);
          }
        }
      }
    }

    function addCamera() {
      var x = 0;
      var y = 0;
      var z = 0;

      switch (self.interfaceOptions.cameraType) {
        case 'fps':
          x = -((self.map.width * config.UNITSIZE) / 2) + ((config.PATHSIZE / 2) * config.UNITSIZE);
          y = self.map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
          z = 0;
        break;
        case 'pacman':
          x = -((self.map.width * config.UNITSIZE) / 2) + ((config.PATHSIZE / 2) * config.UNITSIZE);
          y = self.map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
          z = 0;
        break;
        default:
          x = -(self.map.width * config.UNITSIZE);
          y = self.map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
          z = 0;
      }

      self.camera = new THREE.PerspectiveCamera(45, self.canvas.width / self.canvas.height, 0.1, 10000);
      self.camera.position.set(x, y, z);
      self.scene.add(self.camera);
    }

    function render() {
      if (self.idFrame !== false) {
        var delta = self.clock.getDelta();
        self.controls.update(delta);
        self.idFrame = requestAnimationFrame(render);
        self.renderer.render(self.scene, self.camera);
      } else {
        cancelAnimationFrame(self.idFrame);
      }
    }

    this.init = function (canvas) {
      this.idFrame = null;
      this.canvas = canvas;
      this.interfaceOptions = {
        cameraType: 'orbit',
        screenType: 'page'
      };

      this.clock = new THREE.Clock();
      this.mouse = new THREE.Vector3();
      this.raycaster = new THREE.Raycaster();
      this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialiasing: true });
      this.scene = new THREE.Scene();

      this.canvasRectangle = this.renderer.domElement.getBoundingClientRect();

      setControls(this.canvas);

      $(document).on('camera-change', function (e, options) {
        self.interfaceOptions.cameraType = options.cameraType;

        setControls(self.canvas);
      });

      $(document).on('screen-change', function (e, options) {
        self.interfaceOptions.screenType = options.screenType;

        setControls(self.canvas);
      });

      $(document).on('fullscreen-enter', function (e) {
        self.camera.aspect = $(window).width() / $(window).height();
        self.camera.updateProjectionMatrix();

        self.renderer.setSize($(window).width(), $(window).height());
      });

      $(document).on('fullscreen-exit', function (e) {
        self.camera.aspect = self.canvas.width / self.canvas.height;
        self.camera.updateProjectionMatrix();

        self.renderer.setSize(self.canvas.width, self.canvas.height);
      });

      $(document).one('three-destroy', function() {
        if (self.idFrame) {
          self.idFrame = false;

          $(document).off('contextmenu');
          $(document).off('mousedown');
          $(document).off('mousewheel');
          $(document).off('DOMMouseScroll');
          $(document).off('keydown');
          $(document).off('touchstart');
          $(document).off('touchend');
          $(document).off('touchmove');

          $(document).on('mousemove');
          $(document).on('mouseup');

          $(document).off('keydown');
          $(document).off('keyup');

          $(self.canvas).off('mousedown');
        }
      });

      addFloor();
      addWalls();
      addRack();

      if (config.DEBUG) {
        this.scene.add(new THREE.AxisHelper(100));
      }

      render();
    }

    return this;
  };
});
