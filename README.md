slurm-web
=========

Goal
----

slurm-web provides a web dashboard to a Slurm HPC supercomputer with view of
job queue and the current state of the compute nodes.

The software is composed of 2 parts:

- a backend REST API in JSON format
- a frontend web dashboard

The backend is developped in Python using the Flash web framework. It is
designed to run as WSGI application on a HTTP server such as Apache2.

The dashboard frontend is developed in HTML and Javascript, using Bootstrap
and JQuery libraries.

Licence
-------

slurm-web is distributed under the terms of the GNU General Public License
version 3.
