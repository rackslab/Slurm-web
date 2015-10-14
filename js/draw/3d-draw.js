/*
 * Copyright (C) 2015 EDF SA
 *
 * This file is part of slurm-web.
 *
 * slurm-web is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * slurm-web is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

define([
  'jquery',
  'text!/slurm-web-conf/3d.config.json',
  'text!/slurm-web-conf/3d.colors.config.json',
  'three',
  'factor-draw',
  'colors-draw',
  'three-orbit-controls',
  'three-first-person-controls',
  'three-pacman-auto'
], function ($, d3Config, d3Colors, THREE, factorDraw, colorsDraw) {
  var config = JSON.parse(d3Config);
  var colors = JSON.parse(d3Colors);

  return function (map, racks, nodes, jobs, room) {
    this.room = room;
    this.map = map;
    this.racks = racks;
    this.nodes = nodes;
    this.jobs = jobs;

    this.camera;
    this.clock;

    this.objects = {};
    this.objects.material = [];
    this.objects.geometry = [];
    this.objects.mesh = [];

    this.calculateEnv = function () {
      this.map.unitWidth = this.map.width * config.UNITSIZE + this.map.rangeMaxRacksNumber * config.UNITSIZE * config.RACKMARGIN;
      this.map.unitHeight = this.map.height * config.UNITSIZE + this.map.rangeNumber * (config.UNITSIZE * config.RACKDEPTH + config.UNITSIZE * config.RACKMARGIN);
    }

    this.onMouseDown = function (event) {
      event.preventDefault();

      var canvasMouseX = event.clientX - this.canvasRectangle.left;
      var canvasMouseY = event.clientY - this.canvasRectangle.top;

      this.mouse.set((canvasMouseX / this.canvas.width) * 2 - 1, -(canvasMouseY / this.canvas.height) * 2 + 1, 0.5);
      this.mouse.unproject(this.camera);

      this.raycaster.set(this.camera.position, this.mouse.sub(this.camera.position ).normalize());

      var intersects = this.raycaster.intersectObjects( this.scene.children, true );
      for (var i = 0; i < intersects.length; i++) {
        //console.log(intersects[i].object);
      }
    }

    this.getMapValue = function (x, y) {
      return this.map.data[y * this.map.width + x];
    }

    this.setControls = function (canvas) {
      this.addCamera(canvas);

      switch (this.interfaceOptions.cameraType) {
        case 'fps':
          this.controls = new this.THREE.FirstPersonControls(this.camera, canvas);
          this.controls.movementSpeed = config.MOVESPEED;
          this.controls.lookSpeed = config.LOOKSPEED;
          this.controls.lookVertical = true;
          this.controls.noFly = true;
          $(this.canvas).on('mousedown', this.onMouseDown);
        break;
        case 'pacman':
          this.controls = new this.THREE.PacmanAuto(this.camera, canvas, this.map);
        break;
        default:
          this.controls = new this.THREE.OrbitControls(this.camera, canvas);
      }

    }

    this.addLight = function () {
      var light = new this.THREE.AmbientLight(0x404040);
      this.scene.add(light);
    }

    this.addWalls = function () {
      var texture = this.THREE.ImageUtils.loadTexture('static/wall.jpg');
      texture.wrapS = this.THREE.RepeatWrapping;
      texture.wrapT = this.THREE.RepeatWrapping;

      this.objects.material.push(new this.THREE.MeshBasicMaterial({ map: texture }));
      var wallMaterial = this.objects.material[this.objects.material.length - 1];

      this.objects.geometry.push(new this.THREE.PlaneGeometry(this.floorWidth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      var topWallGeometry = this.objects.geometry[this.objects.geometry.length - 1];
      var repeatX = this.floorWidth / (room.rackwidth * config.UNITSIZE);

      if (!this.defaultXSize) {
        repeatX = this.floorWidth / (room.rackwidth * config.UNITSIZEMETER);
      }

      texture.repeat.set(repeatX, config.WALLHEIGHT);

      this.objects.geometry.push(new this.THREE.PlaneGeometry(this.floorWidth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      var bottomWallGeometry = this.objects.geometry[this.objects.geometry.length - 1];
      this.objects.geometry.push(new this.THREE.PlaneGeometry(this.floorDepth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      var leftWallGeometry = this.objects.geometry[this.objects.geometry.length - 1];
      this.objects.geometry.push(new this.THREE.PlaneGeometry(this.floorDepth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      var rightWallGeometry = this.objects.geometry[this.objects.geometry.length - 1];

      this.objects.mesh.push(new this.THREE.Mesh(topWallGeometry, wallMaterial));
      var topWall = this.objects.mesh[this.objects.mesh.length - 1];
      this.objects.mesh.push(new this.THREE.Mesh(bottomWallGeometry, wallMaterial));
      var bottomWall = this.objects.mesh[this.objects.mesh.length - 1];
      this.objects.mesh.push(new this.THREE.Mesh(leftWallGeometry, wallMaterial));
      var leftWall = this.objects.mesh[this.objects.mesh.length - 1];
      this.objects.mesh.push(new this.THREE.Mesh(rightWallGeometry, wallMaterial));
      var rightWall = this.objects.mesh[this.objects.mesh.length - 1];

      topWall.position.x = this.floorX;
      topWall.position.z = -(this.floorDepth / 2) + this.floorZ;
      topWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;

      bottomWall.position.x = this.floorX;
      bottomWall.position.z = (this.floorDepth / 2) + this.floorZ;
      bottomWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      bottomWall.rotation.x = 180 * Math.PI / 180;

      leftWall.position.z = this.floorZ;
      leftWall.position.x = -(this.floorWidth / 2) + this.floorX;
      leftWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      leftWall.rotation.y = 90 * Math.PI / 180;

      rightWall.position.z = this.floorZ;
      rightWall.position.x = (this.floorWidth / 2) + this.floorX;
      rightWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      rightWall.rotation.y = -90 * Math.PI / 180;

      this.scene.add(topWall);
      this.scene.add(bottomWall);
      this.scene.add(leftWall);
      this.scene.add(rightWall);

      wallMaterial.dispose();
      topWallGeometry.dispose();
      bottomWallGeometry.dispose();
      leftWallGeometry.dispose();
      rightWallGeometry.dispose();
    }

    this.addRoof = function () {
      var texture = this.THREE.ImageUtils.loadTexture('static/roof.jpg');
      texture.wrapS = this.THREE.RepeatWrapping;
      texture.wrapT = this.THREE.RepeatWrapping;
      this.objects.material.push(new this.THREE.MeshBasicMaterial({ map: texture }));
      var roofMaterial = this.objects.material[this.objects.material.length - 1];
      this.objects.geometry.push(new this.THREE.PlaneGeometry(this.floorWidth, this.floorDepth, 1, 1));
      var roofGeometry = this.objects.geometry[this.objects.geometry.length - 1];

      texture.repeat.set(this.floorWidth / (room.rackwidth * config.UNITSIZEMETER), this.floorDepth / (room.rackwidth * config.UNITSIZEMETER));

      if (!this.defaultXSize) {
        texture.repeat.set(this.floorWidth / (room.rackwidth * config.UNITSIZE), this.floorDepth / (room.rackwidth * config.UNITSIZE));
      }

      this.objects.mesh.push(new this.THREE.Mesh(roofGeometry, roofMaterial));
      var roof = this.objects.mesh[this.objects.mesh.length - 1];
      roof.rotation.x = 90 * Math.PI / 180;

      roof.position.x = this.floorX;
      roof.position.z = this.floorZ;
      roof.position.y = config.WALLHEIGHT * config.UNITSIZE;

      this.scene.add(roof);

      roofMaterial.dispose();
      roofGeometry.dispose();
    }

    this.addFloor = function () {
      this.floorWidth = this.map.unitWidth;
      this.floorDepth = this.map.unitHeight;
      this.defaultXSize = true;
      this.defaultZSize = false;
      this.floorX = 0;
      this.floorZ = 0;

      if (room.width * room.rackwidth * config.UNITSIZEMETER > this.floorWidth) {
        this.floorWidth = room.width * room.rackwidth * config.UNITSIZEMETER;
        this.floorX = room.posx * room.rackwidth;
        this.defaultXSize = false;
      }

      if (room.depth * room.rackwidth * config.UNITSIZEMETER > this.floorDepth) {
        this.floorDepth = room.depth * room.rackwidth * config.UNITSIZEMETER;
        this.floorZ = room.posy * room.rackwidth;
        this.defaultZSize = false;
      }

      var texture = this.THREE.ImageUtils.loadTexture('static/floor.jpg');
      texture.wrapS = this.THREE.RepeatWrapping;
      texture.wrapT = this.THREE.RepeatWrapping;

      this.objects.material.push(new this.THREE.MeshBasicMaterial({ map: texture, side: this.THREE.DoubleSide }));
      var floorMaterial = this.objects.material[this.objects.material.length - 1];
      this.objects.geometry.push(new this.THREE.PlaneGeometry(this.floorWidth, this.floorDepth, 1, 1));
      var floorGeometry = this.objects.geometry[this.objects.geometry.length - 1];

      texture.repeat.set(this.floorWidth / (room.rackwidth * config.UNITSIZEMETER), this.floorDepth / (room.rackwidth * config.UNITSIZEMETER));

      if (!this.defaultXSize) {
        texture.repeat.set(this.floorWidth / (room.rackwidth * config.UNITSIZE), this.floorDepth / (room.rackwidth * config.UNITSIZE));
      }

      this.objects.mesh.push(new this.THREE.Mesh(floorGeometry, floorMaterial));
      var floor = this.objects.mesh[this.objects.mesh.length - 1];
      floor.rotation.x = 90 * Math.PI / 180;

      floor.position.x = this.floorX;
      floor.position.z = this.floorZ;

      this.scene.add(floor);
      floorMaterial.dispose();
      floorGeometry.dispose();
    }

    this.addCores = function (node, x, y, z, nodeWidth, nodeHeight, rackDepth, temperatureCoefficient) {
      var ledDimensions = nodeWidth * config.LEDDIMENSIONS;

      if (!this.nodes[node.name].hasOwnProperty('cpus')) {
        return
      }

      var cpus = this.nodes[node.name].cpus;

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
      if (this.jobs.hasOwnProperty(node.name)) {
        for (jobId in this.jobs[node.name]){
          if (this.jobs[node.name].hasOwnProperty(jobId)) {
            for (i = 0; i < this.jobs[node.name][jobId]; i++) {
              jobs.push(jobId)
            }
          }
        };
      }

      var width = nodeWidth - (3 * ledDimensions);
      var height = nodeHeight;
      //console.log(width, height, cpus)
      var tab = factorDraw.bestFactor(width, height, cpus);
      //console.log(tab)

      var row = tab[0];
      var column = tab[1];

      if (row / column === 1) {
        //var cpuDimensions = Math.min(width, height);
        var cpuDimensions = Math.min(width, height);
        var cpuDepth = nodeWidth * config.CPUDEPTH;
      } else {
        //var cpuDimensions = width / column;
        var cpuDimensions = Math.min(height / row, width / column);
        var cpuDepth = nodeWidth * config.CPUDEPTH;
      }

      //console.log(cpuDimensions)

      var factorWidth = column * cpuDimensions;
      var factorHeight = row * cpuDimensions;

      var cpuPadding = cpuDimensions * config.CPUPADDING;
      this.objects.geometry.push(new this.THREE.BoxGeometry(cpuDimensions - cpuPadding, cpuDimensions - cpuPadding, cpuDepth));
      geometry = this.objects.geometry[this.objects.geometry.length - 1];
      //geometry = new this.THREE.BufferGeometry().fromGeometry(geometry);

      for (cpu = 0; cpu < cpus; cpu++) {
        if (!jobs[cpu]) {
          color = colors.NOJOB;
        } else {
          color = colorsDraw.findJobColor(jobs[cpu], '3D');
        }

        this.objects.material.push(new this.THREE.MeshBasicMaterial({ color: color }));
        material = this.objects.material[this.objects.material.length - 1];
        
        this.objects.mesh.push(new this.THREE.Mesh(geometry, material));
        mesh = this.objects.mesh[this.objects.mesh.length - 1];

        positionX = x - -temperatureCoefficient * (factorWidth / 2) + ledDimensions * -temperatureCoefficient + -temperatureCoefficient * (cpuDimensions / 2) + -temperatureCoefficient * (Math.floor(cpu % column) * cpuDimensions);
        positionY = y + (factorHeight / 2) - (Math.floor(cpu / column) * cpuDimensions) - (cpuDimensions / 2);
        positionZ = z - (rackDepth / 2) * temperatureCoefficient;

        mesh.position.x = positionX;
        mesh.position.y = positionY;
        mesh.position.z = positionZ;

        this.scene.add(mesh);
        material.dispose();
      }
      geometry.dispose();
    }

    this.addLed = function (node, x, y, z, nodeWidth, nodeHeight, rackDepth, temperatureCoefficient) {
      var ledDimensions = nodeWidth * config.LEDDIMENSIONS;
      var ledDepth = nodeWidth * config.LEDDEPTH;

      this.objects.geometry.push(new this.THREE.BoxGeometry(ledDimensions, ledDimensions, ledDepth));
      //geometry = new this.THREE.BufferGeometry().fromGeometry(geometry);
      var geometry = this.objects.geometry[this.objects.geometry.length - 1];

      this.objects.material.push(new this.THREE.MeshBasicMaterial({ color: colorsDraw.findLedColor(this.nodes[node.name], '3D').state }));
      var material = this.objects.material[this.objects.material.length - 1];

      this.objects.mesh.push(new this.THREE.Mesh(geometry, material));
      var mesh = this.objects.mesh[this.objects.mesh.length - 1];

      mesh.position.x = x - ((nodeWidth / 2) - (ledDimensions + 0.5 * ledDimensions)) * -1 * temperatureCoefficient;
      mesh.position.y = y;
      mesh.position.z = z - (rackDepth / 2) * temperatureCoefficient;

      this.scene.add(mesh);
      geometry.dispose();
      material.dispose();
    }

    this.addNode = function (node, x, y, z, temperatureCoefficient) {
      var nodeWidth = node.width * (config.RACKWIDTH - 2 * config.RACKPADDING - 2 * config.NODEPADDINGLEFTRIGHT) * config.UNITSIZE;
      var nodeX = node.posx * (config.RACKWIDTH - 2 * config.RACKPADDING + config.NODEPADDINGLEFTRIGHT) * config.UNITSIZE;
      var nodeHeight = node.height * config.RACKHEIGHT * config.UNITSIZE;
      nodeHeight -= nodeHeight * config.NODEPADDINGTOP;
      var nodeY = node.posy * config.RACKHEIGHT * config.UNITSIZE;
      nodeDepth = config.RACKDEPTH * config.UNITSIZE - 2 * config.RACKDEPTH * config.UNITSIZE * config.RACKPADDING;

      this.objects.geometry.push(new this.THREE.BoxGeometry(nodeWidth, nodeHeight, nodeDepth));
      var geometry = this.objects.geometry[this.objects.geometry.length - 1];
      //geometry = new this.THREE.BufferGeometry().fromGeometry(geometry);
      this.objects.material.push(new this.THREE.MeshBasicMaterial({ color: colors.NODE }));
      var material = this.objects.material[this.objects.material.length - 1];

      this.objects.mesh.push(new this.THREE.Mesh(geometry, material));
      var mesh = this.objects.mesh[this.objects.mesh.length - 1];

      var positionX = x - -temperatureCoefficient * ((config.RACKWIDTH - 2 * config.RACKPADDING) * config.UNITSIZE / 2) + -temperatureCoefficient * nodeX + -temperatureCoefficient * (nodeWidth / 2);
      var positionY = y + (config.RACKHEIGHT * config.UNITSIZE / 2) + nodeY + (nodeHeight / 2);
      var positionZ = z + -temperatureCoefficient * (config.RACKDEPTH * config.UNITSIZE * 0.006 + config.RACKDEPTH * config.UNITSIZE * config.RACKPADDING);

      mesh.position.x = positionX;
      mesh.position.y = positionY;
      mesh.position.z = positionZ;

      positionZ = z + -temperatureCoefficient * (config.RACKDEPTH * config.UNITSIZE * 0.006);

      this.scene.add(mesh);
      geometry.dispose();
      material.dispose();

      this.addLed(node, positionX, positionY, positionZ, nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE, temperatureCoefficient);
      this.addCores(node, positionX, positionY, positionZ, nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE, temperatureCoefficient);
    }

    this.addRack = function () {
      var rack;
      var positionX;
      var positionY;
      var positionZ;

      var geometry;
      var texture = this.THREE.ImageUtils.loadTexture('static/rack.jpg');
      texture.repeat.set(1, 1, 1);
      texture.wrapS = this.THREE.RepeatWrapping;
      texture.wrapT = this.THREE.RepeatWrapping;
      this.objects.material.push(new this.THREE.MeshBasicMaterial({ map: texture }));
      var material = this.objects.material[this.objects.material.length - 1];
      var mesh;

      var x;
      var y;
      var range = 1;
      var currentRange = 1;
      var temperatureCoefficient = 1;
      var index;
      for (y = 0; y < this.map.height; y++) {
        for (x = 0; x < this.map.width; x++) {
          if (this.getMapValue(x, y) !== 1 && this.getMapValue(x, y) !== 0 && this.racks.hasOwnProperty(this.getMapValue(x, y))) {
            rack = this.racks[this.getMapValue(x, y)];

            if (x === 1 + config.PATHSIZE * 2) {
              range++;
            }

            if (range !== currentRange) {
              temperatureCoefficient *= -1;
              currentRange = range;
            }

            positionX = (x - (this.map.width - 1) / 2) * (config.UNITSIZE * config.RACKWIDTH + config.UNITSIZE * config.RACKMARGIN);
            positionY = (config.UNITSIZE * config.RACKHEIGHT / 2);
            positionZ = (y - (this.map.height - 1) / 2) * (config.UNITSIZE * config.RACKDEPTH + config.UNITSIZE * config.RACKMARGIN);

            for (index in rack.nodes) {
              if (rack.nodes.hasOwnProperty(index)) {
                this.addNode(rack.nodes[index], positionX, positionY, positionZ, temperatureCoefficient);
              }
            }

            this.objects.geometry.push(new this.THREE.BoxGeometry(
              config.UNITSIZE * config.RACKWIDTH,
              (this.map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT,
              config.UNITSIZE * config.RACKDEPTH
            ));
            geometry = this.objects.geometry[this.objects.geometry.length - 1];

            this.objects.mesh.push(new this.THREE.Mesh(geometry, material));
            mesh = this.objects.mesh[this.objects.mesh.length - 1];

            mesh.position.x = positionX;
            mesh.position.y = ((this.map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT / 2);
            mesh.position.z = positionZ;

            this.scene.add(mesh);
            geometry.dispose();
          }
        }
      }
      material.dispose();
    }

    this.addCamera = function () {
      var x = 0;
      var y = 0;
      var z = 0;

      switch (this.interfaceOptions.cameraType) {
        case 'fps':
          x = -((this.map.width * config.UNITSIZE) / 2) + ((config.PATHSIZE / 2) * config.UNITSIZE);
          y = this.map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
          z = 0;
        break;
        default:
          x = -(this.map.width * config.UNITSIZE);
          y = this.map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
          z = 0;
      }

      this.camera = new this.THREE.PerspectiveCamera(45, this.canvas.width / this.canvas.height, 0.1, 10000);
      this.camera.position.set(x, y, z);
      this.scene.add(this.camera);
    }

    this.init = function (canvas) {
      var self = this;
      this.THREE = THREE;

      function render() {
        if (!self.cancelAnimation) {
          var delta = self.clock.getDelta();
          self.controls.update(delta);
          self.idFrame = requestAnimationFrame(render);
          self.renderer.render(self.scene, self.camera);
        }
      }

      this.idFrame = null;
      this.cancelAnimation = false;
      this.canvas = canvas;
      this.interfaceOptions = {
        cameraType: 'orbit',
        screenType: 'page'
      };

      this.clock = new this.THREE.Clock();
      this.mouse = new this.THREE.Vector3();
      this.raycaster = new this.THREE.Raycaster();
      this.renderer = new this.THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      this.scene = new this.THREE.Scene();

      this.canvasRectangle = this.renderer.domElement.getBoundingClientRect();

      this.setControls(this.canvas);

      $(document).on('camera-change', function (e, options) {
        self.interfaceOptions.cameraType = options.cameraType;

        self.setControls(self.canvas);
      });

      $(document).on('screen-change', function (e, options) {
        self.interfaceOptions.screenType = options.screenType;

        self.setControls(self.canvas);
      });

      $(document).on('fullscreen-enter', function (e) {
        self.camera.aspect = $(window).width() / $(window).height();
        self.camera.updateProjectionMatrix();

        self.renderer.setSize($(window).width(), $(window).height());
      });

      $(document).on('fullscreen-exit', function (e, options) {
        self.camera.aspect = options.canvas.width / options.canvas.height;
        self.camera.updateProjectionMatrix();

        self.renderer.setSize(options.canvas.width, options.canvas.height);
      });

      $(document).on('canvas-size-change', function (e, options) {
        self.camera.aspect = options.canvas.width / options.canvas.height;
        self.camera.updateProjectionMatrix();

        self.renderer.setSize(options.canvas.width, options.canvas.height);
      });

      this.calculateEnv();
      this.addFloor();
      this.addWalls();
      this.addRoof();
      this.addRack();

      if (config.DEBUG) {
        this.scene.add(new this.THREE.AxisHelper(100));
      }

      render();
    }

    this.clean = function () {
      this.cancelAnimation = true;
      cancelAnimationFrame(this.idFrame);
      this.idFrame = null;

      var i;
      for (i = this.objects.geometry.length - 1; i >= 0 ; i--) {
        this.objects.geometry[i].dispose();
        delete this.objects.geometry[i];
      }

      for (i = this.objects.material.length - 1; i >= 0 ; i--) {
        this.objects.material[i].dispose();
        delete this.objects.material[i];
      }

      for (i = this.objects.mesh.length - 1; i >= 0 ; i--) {
        if (this.objects.mesh[i].hasOwnProperty('geometry')) {
          this.objects.mesh[i].geometry.dispose();
          delete this.objects.mesh[i].geometry;
        }

        if (this.objects.mesh[i].hasOwnProperty('material')) {
          this.objects.mesh[i].material.dispose();
          delete this.objects.mesh[i].material;
        }

        this.scene.remove(this.objects.mesh[i]);
        delete this.objects.mesh[i];
      }

      for (i = this.scene.children.length - 1; i >= 0 ; i--) {
        if (this.scene.children[i].hasOwnProperty('geometry')) {
          this.scene.children[i].geometry.dispose();
          delete this.scene.children[i].geometry;
        }

        if (this.scene.children[i].hasOwnProperty('material')) {
          this.scene.children[i].material.dispose();
          delete this.scene.children[i].material;
        }

        this.scene.remove(this.scene.children[i]);
        delete this.scene.children[i];
      }

      this.scene.children = undefined

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

      $(this.canvas).off('mousedown');

      this.room = null;
      this.map = null;
      this.racks = null;
      this.nodes = null;
      this.jobs = null;

      this.camera = null;
      this.clock = null;

      this.objects = null;
      this.renderer = null;
      this.scene = null;
      this.canvas = null;
      this.clock = null;
      this.raycaster = null;
      this.canvasRectangle = null;
      this.controls = null;

      this.init = null;
      this.destroy = null;
      this.mouse = null;
      this.interfaceOptions = null;
      this.clean = null;
      this.addCores = null;
      this.addLed = null;
      this.addLight = null;
      this.addNode = null;
      this.addRack = null;
      this.addRoof = null;
      this.addWalls = null;
      this.calculateEnv = null;
      this.getMapValue = null;
      this.addCamera = null;
      this.addFloor = null;
      this.onMouseDown = null;
      this.render = null;
      this.setControls = null;
      this.THREE = null;
    }

    return this;
  };
});
