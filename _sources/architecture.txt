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


Authentication mechanism
------------------------

Slurm-web owns its authentication system based on an LDAP server. This feature
can be enabled by turning the value of the parameter ``authentication`` in the
``config`` section of the file ``restapi.conf`` to ``enable``.

The authentication is performed on the LDAP server from the login page of the
dashboard through the Rest API backend.

.. figure:: img/authentication_slurm-web.*

   Communication with LDAP server

The user gives his credentials on the login page. They are passed to the Rest
API. The backend retrieves user's information on the LDAP server and
determinates his role according to his login or his group and the settings
about roles in the file ``restapi.conf``. These informations are serialized
in a token passed to the dashboard.

This generated token is stored in the dashboard and sent each time the
dashboard requests the Rest API.

The ``ldap`` section of the file ``restapi.conf`` allow you to configure your
LDAP server to be used with Slurm-web:

.. code-block:: python

  ...

  [ldap]
  uri = ldap://admin:389
  base = dc=cluster,dc=local
  ugroup = people
  expiration = 1296000

  ...

You can set in this section:

- *uri* : the protocol, the host and the port of your LDAP server
- *base* : the database where users have to be searched
- *ugroup* : the LDAP group which the users are members
- *expiration* : the TTL of the generated token

Slurm-web also takes into account of the Private data parameter from
`Slurm <https://slurm.schedmd.com/slurm.conf.html>`_. So far, only the Jobs
View and Reservations View in Slurm-web are concerned by Private Data
parameter. This feature prevents regular users and guests from seeing others'
jobs or reservations if defined.
