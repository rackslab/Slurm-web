REST API reference
==================

Version
-------

GET method to return the name and the version of the API.
Useful to test if the API is up and running.

Login
-----

POST method to authenticate users on the REST API.
Used when the authentication feature is enabled.
Give the ``username`` and the ``password`` as JSON parameters.
It returns an authentication token.


Each method below is a GET method with JSON data. In case when
authentication is enabled, it must contain a token sent as
``Authorization`` request header.

Cluster
-------

Global settings about the supercomputer:

``/cluster``

Racks
-----

List of racks and nodes, with their sizes and positions:

``/racks``

Nodes
-----

List of all nodes:

``/nodes``

Jobs
----

List of all jobs:

``/jobs``

One job details:

``/job/<id>``

Partitions
----------

List of all partitions:

``/partitions``

QOS
---

List of all QOS:

``/qos``

Reservations
------------

List of all reservations:

``/reservations``

Topology
--------

Topology defined on this cluster:

``/topology``

Sinfo
-----

Return an ``sinfo`` style cluster status:

``/sinfo``

Jobs by node
------------

Jobs running on the given node:

``/jobs-by-node/<node_id>``

Jobs by node ids
----------------

Jobs running on the given nodes, ordered by nodes:

``/jobs-by-node-ids``

Give the list of node ids as a JSON array in the ``nodes`` parameter.

Jobs by nodes
-------------

Jobs running, ordered by nodes :

``/jobs-by-nodes``

Jobs by QOS
-----------

Jobs running, ordered by qos :

``/jobs-by-qos``

Convert Nodeset
---------------

Convert a set of node formatted in host list to an array of nodes :

``/nodeset``

Give the nodeset by post method with a stringify JSON where the nodeset is
passed to the key ``nodeset`` as a string
(i.e. ``"{"nodeset":"pocn[234-240,257]"}"``).
No authentication needed for this route.
