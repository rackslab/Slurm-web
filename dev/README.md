# Slurm-web Development Notes

## Setup Development Environment

Copy FireHPC configuration files on development server:

```console
$ scp -r firehpc firehpc.dev.rackslab.io:
```

Deploy emulated clusters on development server:

```console
$ ssh firehpc.dev.rackslab.io
$ firehpc deploy --db firehpc/db --cluster tiny --os debian12 --custom firehpc/conf/tiny
$ firehpc deploy --db firehpc/db --cluster emulator --os debian12 --custom firehpc/conf/emulator --slurm-emulator --users tiny
$ firehpc deploy --db firehpc/db --cluster pocket --os rocky8 --custom firehpc/conf/pocket --users tiny
```

Create a Python virtual environment on your personal host and load it:

```console
$ python -m venv ~/.venvs/slurmweb  # or any other path of your choice
$ source ~/.venvs/slurmweb/bin/activate
```

Install `sshtunnel` (required by `dev/setup-dev-environment` and Slurm-web
(with all its dependencies) in this virtual environment:

```console
$ pip install sshtunnel
$ pip install -e .
```

A Git clone of RacksDB close to Slurm-web source tree is required:

```
$ cd .. && git clone git@github.com:rackslab/RacksDB.git
```

Create all required SSH tunnels and launch backend applications (_agent_ and
_gateway_):

```console
$ dev/setup-dev-environment
```

By default, the script connects on development server with local user name. It
is possible to use an alternate remote user name with `LOGNAME` environment
variable:

```console
$ LOGNAME=jdoe dev/setup-dev-environment
```

In a second shell, launch frontend application:

```console
$ cd frontend && npm run dev
```

Slurm-web should be up-and-running with three clusters on:
http://localhost:5173/

FireHPC creates 10 fake users accounts that can be used to login on Slurm-web.
The first one is admin on all clusters. Run this command to view users generated
on a cluster:

```
$ firehpc status --cluster tiny
```

## Remote Installation

To access Slurm-web deployed in containers, create SSH SOCKS5 proxy on
development server:

```console
$ ssh -D 2223 firehpc.dev.rackslab.io
```

Setup your browser to use this SOCKS5 proxy with remote DNS resolution.

Slurm-web can be accessed on all clusters:

* http://admin.emulator/
* http://admin.tiny/
* http://admin.pocket/

## Additional tests

Testing QOS and reservations can be created, for example:

```console
$ sacctmgr create qos fulltest Flags=OverPartQOS GrpTRES=node=50 GrpJobs=60 \
  MaxTRES=cpu=48 MaxWall=8:00:00 MaxTRESPU=cpu=10,mem=5 \
  MaxTRESPA=cpu=15,mem=10 MaxJobsPU=10 MaxSubmitJobsPU=20 MaxSubmitJobsPA=30 \
  Priority=100
$ scontrol create reservation Reservation=training \
  StartTime=2024-03-20T10:00:00 \
  EndTime=2024-03-22T17:00:00 \
  Users=jwalls,nlee Accounts=biology Partition=normal \
  Flags=ANY_NODES,FLEX,IGNORE_JOBS
```

Node states can also be changed:

```console
$ scontrol update nodename=cn051 state=drain reason="ECC memory error"
$ scontrol update nodename=cn084 state=down reason="CPU dead"
```

## Build Packages

Build development packages with Fatbuildr:

For example, Debian _bookworm_ packages:

```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d bookworm --sources 3.0.0~dev1@.
```

Or RPM _el8_ packages:

```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d el8 --sources 3.0.0~dev1@.
```
