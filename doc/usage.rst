Dashboard usage
===============

To start using the web dashboard, first connect to this URL with a web browser
(where *server* is the network hostname of the server hosting the dashboard):
http://server/slurm/

You should then arrive to the homepage of the web dashboard. It is the Jobs view
which looks like the following screenshot:

.. figure:: img/screenshot_jobs_view.*

In the top right corner of this web page, there is a menu with 4 entries:

.. figure:: img/screenshot_menu.*

With these links, you can navigate to 4 differents views:

* the Jobs view
* the Racks view
* the JobsMap view
* the Reservations view

All these views are described in details in the following sections.

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

There are 8 columns:

#. The Slurm job ID
#. The name of the user with his/her login on the system between parenthesis
#. The list of nodes that are allocated for this job, if any. If the job is
   pending or blocked for any reason, the field could be empty since Slurm may
   have not decided yet on which nodes this job will run.
#. The current state of the job
#. If the job is pending or blocked, the reason which explains why the job is
   in this state. If the job is running or completing, this field is empty.
#. The start time of the job if the job is pending and Slurm is able to forecast
   its start time in the future.
#. The QOS of the job
#. The partition of the job

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
