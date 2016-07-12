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
  'three',
  'text!/slurm-web-conf/3d.config.json'
], function($, THREE, d3config) {
  d3config = JSON.parse(d3config);

  THREE.PacmanAuto = function(camera, domElement, map) {
    var self = this;

    this.camera = camera;
    this.map = map;
    this.directionCoefficient = 1;
    this.currentRange = 0;
    this.currentMovement = 0;
    this.movements = [];
    this.domElement = typeof domElement !== 'undefined' ? domElement : document;
    this.target = new THREE.Vector3(0, 0, 0);

    this.enabled = true;
    this.movementSpeed = d3config.PACMAN.MOVESPEED;
    this.lookSpeed = d3config.PACMAN.LOOKSPEED;

    function setMovements(invert) {
      var cameraPosition = self.camera.clone().position,
        cameraRotation = self.camera.clone().rotation,
        directionZ = 1,
        directionX = 1,
        directionY = -1,
        rotationTo,
        translateTo,
        indexRange;

      if (invert) {
        directionX = -1;
        directionZ = -1;
        directionY = 1;
      }

      for (indexRange = 0; indexRange < self.map.rangeNumber / 2; indexRange++) {
        translateTo = directionX * (self.map.width - 2) * d3config.UNITSIZE / 2;
        self.movements.push({
          type: 'translateX',
          direction: directionX,
          to: translateTo
        });

        rotationTo = cameraRotation.y + directionY * Math.PI;
        self.movements.push({
          type: 'rotateY',
          direction: directionY,
          to: rotationTo
        });
        cameraRotation.y = rotationTo;

        if (indexRange + 1 < self.map.rangeNumber / 2) {
          translateTo = cameraPosition.z + directionZ * (
            d3config.PATHSIZE / 2 * d3config.UNITSIZE +
            2 * d3config.UNITSIZE * d3config.RACKMARGIN +
            2 * d3config.RACKDEPTH * d3config.UNITSIZE +
            d3config.PATHSIZE * d3config.UNITSIZE
          );

          self.movements.push({
            type: 'translateZ',
            direction: directionZ,
            to: translateTo
          });
          cameraPosition.z = translateTo;
        }

        directionX *= -1;
        directionY *= -1;
      }

      directionZ *= -1;
      directionY *= -1;

      for (indexRange = 0; indexRange < self.map.rangeNumber / 2; indexRange++) {
        translateTo = directionX * (self.map.width - 2) * d3config.UNITSIZE / 2;
        self.movements.push({
          type: 'translateX',
          direction: directionX,
          to: translateTo
        });

        rotationTo = cameraRotation.y + directionY * Math.PI;
        self.movements.push({
          type: 'rotateY',
          direction: directionY,
          to: rotationTo
        });
        cameraRotation.y = rotationTo;

        if (indexRange + 1 < self.map.rangeNumber / 2) {
          translateTo = cameraPosition.z + directionZ * (
            d3config.PATHSIZE / 2 * d3config.UNITSIZE +
            2 * d3config.UNITSIZE * d3config.RACKMARGIN +
            2 * d3config.RACKDEPTH * d3config.UNITSIZE +
            d3config.PATHSIZE * d3config.UNITSIZE
          );

          self.movements.push({
            type: 'translateZ',
            direction: directionZ,
            to: translateTo
          });
          cameraPosition.z = translateTo;
        }

        directionX *= -1;
        directionY *= -1;

        if (indexRange > self.map.rangeNumber / 2) {
          break;
        }
      }

      self.movements.push({
        type: 'end'
      });
    }

    function resetCamera() {
      var mapY = 1 + 2 * d3config.PATHSIZE;

      self.camera.position.z = (mapY - (self.map.height - 1) / 2) *
        (
          d3config.UNITSIZE * d3config.RACKDEPTH +
          d3config.UNITSIZE * d3config.RACKMARGIN
        ) +
        d3config.PATHSIZE * d3config.UNITSIZE;

      self.camera.position.x = -1 * self.map.width * d3config.UNITSIZE / 2 + d3config.UNITSIZE;

      self.target = new THREE.Vector3(self.map.width * d3config.UNITSIZE / 2 + d3config.UNITSIZE, self.camera.position.y, self.camera.position.z);
      self.camera.lookAt(self.target);
    }

    this.update = function(delta) {
      var movement;

      if (this.enabled && this.movements.hasOwnProperty(this.currentMovement)) {
        movement = this.movements[this.currentMovement];
        switch (movement.type) {
        case 'translateX':
          if (movement.direction > 0 && this.camera.position.x < movement.to) {
            this.camera.position.x += delta * this.movementSpeed;

            if (this.camera.position.x > movement.to) {
              this.camera.position.x = movement.to;
            }
          } else if (movement.direction < 0 && this.camera.position.x > movement.to) {
            this.camera.position.x -= delta * this.movementSpeed;

            if (this.camera.position.x < movement.to) {
              this.camera.position.x = movement.to;
            }
          } else if (this.movements.hasOwnProperty(this.currentMovement + 1)) {
            this.currentMovement++;
          }
          break;
        case 'rotateY':
          if (movement.direction > 0 && this.camera.rotation.y < movement.to) {
            this.camera.rotation.y += delta * this.lookSpeed;

            if (this.camera.rotation.y > movement.to) {
              this.camera.rotation.y = movement.to;
            }
          } else if (movement.direction < 0 && this.camera.rotation.y > movement.to) {
            this.camera.rotation.y -= delta * this.lookSpeed;

            if (this.camera.rotation.y < movement.to) {
              this.camera.rotation.y = movement.to;
            }
          } else if (this.movements.hasOwnProperty(this.currentMovement + 1)) {
            this.currentMovement++;
          }
          break;
        case 'translateZ':
          if (movement.direction > 0 && this.camera.position.z < movement.to) {
            this.camera.position.z += delta * this.movementSpeed;

            if (this.camera.position.z > movement.to) {
              this.camera.position.z = movement.to;
            }
          } else if (movement.direction < 0 && this.camera.position.z > movement.to) {
            this.camera.position.z -= delta * this.movementSpeed;

            if (this.camera.position.z < movement.to) {
              this.camera.position.z = movement.to;
            }
          } else if (this.movements.hasOwnProperty(this.currentMovement + 1)) {
            this.currentMovement++;
          }
          break;
        case 'end':
          resetCamera();
          this.currentMovement = 0;
          break;
        }
      }
    };

    resetCamera();
    setMovements(false);
  };
});
