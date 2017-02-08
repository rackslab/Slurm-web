Dashboard usage
===============

To start using the web dashboard, first connect to this URL with a web browser
(where *server* is the network hostname of the server hosting the dashboard):
http://server/slurm/

You should then arrive to the homepage of the web dashboard. It is the Jobs view
which looks like the following screenshot:

.. figure:: img/screenshot_jobs_view.*

In the top right corner of this web page, there is a menu with 10 entries:

.. figure:: img/screenshot_menu.*

With these links, you can navigate to 9 differents views:

* the Jobs view
* the Racks view
* the JobsMap view
* the 3D view (not available in IE)
* the Partitions view
* the QOS view
* the Reservations view
* the Gantt view
* the Topology view

All these views are described in details in the following sections.

The last entry concerns the user's authentication. It is not displayed if this
feature is disabled.

Jobs view
---------

The Jobs view gives an overview of all Slurm jobs currently running or pending
on the supercomputer.

At the top of this view, there are 5 pie charts. The biggest one on the left
represents the part of cores allocated to jobs among the total number of cores
available on the supercomputer.

Then, from left to right, the 4 other pie charts represent:

#. The distribution of allocated nodes among partitions
#. The distribution of allocated cores among partitions
#. The distribution of allocated nodes among QOS
#. The distribution of allocated cores among QOS

Note that the last 4 charts only consider currently allocated resources. So, if
there is only one running job on only one core, all these charts will show one
partition and one QOS at 100%, even though the vast majority of the resources
are idle. These diagrams become really relevant when you have multiple QOS and
partitions and there are many running jobs.

Then, after the charts, there is a table with one job per row. This is the list
of all jobs running or pending on the system.

There are 9 columns:

#. The Slurm job ID
#. The name of the user with his/her login on the system between parenthesis
#. The number of cores and nodes that are allocated for this job, if any. If the
   job is pending or blocked for any reason, the field could be empty since Slurm
   may have not decided yet on which nodes this job will run.
#. The current state of the job
#. If the job is pending or blocked, the reason which explains why the job is
   in this state. If the job is running or completing, this field is empty.
#. The start time of the job if the job is pending and Slurm is able to forecast
   its start time in the future.
#. The QOS of the job
#. The partition of the job
#. The Workload Characterization Key (WCKey) of the job
#. An optional customizable column if using the ``JOBS_XTRA_COL`` feature.
   Please refer to the :doc:`/installation` for more details.

You can filter the displayed jobs by using the input above the table. All the
shown jobs then satisfy all the filters given in the input. There is an
autocompletion mechanism on all partitions, QoS, WCKey, Name, User, Nodes, State,
Start Time and End Time existing in the table. The filters field work in a
substractive way.

There is a special use case to filter by Start and End Time. You must begin the
filter by choosing the field Start Time with the word "start" or End Time with
the word "end". Followed by a comparison operator "<" or ">". At the end you
will add the time format you want.

The options are :
  - now (the current time), must be used alone
  - [number]y (years)
  - [number]M (months)
  - [number]w (weeks)
  - [number]d (days)
  - [number]h (hours)
  - [number]m (minutes)
  - [number]s (seconds)

The options must be separated with ":"

The time format can be a positive or negative value "+" (default) or "-"

Examples :

"start < 1h:10m" same as "start < 0y:0M:0w:0d:1h:10m:0s" same as
"start < +1h:10m"

The example show all the jobs who started 1 hour and 10 minutes ago from now.

Another special use case is the Nodes filter. You can filter by a single node or a complete nodeset.

The single node filter show the job who use this node. A complete nodeset show the jobs who use
one of the node in common.

Examples :

  pocn240 show the job who use the node 240

  pocn[240-242, 260] show all the jobs who use the node 240, 241, 242 or 260

To get more details about one specific job, you can click anywhere on the job
row:

.. figure:: img/screenshot_job_open_details.*

Once clicked, an information box shows up with all details:

.. figure:: img/screenshot_job_details.*

The job ID is reminded in the title of this information box. Then, the fields
are:

#. The name of the user, with his/her login between parenthesis
#. The current state of the job
#. If the job is pending or blocked, the reason which explains why the job is
   in this state. If the job is running or completing, this field is empty.
#. The list of nodes that are allocated for this job, if any. If the job is
   pending or blocked for any reason, the field could be empty since Slurm may
   have not decided yet on which nodes this job will run. If the node list is
   not empty, the number of nodes is given between parenthesis.
#. The number of requested (and eventually allocated) cores for the job
#. The Slurm account used for this job
#. The QOS of the job
#. The partition of the job
#. The Workload Characterization Key (WCKey) of the job
#. The exclusive flag whose value is *yes* or *no*, as requested by users at the
   job submission. If *yes*, the job get exclusive to resources on allocated
   nodes. That means that no other job could run on these nodes at the same time
   even if this job does not allocate all cores of these nodes.
#. The command run in the batch step of the job. Generally, for batch jobs, this
   is a submission script.
#. The start time of the job. If the job is pending or blocked, Slurm is not
   always able to forecast this start time in the future so this field may be
   empty.
#. The elligible time which is the moment when this job was accepted in the
   scheduling queue of Slurm.
#. The end time of the job. It could be empty if the job is not started yet or
   the walltime is not set.
#. The time limit of the job, in minutes. It may be empty if infinite.

You can close this box by clicking on the *Close* button:

.. figure:: img/screenshot_job_close_details.*

Racks view
----------

The Racks view shows the current status of all nodes in the supercomputer:

.. figure:: img/screenshot_racks_view.*

The nodes are drawn in their corresponding racks, at their appropriate position
and scaled size. Each node is a rectangle in the rack. The name of the node is
written on the side of the rack.

The small LED in the upper left corner of the node gives its general status. If
the LED is green, the node is available to run jobs. If it is yellow, the node
is alive but disable in Slurm (*drained* or *draining*). Finally, if the LED is
red, the node is down according to Slurm.

Then, the color of node rectangle depends upon current job allocations. If all
the cores of the node are allocated, the color is dark blue. If only a subset
of all cores of the node are allocated, the color is light blue. If the node is
totally idle, the color stays grey.

A small legendary in a frame at the top right corner gives a recap of these
information.

JobsMap view
------------

The JobMaps view gives more or less the same information then the Racks view
with more details about cores allocation:

.. figure:: img/screenshot_jobsmap_view.*

All available CPU cores are drawn within the nodes, each core is a small
rectangle. If a core is allocated to a job, the core is colored with a color
depending on the job ID. All cores allocated to a job have the same color.
However, note that due to limited number of colors, when there are a lot of
running jobs, 2 cores allocated to 2 different jobs could potentially have the
same color.

Again, a small legendary in a frame at the top right corner gives a recap of
these information.

To get more details about the activity on one specific node or core, you can
click on it.

Once clicked, an information box shows up with the same details about jobs, as
in the box about job of the Jobs view.

3D View
_______

This view shows a representation in three dimensions of the HPC, according to
how it is defined in the ``racks.xml`` file.

As on the JobsMap view, it gives the activity on each core, showing the color
of the current processed job.

You can choose between 3 ways of visualization:

* *Camera orbit*:
  Change its angle by clicking and moving the mouse. Zoom in with a scroll up,
  out with a scroll down.

* *Camera first person*:
  Move the camera with the arrow keys. Change its angle by pointing the wished
  direction with the mouse.

* *Pacman*:
  A view with an automatically moving between racks.


Partitions view
---------------

The Partitions view give the list of configured partitions in the supercomputer:

.. figure:: img/screenshot_partitions.*

The table has the following columns:

#. Name
#. Default (Yes or No)
#. Nodes
#. Number of Nodes
#. Number of CPUs

QOS view
--------

The QOS view gives the list of configured QOSes in the supercomputer:

.. figure:: img/screenshot_qos.*

The table has the following columns:

#. Name
#. Priority
#. Walltime
#. Grp CPUs mins
#. Grp CPUs min in Running state
#. Grp CPUs
#. Grp Memory
#. Grp Nodes
#. Grp Submitted Jobs
#. Grp Walltime
#. Max CPU mins per Job
#. Max CPU mins for Running jobs
#. Max CPUs per Job
#. Max CPUs per User
#. Max Jobs per User
#. Max Nodes per Job
#. Max Nodes per User
#. Max Submitted Jobs per User
#. Preemption Mode
#. Preemption Grace Time

Empty columns are hidden.

Reservations view
-----------------

The Reservations view gives an overview of current and future reservations set
on the supercomputer:

.. figure:: img/screenshot_resv_view.*

The table is composed of one row per reservation and 5 columns:

#. The reservation name
#. The list of users allowed to submit jobs in this reservation
#. The list of nodes allocated to this reservation
#. The start time of this reservation
#. The end time of this reservation

Gantt view
----------

The Gantt view aims to show jobs running, completed or pending, divided up
according to either nodes or qos. These jobs are represented according to an
horizontal axis of time. Running jobs are drawn in blue, completed ones in
yellow, and pending ones in green. By clicking on a job you can display its
informations in a modal.

.. figure:: img/screenshot_ganntt_view_nodes.*

.. figure:: img/screenshot_ganntt_view_qos.*

Topology view
-------------

The Topology view shows the organization of slurm nodes according to how it is
defined in the configuration file ```topology.conf``` from Slurm. This
representation use a force graph. Nodes are grouped by nodesets. You can click
on a nodeset to see the connected nodes. When you click on a node, a modal is
opened and shows details about the current job running on the selected node.

.. figure:: img/screenshot_topology_view.*
