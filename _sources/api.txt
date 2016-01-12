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


Each method below is a POST method with JSON datas.
In case when authentication is enabled, it must contain a ``token`` parameter
where the token sent by the login must be set.

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
