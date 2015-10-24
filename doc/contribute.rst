How to contribute or add page
=============================

Architecture Front
------------------

Design
^^^^^^

The entire front, a single page app, is designed with RequireJS, Handlebars and JQuery.

RequireJS handle the dependencies and modules loading. See RequireJS documentation
Handlebars manage the template rendering. See Handlebars documentation
JQuery help to select and perform actions on the DOM. See JQuery documentation



Directory structure
^^^^^^^^^^^^^^^^^^^

* ``/js/core`` : Application core methods, app entry point, navigation and multi-cluster mode methods
  Note : /js/core/index.js : Application entry point
* ``/js/draw`` : Draw methods for 2D and 3D canvas
* ``/js/helpers`` : Handlebars helpers used to format data
* ``/js/modules`` : Applications page
* ``/js/utils`` : Applications utils


Page API
--------

Typical module object :

.. code-block:: json

  define([
    /*
     * Require dependencies/libraries for the module
     */
  ], function (/* get the dependencies here */) {

    return function() {
      this.init = function () {
        /* perform init action like data fetching, template rendering, events binding etc... */
      }

      this.refresh = function () {
        /* set and perfom actions at refresh */
      }

      this.destroy = function () {
        /* Destroy DOM content, free memory or unbind events at destroy */
      }
    }
  })


Work with current page or add new:
----------------------------------

To add a new page in slurm-web :
* Create a module object (see below) and save it in /js/modules/(pagename)/(pagename).js
* Require the module files (.js and .hbs) in /js/core/index.js
* Add a navigation element in /js/core/navbar/navbar.js
* Add a navigation event in the `$(document).on('show')` in /js/core/index.js
