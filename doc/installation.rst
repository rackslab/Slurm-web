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
on an additional file located under the poath ``/etc/slurm-web/racks.xml``.

This file must contain the complete description of your racks and nodes in XML
format. Here is an example of file:

.. code-block:: xml

    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE rackmap SYSTEM "/usr/share/slurm-web/restapi/schema/dtd/racks.dtd">
    <rackmap>

      <nodetypes>
        <nodetype id="m32x4321">
          <model>Vendor A 32 x4321</model>
          <height>1</height>
          <width>0.5</width>
        </nodetype>
        <nodetype id="b43">
          <model>Vendor B 43</model>
          <height>2</height>
          <width>1</width>
        </nodetype>
      </nodetypes>

      <racks>

        <rack id="rack1">
          <posx>0</posx>
          <posy>0</posy>
          <nodes>
            <node id="cn001">
              <type>m32x4321</type>
              <posx>0</posx>
              <posy>3</posy>
            </node>
            <node id="cn002">
              <type>m32x4321</type>
              <posx>0.5</posx>
              <posy>3</posy>
            </node>
            <node id="cn003">
              <type>m32x4321</type>
              <posx>0</posx>
              <posy>4</posy>
            </node>
            <nodeset id="A1-down">
              <range>cn[004-072]</range>
              <type>m32x4321</type>
            </nodeset>
          </nodes>
        </rack>

        <rack id="rack2">
          <posx>1</posx>
          <posy>0</posy>
          <nodes>
            <node id="cn100">
              <type>m32x4321</type>
              <posx>0</posx>
              <posy>3</posy>
            </node>
            <node id="cn101">
              <type>m32x4321</type>
              <posx>0</posx>
              <posy>5</posy>
            </node>
            <nodeset id="A1-down">
              <range>cn[002-021]</range>
              <type>m32x4321</type>
            </nodeset>
          </nodes>
        </rack>

      </racks>
    </rackmap>


The root element of the XML file ``<rackmap>``. This root element must contain
2 elements: ``<nodetypes>`` and ``<racks>``.

The ``<nodetypes>`` element contains the description of all types of nodes with
their models and sizes. Each type of node is described within a distinct
``<nodetype>`` element with a unique ID (ex: *m32x4321*). This ID will be later
used as a reference of type for nodes. Each node type must have a ``<model>``
whose content is free text, a ``<height>`` and a ``<width>`` whose values must
be floats in U unit. For example, a node with a width of 0.5 uses half of rack
width. With a height of 2, a node will uses 2 U in rack height.

The ``<racks>`` element contains the list of all racks composing the
supercomputer, each one being described in a distinct ``<rack>`` element. Each
rack element must have a unique ID which will be then used as rack name. A rack
must have a position, within ``<posx>`` and ``<posy>`` elements. These elements
must be integer, they represent the rack position within a grid with all racks.
Two racks cannot have the same positions.

A rack contains a set of nodes within ``<nodes>`` element. To avoid useless
explicit declaration of all nodes, and considering that most racks are composed
with homogenous series of nodes, you can limit the declaration to only the first
*row* of nodes plus the first node of the second row. Then, Slurm-web will be
able to compute automatically the positions of the nodes in the following
nodeset. Here is an example from *rack2* in the previous complete example:

.. code-block:: xml

    <node id="cn100">
      <type>m32x4321</type>
      <posx>0</posx>
      <posy>3</posy>
    </node>
    <node id="cn101">
      <type>m32x4321</type>
      <posx>0</posx>
      <posy>5</posy>
    </node>
    <nodeset id="A1-down">
      <range>cn[002-021]</range>
      <type>m32x4321</type>
    </nodeset>

The first row is composed of *cn100*. The first node of the second row is
*cn101*. With the description, Slurm-web is able to calculate that *cn002*
position is *x=0,y=7* then *cn003* is *x=0,y=9*, up to *cn021*.

Here is another example from *rack1* in the previous complete example:

.. code-block:: xml

    <node id="cn001">
      <type>m32x4321</type>
      <posx>0</posx>
      <posy>3</posy>
    </node>
    <node id="cn002">
      <type>m32x4321</type>
      <posx>0.5</posx>
      <posy>3</posy>
    </node>
    <node id="cn003">
      <type>m32x4321</type>
      <posx>0</posx>
      <posy>4</posy>
    </node>
    <nodeset id="A1-down">
      <range>cn[004-072]</range>
      <type>m32x4321</type>
    </nodeset>

The first row is composed of *cn001* and *cn002* since they have the same
``<posy>`` at 3. The first node of the second row is *cn003*. Then, Slurm-web
is able to calculate that position of *cn004* is *x=0.5,y=4*, *cn005* is
*x=0,y=5*, etc.

Once you have completely described all the racks and nodes composing your
supercomputer, you can check the file format by validating it against the
provided DTD file with the following command::

    xmllint --valid --noout /etc/slurm-web/racks.xml
