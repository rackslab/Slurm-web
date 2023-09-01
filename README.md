# Slurm-web

## Overview

Slurm-web is an open source web interface to [Slurm](https://slurm.schedmd.com/)
based HPC supercomputers. It provides intuitive views of current jobs and nodes
states. The organization of this project is being reworked significantly, see
the [next section](#plan-for-future) for more details.

## Install

Install build requirement for _python-ldap_ package:

```
$ sudo apt install libldap-dev libsasl2-dev
```

Install Python package from source:

```
$ pip install -e .
```

## Plan for future

After years of initial investments from [EDF](https://www.edf.fr/en) leading to
version 2.x, the project is now endorsed by [Rackslab](https://rackslab.io)
which becomes its new official maintainer.

The goal is to build the reference open source web interface for Slurm. A new
ambitious roadmap has been defined with long-term vision about this project,
starting with version 3.0 coming later this year.

In addition to the current feature set offered by Slurm-web, the following new
features are planned:

- Real time updates of the dashboard
- Accounting reports and views on past jobs
- Built-in metrics about jobs and scheduling
- Job submission and inspection
- Significantly improved Gantt view
- QOS, associations and reservations management
- Native RPM/deb packages and containers for easy deployment on most Linux distributions

The software architecture will be reviewed with modern established technologies
and based on reference slurmrestd API.

The [detailed roadmap](https://github.com/rackslab/slurm-web/discussions/235) is
published project discussions https://github.com/rackslab/slurm-web/discussions/235.
You are more than welcome to discuss about it there, ask questions and give
comments!

This `main` branch will quickly contain the next version 3.0 of Slurm-web under
development. The source code of the previous versions has been moved in `2.x`
branch.

## FAQ

### Does Rackslab maintain and support previous versions 2.x?

Our primary focus is to develop the feature release 3.0 with new modern and
solid foundations, for faster development of the envisioned features, more
reliably and flexibility. Unfortunately, we don't have the manpower to maintain
and support the previous 2.x releases. If any community member is willing to
participate on this, feel free to open pull requests, we will be more than happy
to merge your contributions!

### Where is the source code of the previous versions?

The source code of the previous version has been moved in `2.x` branch. This
`main` branch will contain the future version 3.0 under development.

### Will Slurm-web stay free software?

The licence of Slurm-web source code will not change, it will remain free
software (as in beer and as in speech) released under the terms of GPLv3.
Rackslab strongly believes in free software values and is deeply committed in
this regard.

### Will you charge for software licences?

No, you will still be able to install Slurm-web for free (as in beer). See our
[business model](#what-is-your-business-model) for more details.

### Will you release full entreprise versions vs limited community versions (aka. freemium model) ?

No, there will be only one fully-featured version of Slurm-web free for
everyone. See our [business model](#what-is-your-business-model) for more
details.

### What is your business model?

During the initial development phase, Rackslab is actively looking for
organizations willing to sponsor the development of Slurm-web. If your
organization has interest in this project and wants to participate in boosting
its development, please [contact us](https://rackslab.io/en/contact/)! Your
contribution among others is essential to build a solid and durable team around
this project.

Once Slurm-web reaches a solid state, Rackslab plans to offer professional
support and development service for organizations, with the goal to make the
project sustainable, very active and innovative.

### Where can I give comments or suggestions about the roadmap?

The [detailed roadmap](https://github.com/rackslab/slurm-web/discussions/235) is
published in [project discussions](https://github.com/rackslab/slurm-web/discussions).
Feel free to comment, ask questions or give suggestions there!

Any additional question? Feel free to ask in
[project discussions](https://github.com/rackslab/slurm-web/discussions)!
