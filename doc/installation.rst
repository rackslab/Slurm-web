Installation Guide
==================

Download
--------

Source code
^^^^^^^^^^^

The source code of Slurm-web is hosted on GitHub at this URL:
https://github.com/edf-hpc/slurm-web

You can download latest version of this source code by clone the Git repository::

    git clone https://github.com/edf-hpc/slurm-web.git

Debian packages
^^^^^^^^^^^^^^^

We are currently thinking about providing pre-built Debian packages for
Slurm-web ready to download and install. For the moment, you will have to build
these packages by yourself from the source.

On a Debian based system with all build dependencies installed, run the
following command (or any similar) to build the binary packages::

    debuild -us -uc

The packages should build properly, then you can add them to your own internal
Debian repository.

Requirements
------------

For the moment, Slurm-web is developed as a native Debian package. This means it
is very easy to install it and configure it on Debian based GNU/Linux
distributions (eg. Ubuntu).

However, the drawback is that it becomes much harder to install it on others
RPM based GNU/Linux distributions (such as RHEL, Centos, Fedora, and so on).
If you want to improve the situation on these distributions, please contact us.

The backend API depends on the following libraries:

* `Flask`_ web framework,
* `PySLURM`_, the python binding to Slurm C libraries,
* `ClusterShell`_ , a distributed shell with nodeset manipulation Python library

.. _Flask: http://flask.pocoo.org/
.. _PySLURM: http://www.gingergeeks.co.uk/pyslurm/
.. _ClusterShell: http://cea-hpc.github.io/clustershell/

The dashboard has the following dependencies:

* `bootstrap`, the responsive HTML, JS and CSS framework,
* `jQuery`_ JS library,
* `Flot`_, a jQuery extension for drawing charts.

.. _bootstrap: http://getbootstrap.com/
.. _jQuery: https://jquery.com/
.. _Flot: http://www.flotcharts.org/


Installation
------------

From source
^^^^^^^^^^^

Not supported yet. Please contact us if you want to improve this part.

Distributions
^^^^^^^^^^^^^

Debian/Ubuntu
"""""""""""""

Once the binary packages of Slurm-web are in your internal Debian repository, simply
install these packages with the following command::

    apt-get install slurm-web-restapi slurm-web-dashboard

RHEL/Centos
"""""""""""

Not supported yet. Please contact us if you want to improve this part.

Configuration
-------------

The configuration of Slurm-web is composed of only one file, an XML description
of your racks and nodes. The content and format of this file is explained in the
following sub-section.

XML racks and nodes description
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Slurm does not provide sufficient information about the nodes and the racks
composing a supercomputer for representing it accurately with correct node sizes
and distribution over the racks. For this purpose, Slurm-web backend API relies
on an additional file located under the path ``/etc/slurm-web/racks.xml``.

This file must contain the complete description of your racks and nodes in XML
format. Here is an example of file:

.. code-block:: xml

    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE rackmap SYSTEM "/usr/share/slurm-web/restapi/schema/dtd/racks.dtd">
    <rackmap>

      <nodetypes>
        <nodetype id="m32x4321" model="Vendor A 32 x4321" height="1" width="0.5" />
        <nodetype id="b43" model="Vendor B 43" height="2" width="1" />
      </nodetypes>

      <racks>
        <racksrow>
          <rack id="rack1-1" posx="0" posy="0">
            <nodes>
              <node id="cn001" type="m32x4321" posx="0" posy="3" />
              <node id="cn002" type="m32x4321" posx="0.5" posy="3" />
              <node id="cn003" type="m32x4321" posx="0" posy="4" />

              <nodeset id="cn[004-072]" type="m32x4321" />
            </nodes>
          </rack>

          <rack id="rack1-2" posx="1">
            <nodes>
              <node id="cn101" type="m32x4321" posx="0" posy="3" />
              <nodeset id="cn[102-121]" type="m32x4321" posy="5" />
            </nodes>
          </rack>
        </racksrow>

        <racksrow>
          <rack id="rack2-1" posx="0" posy="0">
            <nodes>
              <node id="cn201" type="m32x4321" posx="0" posy="3" />
              <node id="cn202" type="m32x4321" posx="0.5" posy="3" />
              <node id="cn203" type="m32x4321" posx="0" posy="4" />

              <nodeset id="cn[204-272]" type="m32x4321" />
            </nodes>
          </rack>

          <rack id="rack2-2" posx="1">
            <nodes>
              <node id="cn301" type="m32x4321" posx="0" posy="3" />
              <nodeset id="cn[302-321]" type="m32x4321" posy="5" />
            </nodes>
          </rack>
        </racksrow>
      </racks>
    </rackmap>


The root element of the XML file is ``<rackmap>``. This root element must contain
2 elements: ``<nodetypes>`` and ``<racks>``.

The ``<nodetypes>`` element contains the description of all types of nodes with
their models and sizes. Each type of node is described within a distinct
``<nodetype>`` element with a unique ID (ex: *m32x4321*). This ID will be later
used as a reference of type for nodes. Each node type must have a
``model`` attribute whose content is free text, a ``height`` and a ``width``
whose values must be floats in U unit. For example, a node with a width of 0.5
uses half of rack width. With a height of 2, a node will uses 2 U in rack height.

The organization of the different racks is designed by rows of racks, in order
to generate a 3D view of the room containing the racks composing the supercomputer.

The ``<racks>`` element contains the list of the rows of racks, corresponding to
the ``<racksrow>`` elements. Each ``<racksrow>`` element contains a list of
racks, each one being described in a distinct ``<rack>`` element. Each
rack element must have a unique ID which will be then used as rack name. A rack
must have a position, within ``posx`` and ``posy`` elements. These elements
must be integer, they represent the rack position within a grid with all racks.
If ``posx`` and ``posy`` attributes are skipped, then we assume they are equal
to ``0``. Two racks should not have the same positions.

A rack contains a set of nodes within ``<nodes>`` element as shown in
the previous example. As usual, ``posx`` and ``posy`` attributes are assumed
to be equal to ``0`` if missing. Besides, ``<nodeset>`` elements can have
an attribute ``draw`` which will tell in which direction Slurm-Web
will draw the nodes in the rack (``up`` or ``down``). When missing, it is
set to ``up``.

Once you have completely described all the racks and nodes composing your
supercomputer, you can check the file format by validating it against the
provided DTD file with the following command::

    xmllint --valid --noout /etc/slurm-web/racks.xml

User running the REST API
^^^^^^^^^^^^^^^^^^^^^^^^^

By default, the user running the REST API is set to ``www-data`` in
``/etc/apache2/conf-available/slurm-web-restapi.conf``. If some
resources in your Slurm cluster are accessible to only some of your
users, then Slurm-Web won't show them. Using a user with enough
credentials will fix the problem. Usually, setting the user to ``slurm``
(see *slurm.conf*) is enough.
