Software architecture
=====================

The following diagrams illustrates the global software architecture of
Slurm-web:

.. figure:: img/architecture_slurm-web.*

   Global software architecture

The web dashboard is accessible to users through a web brower. This dashboard
is built with RequireJS, jQuery and Handlebars.

The HTML file only contains a few empty elements. The content of these elements
is entirely controlled by the JS scripts. These scripts makes the browser
download additional data through the API.

Please refer to :doc:`how to contribute or add a page </contribute>` section
for more informations about how is built the dashboard.

The configuration files of the dashboard are supplied by a tiny WSGI Flask app.
This one sends files from the directory ``/etc/slurm-web/dashboard/`` to the
dashboard.

Please refer to :doc:`installation guide </installation>` section to know how
to configure the dashboard.

The backend REST API actually get all live data from Slurm workload manager
through PySLURM, a Python library and a binding of Slurm libraries. These
libraries connect to ``slurmctld`` daemon of Slurm, generally running on a
remote dedicated server on the supercomputer, to get latest runtime data. All
the data from the REST API are delivered in standard JSON format. This way, it
is easy to interact with this API with most programming language.

Please refer to :doc:`Reference API </api>` for complete REST API reference
documentation.

Once the browser has downloaded all relevant JSON data from the API, the JS
script browse the data structures to represent them in a graphical way with
nice HTML components.

Please refer to :doc:`usage guide </usage>` for complete GUI usage instructions
for users.

The dashboard relies on the backend API, but the reverse is not true. The
backend API can be used standalone to serve data for other external
applications.
