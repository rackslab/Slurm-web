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

 /*eslint-disable */

/*
 * The MIT License
 *
 * Copyright © 2010-2015 three.js authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 */

define([
  'jquery',
  'three',
  'text!/slurm-web-conf/3d.config.json'
], function ($, THREE, d3config) {
  d3config = JSON.parse(d3config);

  THREE.FirstPersonControls = function (object, domElement, forbiddenZone, forbiddenVoid) {
    var self = this;
    this.object = object;
    this.target = new THREE.Vector3(0, 0, 0);

    this.domElement = (domElement !== undefined) ? domElement : document;

    this.enabled = true;

    this.movementSpeed = 10.0;
    this.lookSpeed = 0.1;

    this.lookVertical = true;
    this.autoForward = false;

    this.activeLook = true;

    this.heightSpeed = false;
    this.heightCoef = 1.0;
    this.heightMin = 0.0;
    this.heightMax = 1.0;

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

    this.mouseDragOn = false;

    this.viewHalfX = 0;
    this.viewHalfY = 0;

    if (this.domElement !== document) {
      this.domElement.setAttribute('tabindex', -1);
    }

    this.handleResize = function () {

      if (this.domElement === document) {

        this.viewHalfX = window.innerWidth / 2;
        this.viewHalfY = window.innerHeight / 2;

      } else {

        this.viewHalfX = this.domElement.width / 2;
        this.viewHalfY = this.domElement.height / 2;

      }

    };

    this.onMouseDown = function (event) {
      event.preventDefault();

      if (this.domElement !== document) {

        this.domElement.focus();

      }

      if (this.activeLook) {

        switch (event.button) {

          case 0: this.moveForward = true; break;
          case 2: this.moveBackward = true; break;

        }

      }

      this.mouseDragOn = true;

    };

    this.onMouseUp = function (event) {

      event.preventDefault();

      if (this.activeLook) {

        switch (event.button) {

          case 0: this.moveForward = false; break;
          case 2: this.moveBackward = false; break;

        }

      }

      this.mouseDragOn = false;

    };

    this.onMouseMove = function (event) {

      event.preventDefault();

      if (this.domElement === document) {
        this.mouseX = event.pageX - this.viewHalfX;
        this.mouseY = event.pageY - this.viewHalfY;
      } else {
        this.mouseX = event.pageX - this.viewHalfX;
        this.mouseY = event.pageY - $('canvas').offset().top - this.viewHalfY;
      }
    };

    this.onKeyDown = function (event) {

      event.preventDefault();

      switch (event.keyCode) {

        case 38: /*up*/
        case d3config.CONTROLS.FORWARD: this.moveForward = true; break;

        case 37: /*left*/
        case d3config.CONTROLS.LEFT: this.moveLeft = true; break;

        case 40: /*down*/
        case d3config.CONTROLS.BACKWARD: this.moveBackward = true; break;

        case 39: /*right*/
        case d3config.CONTROLS.RIGHT: this.moveRight = true; break;

        case 82: this.moveUp = true; break;
        case 70: this.moveDown = true; break;

        case d3config.CONTROLS.FREEZE:
          if (!this.enabled) {
            this.enabled = true;
            break;
          }

          this.enabled = false;
          break;
      }

    };

    this.onKeyUp = function (event) {

      switch (event.keyCode) {

        case 38: /*up*/
        case d3config.CONTROLS.FORWARD: this.moveForward = false; break;

        case 37: /*left*/
        case d3config.CONTROLS.LEFT: this.moveLeft = false; break;

        case 40: /*down*/
        case d3config.CONTROLS.BACKWARD: this.moveBackward = false; break;

        case 39: /*right*/
        case d3config.CONTROLS.RIGHT: this.moveRight = false; break;

        case 82: /*R*/ this.moveUp = false; break;
        case 70: /*F*/ this.moveDown = false; break;

      }

    };

    this.isForbiddenZone = function() {
      var x = this.object.position.x,
          y = this.object.position.y,
          z = this.object.position.z;

      var i,
          zone
      for (i = 0; i < forbiddenZone.length; i++) {
        zone = forbiddenZone[i];
        if (x >= zone.minX && x <= zone.maxX &&
            y >= zone.minY && y <= zone.maxY &&
            z >= zone.minZ && z <= zone.maxZ) {
          return true;
        }
      }

      if (y <= forbiddenVoid.floor ||
          y >= (forbiddenVoid.roof) ||
          z <= forbiddenVoid.topWall ||
          z >= forbiddenVoid.bottomWall ||
          x <= forbiddenVoid.leftWall ||
          x >= forbiddenVoid.rightWall) {
        return true;
      }

      return false;
    }

    this.update = function(delta) {

      if (this.enabled === false) return;

      if (this.mouseX < (this.domElement.width * 0.1) &&
          this.mouseX > -(this.domElement.width * 0.1) &&
          this.mouseY < (this.domElement.height * 0.1) &&
          this.mouseY > -(this.domElement.height * 0.1)) {
        this.mouseX = 0;
        this.mouseY = 0;
      }

      if (this.heightSpeed) {

        var y = THREE.Math.clamp(this.object.position.y, this.heightMin, this.heightMax);
        var heightDelta = y - this.heightMin;

        this.autoSpeedFactor = delta * (heightDelta * this.heightCoef);

      } else {
        this.autoSpeedFactor = 0.0;
      }

      var actualMoveSpeed = delta * this.movementSpeed;

      if ((this.moveForward || (this.autoForward && !this.moveBackward)) && !this.isForbiddenZone()) {
        this.object.translateZ(-(actualMoveSpeed + this.autoSpeedFactor));
        if (this.isForbiddenZone()) {
          this.object.translateZ(+(actualMoveSpeed + this.autoSpeedFactor))
        }
      }

      if (this.moveBackward && !this.isForbiddenZone()) {
        this.object.translateZ(+actualMoveSpeed);
        if (this.isForbiddenZone()) {
          this.object.translateZ(-actualMoveSpeed);
        }
      }

      if (this.moveLeft && !this.isForbiddenZone()) {
        this.object.translateX(-actualMoveSpeed);
        if (this.isForbiddenZone()) {
          this.object.translateX(+actualMoveSpeed);
        }
      }

      if (this.moveRight && !this.isForbiddenZone()) {
        this.object.translateX(+actualMoveSpeed);
        if (this.isForbiddenZone()) {
          this.object.translateX(-actualMoveSpeed);
        }
      }

      if (this.moveUp && !this.isForbiddenZone()) {
        this.object.translateY(+actualMoveSpeed);
        if (this.isForbiddenZone()) {
          this.object.translateY(-actualMoveSpeed);
        }
      }
      if (this.moveDown && !this.isForbiddenZone()) {
        this.object.translateY(-actualMoveSpeed);
        if (this.isForbiddenZone()) {
          this.object.translateY(+actualMoveSpeed);
        }
      }

      var actualLookSpeed = delta * this.lookSpeed;

      if (!this.activeLook) {
        actualLookSpeed = 0;
      }

      var verticalLookRatio = 1;

      if (this.constrainVertical) {

        verticalLookRatio = Math.PI / (this.verticalMax - this.verticalMin);

      }

      this.lon += this.mouseX * actualLookSpeed;

      if (this.lookVertical) this.lat -= this.mouseY * actualLookSpeed * verticalLookRatio;

      this.lat = Math.max(-85, Math.min(85, this.lat));
      this.phi = THREE.Math.degToRad(90 - this.lat);

      this.theta = THREE.Math.degToRad(this.lon);

      if (this.constrainVertical) {
        this.phi = THREE.Math.mapLinear(this.phi, 0, Math.PI, this.verticalMin, this.verticalMax);
      }

      var targetPosition = this.target,
      position = this.object.position;

      targetPosition.x = position.x + 100 * Math.sin(this.phi) * Math.cos(this.theta);
      targetPosition.y = position.y + 100 * Math.cos(this.phi);
      targetPosition.z = position.z + 100 * Math.sin(this.phi) * Math.sin(this.theta);

      this.object.lookAt(targetPosition);
    };

    $(document).on('contextmenu', function (event) { event.preventDefault(); });
    $(this.domElement).on('mousemove', bind(this, this.onMouseMove));
    $(this.domElement).on('mousedown', bind(this, this.onMouseDown));
    $(this.domElement).on('mouseup', bind(this, this.onMouseUp));

    $(document).on('keydown', bind(this, this.onKeyDown));
    $(document).on('keyup', bind(this, this.onKeyUp));

    function bind(scope, fn) {

      return function () {

        fn.apply(scope, arguments);

      };

    };

    this.handleResize();

  };
});
