Slurm-web
=========

**CAUTION:** Please note that the serie Slurm-web versions _2.x_ is not
maintained anymore. A new roadmap has been defined with
[future plans](https://github.com/rackslab/slurm-web#plan-for-future),
available in `main` branch.

Overview
--------

Slurm-web provides both a web dashboard and a REST API to a Slurm HPC
supercomputer with views of current jobs and nodes states.

The backend REST API is developped in Python using the Flask web framework. It
is designed to run as WSGI application on a HTTP server such as Apache2. It
relies on PySLURM library to get data from Slurm workload manager. It provides
data in JSON format through a simple REST API.

The dashboard frontend is developed in HTML and Javascript, using common
de facto standard JS libraries such as jQuery and Bootstrap.

Documentation
-------------

The documentation is distributed with Slurm-web source code in the `doc/`
directory.

It is also available online on Slurm-web website:
http://rackslab.github.io/slurm-web/

It contains full details about Slurm-web architecture, installation and usage
guide.

Licence
-------

Slurm-web is distributed under the terms of the GNU General Public License
version 3.

Authors
-------

Slurm-web development has been sponsored and mainly driven by
[EDF](http://edf.fr) company (Electricité De France) with great work from the
[derniercri](http://derniercri.io) developers crew.

Feedback from the community is important! Other users problems are among our
main concerns. Please feel free to contact us for bugs and features, or simply
tell us what you think about this project!

Support
-------

For bug reports and questions, please open issues on GitHub project:
http://github.com/rackslab/slurm-web/issues

For any other things, please [contact Rackslab](https://rackslab.io/en/contact/).
