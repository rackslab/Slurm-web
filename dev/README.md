# Slurm-web Development Notes

## Setup Development Environment

Copy FireHPC configuration files on development server:

```console
$ scp -r firehpc firehpc.dev.rackslab.io:
```

Deploy emulated clusters on development server:

```console
$ ssh firehpc.dev.rackslab.io
$ firehpc deploy --db firehpc/db --cluster nova --os debian14 --custom firehpc/conf/nova
$ firehpc deploy --db firehpc/db --cluster zenith --os debian13 --custom firehpc/conf/zenith --users nova
$ firehpc deploy --db firehpc/db --cluster quark --os rocky8 --custom firehpc/conf/quark --users nova
$ firehpc deploy --db firehpc/db --cluster vortex --os rocky9 --custom firehpc/conf/vortex --users nova
$ firehpc deploy --db firehpc/db --cluster titan --os debian13 --custom firehpc/conf/titan --slurm-emulator --users nova
```

Create a Python virtual environment on your personal host and load it:

```console
$ python -m venv ~/.venvs/slurmweb  # or any other path of your choice
$ source ~/.venvs/slurmweb/bin/activate
```

Install `sshtunnel` (required by `dev/setup-dev-environment`) and Slurm-web
(with all its dependencies) in this virtual environment:

```console
$ pip install sshtunnel
$ pip install -e .
$ pip install -e .[dev]
$ pip install -e .[agent]
```

Install `socat` on your host:

```console
$ sudo apt install socat
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
$ firehpc status --cluster nova
```

## Slurmrestd tests

Remote `slurmrestd` instances can be accessed through local sockets in `/tmp/`
directory. For example:

```console
$ curl --silent --unix-socket /tmp/slurmrestd-nova.socket  \
  http://slurm/slurm/v0.0.41/jobs
```

## Remote Installation

To access Slurm-web deployed in containers, create SSH SOCKS5 proxy on
development server:

```console
$ ssh -D 2223 firehpc.dev.rackslab.io
```

Setup your browser to use this SOCKS5 proxy with remote DNS resolution.

Slurm-web can be accessed on all clusters, eg.:

* http://admin.titan/
* http://admin.nova/
* http://admin.vortex/

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

## OIDC with Keycloak

To test SSO authentication, install [Podman](https://podman.io/) and start the
development environment with Keycloak. The realm is federated to the first
cluster’s FireHPC LDAP tunnel and the gateway is preconfigured for OIDC:

```console
$ dev/setup-dev-environment --with-keycloak
```

Keycloak uses the first selected cluster’s LDAP port and DN (for example `nova`
on port **3390** when all clusters are enabled). The gateway is generated with
`authentication.method=oidc` and issuer `http://localhost:8080/realms/slurm`.

Sign in with a FireHPC user password (same accounts as LDAP login).

In the Keycloak Admin Console (**realm `slurm`**, not `master`):

- **Users** does not list everyone by default: use the search box (for example
  `*` or a username) to see the 10 federated users after sync.
- **Groups** are imported automatically at startup (`sync_ldap_groups`); they
  come from `ou=groups,dc=cluster,dc=<first-cluster>`.

## Build Packages

Build development packages with Fatbuildr:

For example, Debian _bookworm_ packages:

```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d bookworm --sources 6.1.0~dev1@.
```

Or RPM _el8_ packages:

```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d el8 --sources 6.1.0~dev1@.
```
