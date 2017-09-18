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
  'error-utils',
  'three',
  'factor-draw',
  'colors-draw',
  'three-orbit-controls',
  'three-first-person-controls',
  'three-pacman-auto'
], function($, d3Config, d3Colors, errorUtils, THREE, factorDraw, colorsDraw) {
  var config = JSON.parse(d3Config),
    colors = JSON.parse(d3Colors);

  return function(map, racks, nodes, jobs, room) {
    var scene = null,
      light = null,
      canvas = null,
      mouse = null,
      raycaster = null,
      canvasRectangle = null,
      camera = null,
      clock = null,
      interfaceOptions = null,
      controls = null,
      objects = {},
      idFrame = null,
      cancelAnimation = null,
      floorWidth = null,
      floorDepth = null,
      floorX = null,
      floorZ = null,
      renderer = null,
      defaultXSize = null,
      defaultZSize = null,
      warned = false,
      forbiddenZone = [],
      forbiddenVoid = {
        roof: 0,
        floor: 0,
        topWall: 0,
        bottomWall: 0,
        leftWall: 0,
        rightWall: 0
      };

    this.calculateEnv = function() {
      map.unitWidth = map.width * config.UNITSIZE + map.rangeMaxRacksNumber * config.UNITSIZE * config.RACKMARGIN;
      map.unitHeight = map.height * config.UNITSIZE + map.rangeNumber * (config.UNITSIZE * config.RACKDEPTH + config.UNITSIZE * config.RACKMARGIN);
    };

    this.onMouseDown = function(event) {
      var canvasMouseX, canvasMouseY;

      event.preventDefault();

      canvasMouseX = event.clientX - canvasRectangle.left;
      canvasMouseY = event.clientY - canvasRectangle.top;

      mouse.set(canvasMouseX / canvas.width * 2 - 1, -canvasMouseY / canvas.height * 2 + 1, 0.5);
      mouse.unproject(camera);

      raycaster.set(camera.position, mouse.sub(camera.position).normalize());

      // var intersects = raycaster.intersectObjects(scene.children, true);
      // for (i = 0; i < intersects.length; i++) {
        //console.log(intersects[i].object);
      // }
    };

    this.getMapValue = function(x, y) {
      return map.data[y * map.width + x];
    };

    this.setControls = function(type) {
      if (type) {
        interfaceOptions.cameraType = type;
      }

      this.addCamera();

      switch (interfaceOptions.cameraType) {
      case 'fps':
        controls = new THREE.FirstPersonControls(camera, canvas, forbiddenZone, forbiddenVoid);
        controls.movementSpeed = config.MOVESPEED;
        controls.lookSpeed = config.LOOKSPEED;
        controls.lookVertical = true;
        controls.noFly = true;
        $(canvas).on('mousedown', this.onMouseDown);
        break;
      case 'pacman':
        controls = new THREE.PacmanAuto(camera, canvas, map);
        break;
      default:
        controls = new THREE.OrbitControls(camera, canvas);
      }
    };

    this.addLight = function() {
      light = new THREE.AmbientLight(0x404040);
      scene.add(light);
    };

    this.mergeMeshes = function(meshes) {
      var i,
        combined = new THREE.Geometry();

      for (i = 0; i < meshes.length; i++) {
        meshes[i].updateMatrix();
        combined.merge(meshes[i].geometry, meshes[i].matrix);
      }

      return combined;
    };

    // TODO : refacto in several smaller functions
    this.addWalls = function() {
      var wallMaterial, topWallGeometry, repeatX, bottomWallGeometry,
        leftWallGeometry, rightWallGeometry, topWall, bottomWall, leftWall,
        rightWall,
        texture = THREE.ImageUtils.loadTexture('static/wall.jpg');

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      objects.material.push(new THREE.MeshBasicMaterial({ map: texture }));
      wallMaterial = objects.material[objects.material.length - 1];

      objects.geometry.push(new THREE.PlaneBufferGeometry(floorWidth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      topWallGeometry = objects.geometry[objects.geometry.length - 1];
      repeatX = floorWidth / (room.rackwidth * config.UNITSIZE);

      if (!this.defaultXSize) {
        repeatX = floorWidth / (room.rackwidth * config.UNITSIZEMETER);
      }

      texture.repeat.set(repeatX, config.WALLHEIGHT);

      objects.geometry.push(new THREE.PlaneBufferGeometry(floorWidth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      bottomWallGeometry = objects.geometry[objects.geometry.length - 1];
      objects.geometry.push(new THREE.PlaneBufferGeometry(floorDepth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      leftWallGeometry = objects.geometry[objects.geometry.length - 1];
      objects.geometry.push(new THREE.PlaneBufferGeometry(floorDepth, config.WALLHEIGHT * config.UNITSIZE, 1, 1));
      rightWallGeometry = objects.geometry[objects.geometry.length - 1];

      objects.mesh.push(new THREE.Mesh(topWallGeometry, wallMaterial));
      topWall = objects.mesh[objects.mesh.length - 1];
      objects.mesh.push(new THREE.Mesh(bottomWallGeometry, wallMaterial));
      bottomWall = objects.mesh[objects.mesh.length - 1];
      objects.mesh.push(new THREE.Mesh(leftWallGeometry, wallMaterial));
      leftWall = objects.mesh[objects.mesh.length - 1];
      objects.mesh.push(new THREE.Mesh(rightWallGeometry, wallMaterial));
      rightWall = objects.mesh[objects.mesh.length - 1];

      topWall.position.x = floorX;
      topWall.position.z = -(floorDepth / 2) + floorZ;
      topWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;

      bottomWall.position.x = floorX;
      bottomWall.position.z = floorDepth / 2 + floorZ;
      bottomWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      bottomWall.rotation.x = 180 * Math.PI / 180;

      leftWall.position.z = floorZ;
      leftWall.position.x = -(floorWidth / 2) + floorX;
      leftWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      leftWall.rotation.y = 90 * Math.PI / 180;

      rightWall.position.z = floorZ;
      rightWall.position.x = floorWidth / 2 + floorX;
      rightWall.position.y = config.WALLHEIGHT * config.UNITSIZE / 2;
      rightWall.rotation.y = -90 * Math.PI / 180;

      scene.add(topWall);
      scene.add(bottomWall);
      scene.add(leftWall);
      scene.add(rightWall);

      wallMaterial.dispose();
      topWallGeometry.dispose();
      bottomWallGeometry.dispose();
      leftWallGeometry.dispose();
      rightWallGeometry.dispose();

      forbiddenVoid.topWall = topWall.position.z + config.UNITSIZE * config.COLLISONMARGIN;
      forbiddenVoid.bottomWall = bottomWall.position.z - config.UNITSIZE * config.COLLISONMARGIN;
      forbiddenVoid.leftWall = leftWall.position.x + config.UNITSIZE * config.COLLISONMARGIN;
      forbiddenVoid.rightWall = rightWall.position.x - config.UNITSIZE * config.COLLISONMARGIN;
    };

    this.addRoof = function() {
      var repeatXSize, repeatZSize, roofMaterial, roofGeometry, roof,
        texture = THREE.ImageUtils.loadTexture('static/roof.jpg');

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      repeatXSize = floorWidth / config.UNITSIZE;
      if (!defaultXSize) {
        repeatXSize = floorWidth / (room.rackwidth * config.UNITSIZEMETER);
      }

      repeatZSize = floorDepth / config.UNITSIZE;
      if (!defaultZSize) {
        repeatXSize = floorDepth / (room.rackwidth * config.UNITSIZEMETER);
      }

      texture.repeat.set(repeatXSize, repeatZSize);

      objects.material.push(new THREE.MeshBasicMaterial({ map: texture }));
      roofMaterial = objects.material[objects.material.length - 1];
      objects.geometry.push(new THREE.PlaneBufferGeometry(floorWidth, floorDepth, 1, 1));
      roofGeometry = objects.geometry[objects.geometry.length - 1];

      objects.mesh.push(new THREE.Mesh(roofGeometry, roofMaterial));
      roof = objects.mesh[objects.mesh.length - 1];
      roof.rotation.x = 90 * Math.PI / 180;

      roof.position.x = floorX;
      roof.position.z = floorZ;
      roof.position.y = config.WALLHEIGHT * config.UNITSIZE;

      scene.add(roof);
      roofMaterial.dispose();
      roofGeometry.dispose();

      forbiddenVoid.roof = roof.position.y - config.UNITSIZE * config.COLLISONMARGIN;
    };

    // TODO : refacto in several smaller functions
    this.addFloor = function() {
      var texture, repeatXSize, repeatZSize, floorMaterial, floorGeometry, floor;

      floorWidth = map.unitWidth;
      floorDepth = map.unitHeight;
      defaultXSize = true;
      defaultZSize = true;
      floorX = 0;
      floorZ = 0;

      if (room.width * room.rackwidth * config.UNITSIZEMETER > floorWidth) {
        floorWidth = room.width * room.rackwidth * config.UNITSIZEMETER;
        floorX = room.posx * room.rackwidth;
        defaultXSize = false;
      }

      if (room.depth * room.rackwidth * config.UNITSIZEMETER > floorDepth) {
        floorDepth = room.depth * room.rackwidth * config.UNITSIZEMETER;
        floorZ = room.posy * room.rackwidth;
        defaultZSize = false;
      }

      texture = THREE.ImageUtils.loadTexture('static/floor.jpg');
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      repeatXSize = floorWidth / config.UNITSIZE;
      if (!defaultXSize) {
        repeatXSize = floorWidth / (room.rackwidth * config.UNITSIZEMETER);
      }

      repeatZSize = floorDepth / config.UNITSIZE;
      if (!defaultZSize) {
        repeatXSize = floorDepth / (room.rackwidth * config.UNITSIZEMETER);
      }

      texture.repeat.set(repeatXSize, repeatZSize);

      objects.material.push(new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
      floorMaterial = objects.material[objects.material.length - 1];
      objects.geometry.push(new THREE.PlaneGeometry(floorWidth, floorDepth, 1, 1));
      floorGeometry = objects.geometry[objects.geometry.length - 1];

      objects.mesh.push(new THREE.Mesh(floorGeometry, floorMaterial));
      floor = objects.mesh[objects.mesh.length - 1];
      floor.rotation.x = 90 * Math.PI / 180;

      floor.position.x = floorX;
      floor.position.z = floorZ;

      scene.add(floor);
      floorGeometry.dispose();
      floorMaterial.dispose();

      forbiddenVoid.floor = config.UNITSIZE * config.COLLISONMARGIN;
    };

    // TODO : refacto in several smaller functions
    this.addCores = function(node, x, y, z, nodeWidth, nodeHeight, rackDepth, temperatureCoefficient) {
      var i, jobId, cpus, nodeJobs, width, height, tab, row, column, geometry,
        cpuDimensions, cpuDepth, factorWidth, factorHeight, cpuPadding,
        material, cpu, color, mesh, positionX, positionY, positionZ,
        coreMaterial, coreGeometry, coreMesh,
        ledDimensions = nodeWidth * config.LEDDIMENSIONS,
        coresMeshes = {};

      if (!nodes[node.name]) {
        errorUtils.setError('Unable to find ' + node.name + ' in given nodes.'); // eslint-disable-line no-console
        if (!warned) {
          errorUtils.setError('Oops, your racks.xml file seems to be wrong written. Check it'); // eslint-disable-line no-alert
          warned = true;
        }
        return;
      }

      if (!nodes[node.name].hasOwnProperty('cpus')) {
        return;
      }

      cpus = nodes[node.name].cpus;

      nodeJobs = [];

      if (jobs.hasOwnProperty(node.name)) {
        for (jobId in jobs[node.name]) {
          if (jobs[node.name].hasOwnProperty(jobId)) {
            for (i = 0; i < jobs[node.name][jobId]; i++) {
              nodeJobs.push(jobId);
            }
          }
        }
      }

      width = nodeWidth - 3 * ledDimensions;
      height = nodeHeight;
      tab = factorDraw.bestFactor(width, height, cpus);

      row = tab[0];
      column = tab[1];

      if (row / column === 1) {
        cpuDimensions = Math.min(width, height)/Math.max(column, row);
        cpuDepth = nodeWidth * config.CPUDEPTH;
      } else {
        cpuDimensions = Math.min(height / row, width / column);
        cpuDepth = nodeWidth * config.CPUDEPTH;
      }

      factorWidth = column * cpuDimensions;
      factorHeight = row * cpuDimensions;

      cpuPadding = cpuDimensions * config.CPUPADDING;

      geometry = new THREE.BoxGeometry(cpuDimensions - cpuPadding, cpuDimensions - cpuPadding, cpuDepth);
      objects.geometry.push(geometry);

      geometry = objects.geometry[objects.geometry.length - 1];

      objects.material.push(new THREE.MeshBasicMaterial({ color: colors.NOJOB }));
      material = objects.material[objects.material.length - 1];

      for (cpu = 0; cpu < cpus; cpu++) {
        if (!nodeJobs[cpu]) {
          color = colors.NOJOB;
        } else {
          color = colorsDraw.findJobColor(nodeJobs[cpu], '3D');
        }

        if (!coresMeshes.hasOwnProperty(color)) {
          coresMeshes[color] = [];
        }

        objects.mesh.push(new THREE.Mesh(geometry, material));
        mesh = objects.mesh[objects.mesh.length - 1];

        positionX = x + temperatureCoefficient * factorWidth / 2 + ledDimensions * -temperatureCoefficient - temperatureCoefficient * cpuDimensions / 2 - temperatureCoefficient * Math.floor(cpu % column) * cpuDimensions;
        positionY = y + factorHeight / 2 - Math.floor(cpu / column) * cpuDimensions - cpuDimensions / 2;
        positionZ = z - rackDepth / 2 * temperatureCoefficient;

        mesh.position.x = positionX;
        mesh.position.y = positionY;
        mesh.position.z = positionZ;

        coresMeshes[color].push(mesh);
      }

      geometry.dispose();
      material.dispose();

      for (color in coresMeshes) {
        if (coresMeshes.hasOwnProperty(color)) {
          coreGeometry = this.mergeMeshes(coresMeshes[color]);
          objects.material.push(new THREE.MeshBasicMaterial({ color: color }));
          coreMaterial = objects.material[objects.material.length - 1];

          objects.mesh.push(new THREE.Mesh(coreGeometry, coreMaterial));
          coreMesh = objects.mesh[objects.mesh.length - 1];

          scene.add(coreMesh);

          coreGeometry.dispose();
          coreMaterial.dispose();
        }
      }
    };

    this.addLed = function(node, x, y, z, nodeWidth, nodeHeight, rackDepth, temperatureCoefficient) {
      var material, mesh,
        ledDimensions = nodeWidth * config.LEDDIMENSIONS,
        ledDepth = nodeWidth * config.LEDDEPTH,
        geometry = new THREE.BoxGeometry(ledDimensions, ledDimensions, ledDepth);

      objects.geometry.push(new THREE.BufferGeometry().fromGeometry(geometry));
      geometry = objects.geometry[objects.geometry.length - 1];

      objects.material.push(new THREE.MeshBasicMaterial({ color: colorsDraw.findLedColor(nodes[node.name], '3D').state }));
      material = objects.material[objects.material.length - 1];

      objects.mesh.push(new THREE.Mesh(geometry, material));
      mesh = objects.mesh[objects.mesh.length - 1];

      mesh.position.x = x - (nodeWidth / 2 - (ledDimensions + 0.5 * ledDimensions)) * -1 * temperatureCoefficient;
      mesh.position.y = y;
      mesh.position.z = z - rackDepth / 2 * temperatureCoefficient;

      scene.add(mesh);
      geometry.dispose();
      material.dispose();
    };

    this.addNode = function(node, x, y, z, temperatureCoefficient) {
      var geometry, material, mesh, positionX, positionY, positionZ,
        nodeWidth = node.width * (config.RACKWIDTH - 2 * config.RACKPADDING - 2 * config.NODEPADDINGLEFTRIGHT) * config.UNITSIZE,
        nodeX = node.posx * (config.RACKWIDTH - 2 * config.RACKPADDING + config.NODEPADDINGLEFTRIGHT) * config.UNITSIZE,
        nodeHeight = node.height * config.RACKHEIGHT * config.UNITSIZE * (1 - config.NODEPADDINGTOP),
        nodeY = node.posy * config.RACKHEIGHT * config.UNITSIZE,
        nodeDepth = config.RACKDEPTH * config.UNITSIZE - 2 * config.RACKDEPTH * config.UNITSIZE * config.RACKPADDING;

      objects.geometry.push(new THREE.BoxGeometry(nodeWidth, nodeHeight, nodeDepth));
      geometry = objects.geometry[objects.geometry.length - 1];

      objects.material.push(new THREE.MeshBasicMaterial({ color: colors.NODE }));
      material = objects.material[objects.material.length - 1];

      objects.mesh.push(new THREE.Mesh(geometry, material));
      mesh = objects.mesh[objects.mesh.length - 1];

      positionX = x - -temperatureCoefficient * ((config.RACKWIDTH - 2 * config.RACKPADDING) * config.UNITSIZE / 2) + -temperatureCoefficient * nodeX + -temperatureCoefficient * (nodeWidth / 2);
      positionY = y + config.RACKHEIGHT * config.UNITSIZE / 2 + nodeY + nodeHeight / 2;
      positionZ = z + -temperatureCoefficient * (config.RACKDEPTH * config.UNITSIZE * 0.006 + config.RACKDEPTH * config.UNITSIZE * config.RACKPADDING);

      mesh.position.x = positionX;
      mesh.position.y = positionY;
      mesh.position.z = positionZ;

      positionZ = z + -temperatureCoefficient * (config.RACKDEPTH * config.UNITSIZE * 0.006);

      geometry.dispose();
      material.dispose();

      this.addLed(node, positionX, positionY, positionZ, nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE, temperatureCoefficient);
      this.addCores(node, positionX, positionY, positionZ, nodeWidth, nodeHeight, config.RACKDEPTH * config.UNITSIZE, temperatureCoefficient);

      return mesh;
    };

    this.addRackName = function(rack, x, y, z, width, height, depth, temperatureCoefficient) {
      if (!(config.RACKNAME.FONT && config.RACKNAME.FONT.NAME && config.RACKNAME.FONT.PATH)) {
        console.error( // eslint-disable-line no-console
          'A typeface font have to be fully configured in file 3d.config.json to display racks names.',
          'FONT:',
          config.RACKNAME.FONT
        );
        return false;
      }

      require([ '../../../' + config.RACKNAME.FONT.PATH.replace(/\.js$/g, '') ], function() { // eslint-disable-line global-require
        var material, mesh,
          geometry = new THREE.TextGeometry(rack.name, {
            size: config.UNITSIZE * config.RACKNAME.SIZE,
            height: config.UNITSIZE * config.RACKNAME.DEPTH,
            font: config.RACKNAME.FONT.NAME,
            weight: 'normal',
            style: 'normal'
          });

        objects.geometry.push(new THREE.BufferGeometry().fromGeometry(geometry));
        geometry = objects.geometry[objects.geometry.length - 1];

        geometry.computeBoundingBox();

        objects.material.push(new THREE.MeshBasicMaterial({ color: colors.RACKNAME.FONT }));
        material = objects.material[objects.material.length - 1];

        objects.mesh.push(new THREE.Mesh(geometry, material));
        mesh = objects.mesh[objects.mesh.length - 1];

        if (temperatureCoefficient > 0) {
          mesh.rotation.y = Math.PI;
        }

        mesh.position.x = x + temperatureCoefficient * (geometry.boundingBox.max.x - geometry.boundingBox.min.x) / 2;
        mesh.position.y = height;
        mesh.position.z = z - temperatureCoefficient * (depth / 2);

        scene.add(mesh);

        geometry.dispose();
        material.dispose();
      });
    };

    this.addRack = function() {
      var rack, positionX, positionY, positionZ, geometry, material, mesh,
        x, y, range, currentRange, temperatureCoefficient, index, nodeMeshes,
        nodeMaterial, nodeGeometry, nodeMesh,
        texture = THREE.ImageUtils.loadTexture('static/rack.jpg');

      texture.repeat.set(1, 1, 1);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      objects.material.push(new THREE.MeshBasicMaterial({ map: texture }));
      material = objects.material[objects.material.length - 1];

      range = 1;
      currentRange = 1;
      temperatureCoefficient = 1;

      for (y = 0; y < map.height; y++) {
        for (x = 0; x < map.width; x++) {
          if (this.getMapValue(x, y) !== 1 && this.getMapValue(x, y) !== 0 && racks.hasOwnProperty(this.getMapValue(x, y))) {
            rack = racks[this.getMapValue(x, y)];

            if (x === 1 + config.PATHSIZE * 2) {
              range++;
            }

            if (range !== currentRange) {
              temperatureCoefficient *= -1;
              currentRange = range;
            }

            positionX = (x - (map.width - 1) / 2) * (config.UNITSIZE * config.RACKWIDTH + config.UNITSIZE * config.RACKMARGIN);
            positionY = config.UNITSIZE * config.RACKHEIGHT / 2;
            positionZ = (y - (map.height - 1) / 2) * (config.UNITSIZE * config.RACKDEPTH + config.UNITSIZE * config.RACKMARGIN);

            forbiddenZone.push({
              minX: positionX - config.UNITSIZE * config.RACKWIDTH / 2 - config.UNITSIZE * config.COLLISONMARGIN,
              maxX: positionX + config.UNITSIZE * config.RACKWIDTH / 2 + config.UNITSIZE * config.COLLISONMARGIN,
              minY: -config.UNITSIZE * config.COLLISONMARGIN,
              maxY: (map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT + config.UNITSIZE * config.COLLISONMARGIN,
              minZ: positionZ - config.UNITSIZE * config.RACKDEPTH / 2 - config.UNITSIZE * config.COLLISONMARGIN,
              maxZ: positionZ + config.UNITSIZE * config.RACKDEPTH / 2 + config.UNITSIZE * config.COLLISONMARGIN
            });

            nodeMeshes = [];

            for (index in rack.nodes) {
              if (rack.nodes.hasOwnProperty(index)) {
                nodeMeshes.push(this.addNode(rack.nodes[index], positionX, positionY, positionZ, temperatureCoefficient));
              }
            }

            objects.material.push(new THREE.MeshBasicMaterial({ color: colors.NODE }));
            nodeMaterial = objects.material[objects.material.length - 1];

            nodeGeometry = this.mergeMeshes(nodeMeshes);
            objects.mesh.push(new THREE.Mesh(nodeGeometry, nodeMaterial));
            nodeMesh = objects.mesh[objects.mesh.length - 1];

            scene.add(nodeMesh);

            geometry = new THREE.BoxGeometry(
              config.UNITSIZE * config.RACKWIDTH,
              (map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT,
              config.UNITSIZE * config.RACKDEPTH
            );
            objects.geometry.push(new THREE.BufferGeometry().fromGeometry(geometry));
            geometry = objects.geometry[objects.geometry.length - 1];

            objects.mesh.push(new THREE.Mesh(geometry, material));
            mesh = objects.mesh[objects.mesh.length - 1];

            mesh.position.x = positionX;
            mesh.position.y = (map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT / 2;
            mesh.position.z = positionZ;

            scene.add(mesh);

            geometry.dispose();
            material.dispose();
            nodeGeometry.dispose();
            nodeMaterial.dispose();

            this.addRackName(
              rack,
              mesh.position.x,
              mesh.position.y,
              mesh.position.z,
              config.UNITSIZE * config.RACKWIDTH,
              (map.altitude + 1) * config.UNITSIZE * config.RACKHEIGHT,
              config.UNITSIZE * config.RACKDEPTH,
              temperatureCoefficient
            );
          }
        }
      }
      material.dispose();
    };

    this.addCamera = function() {
      var x = 0,
        y = 0,
        z = 0;

      switch (interfaceOptions.cameraType) {
      case 'fps':
        x = -map.width * config.UNITSIZE / 2 + config.PATHSIZE / 2 * config.UNITSIZE;
        y = map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
        z = 0;
        break;
      default:
        x = -(map.width * config.UNITSIZE);
        y = map.altitude * config.RACKHEIGHT * config.UNITSIZE / 2;
        z = 0;
      }

      camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 10000);
      camera.position.set(x, y, z);
      scene.add(camera);
    };

    this.init = function(canvasElem) {
      canvas = canvasElem;
      objects = {};
      objects.material = [];
      objects.geometry = [];
      objects.mesh = [];

      function render() {
        var delta;

        if (!cancelAnimation) {
          delta = clock.getDelta();
          controls.update(delta);
          idFrame = requestAnimationFrame(render);
          renderer.render(scene, camera);
        }
      }

      idFrame = null;
      cancelAnimation = false;
      canvas = canvas;
      interfaceOptions = {
        cameraType: 'orbit',
        screenType: 'page'
      };

      clock = new THREE.Clock();
      mouse = new THREE.Vector3();
      raycaster = new THREE.Raycaster();
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      scene = new THREE.Scene();

      canvasRectangle = renderer.domElement.getBoundingClientRect();

      this.setControls(canvas);

      this.calculateEnv();
      this.addLight();
      this.addFloor();
      this.addWalls();
      this.addRoof();
      this.addRack();

      if (config.DEBUG) {
        scene.add(new THREE.AxisHelper(100));
      }

      render();
    };

    this.resize = function(canvas) {
      camera.aspect = canvas.width / canvas.height;
      camera.updateProjectionMatrix();

      renderer.setSize(canvas.width, canvas.height);
    };

    this.clean = function() {
      var i;

      cancelAnimation = true;
      cancelAnimationFrame(idFrame);

      for (i = objects.geometry.length - 1; i >= 0; i--) {
        objects.geometry[i].dispose();
        delete objects.geometry[i];
      }

      for (i = objects.material.length - 1; i >= 0; i--) {
        objects.material[i].dispose();
        delete objects.material[i];
      }

      for (i = objects.mesh.length - 1; i >= 0; i--) {
        if (objects.mesh[i].hasOwnProperty('geometry')) {
          objects.mesh[i].geometry.dispose();
          delete objects.mesh[i].geometry;
        }

        if (objects.mesh[i].hasOwnProperty('material')) {
          objects.mesh[i].material.dispose();
          delete objects.mesh[i].material;
        }

        scene.remove(objects.mesh[i]);
        delete objects.mesh[i];
      }

      for (i = scene.children.length - 1; i >= 0; i--) {
        if (scene.children[i].hasOwnProperty('geometry')) {
          scene.children[i].geometry.dispose();
          delete scene.children[i].geometry;
        }

        if (scene.children[i].hasOwnProperty('material')) {
          scene.children[i].material.dispose();
          delete scene.children[i].material;
        }

        scene.remove(scene.children[i]);
        delete scene.children[i];
      }

      renderer.dispose();

      room = null;
      map = null;
      racks = null;
      nodes = null;
      jobs = null;
      scene = null;
      light = null;
      canvas = null;
      mouse = null;
      raycaster = null;
      canvasRectangle = null;
      camera = null;
      clock = null;
      interfaceOptions = null;
      controls = null;
      objects = null;
      idFrame = null;
      cancelAnimation = null;
      interfaceOptions = null;
      floorWidth = null;
      floorDepth = null;
      renderer = null;
      defaultXSize = null;
      defaultZSize = null;
      forbiddenZone = null;
      forbiddenVoid = null;

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

      $(canvas).off('mousedown');
    };

    return this;
  };
});
