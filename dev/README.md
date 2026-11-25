# Slurm-web Development Notes

## Setup Development Environment

Deploy emulated clusters with [FireHPC](https://github.com/rackslab/FireHPC)
from `dev/` directory of Slurm-web source tree:

```console
$ cd dev
$ firehpc deploy --db firehpc/db --cluster nova --os debian13 --custom firehpc/conf/nova
$ firehpc deploy --db firehpc/db --cluster zenith --os debian13 --custom firehpc/conf/zenith --users-from nova
$ firehpc deploy --db firehpc/db --cluster pulsar --os rocky10 --custom firehpc/conf/pulsar --users-from nova
$ firehpc deploy --db firehpc/db --cluster comet --os rocky9 --custom firehpc/conf/comet --users-from nova
$ firehpc deploy --db firehpc/db --cluster titan --os debian13 --custom firehpc/conf/titan --slurm-emulator --users-from nova
```

Each cluster covers a different set of Slurm versions, operating systems and
Slurm-web features:

| Cluster | Slurm (API) | OS | slurmrestd | Metrics | RacksDB | Highlights |
|---------|-------------|----|------------|---------|---------|------------|
| nova | 26.11 (0.0.46) | Debian 13 | JWT auto, TCP | ✓ | ✓ | typed + untyped GPUs, GPU shards, QOS preemption, gateway in subdirectory, extra user group policy |
| pulsar | 26.05 (0.0.45) | Rocky Linux 10 | JWT auto, Unix socket | ✓ | ✓ | mixed typed GPUs (H100 + H200), overlapping partitions |
| titan | 25.11 (0.0.44) | Debian 13 | JWT static, Unix socket | ✓ | ✓ | Slurm emulator with 500+ nodes, multiple racks, oversubscribed and drained partitions, no slurmdbd archive |
| zenith | 25.05 (0.0.43) | Debian 13 | JWT auto, TCP | ✓ | ✓ | untyped GPUs, GPU TRES limits in QOS, LDAP memberOf |
| comet | 24.11 (0.0.42) | Rocky Linux 9 | local, Unix socket | ✗ | ✗ | typed GPUs, optional features disabled |

On all clusters, the first member of _physic_ group coordinates _physic_
account and its sub-accounts, and the first member of _optic_ group coordinates
_optic_ account. On nova, these users get `jobs-view-coord` and
`jobs-view-past-coord` permissions with the extra user group policy.

> [!NOTE]
> No cluster is deployed on Debian 14 _« forky »_ because hpck.it does not
> provide Slurm packages for this distribution: PMIx version available in Debian
> repositories is incompatible with Slurm (checked in November 2026).
>
> - Debian _forky_ provides PMIx `7.0.0~rc1-3`, _trixie_ provides `5.0.7-1`
>   ([sources.debian.org](https://sources.debian.org/src/pmix/)).
> - Slurm configure script only detects PMIx major versions 2 to 6 and fails
>   with `unable to locate pmix installation` when `--with-pmix` is given with
>   another version
>   ([`auxdir/x_ac_pmix.m4` in tag `slurm-26-11-0-1`](https://github.com/SchedMD/slurm/blob/slurm-26-11-0-1/auxdir/x_ac_pmix.m4)).
> - Debian hit the same build failure
>   ([bug #1149781](https://bugs.debian.org/1149781)) and its own `slurm-wlm`
>   package is built without PMIx since `26.05.5-1` in _forky_
>   ([changelog](https://sources.debian.org/src/slurm-wlm/26.05.5-1/debian/changelog/)).

FireHPC creates 10 fake users accounts that can be used to login on Slurm-web.
The first one is admin on all clusters. Run this command to view users generated
on a cluster:

```
$ firehpc status --cluster nova
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

The script runs `firehpc` commands locally to get clusters users and groups,
reaches cluster nodes with `firehpc ssh` and reads Redis passwords and Slurm JWT
keys in local FireHPC clusters state directory
(`~/.local/state/firehpc/clusters/` or `$XDG_STATE_HOME/firehpc/clusters/`).

## Frontend

In a second shell, launch the Vite dev server:

```console
$ cd frontend && npm ci
$ npm run dev
```

Open http://localhost:5173/ — Slurm-web should be up-and-running with five
clusters.

The dev server proxies `/config.json`, `/logo`, and `/favicon.ico` to the gateway
on port 5012. By default, `setup-dev-environment` sets `SLURMWEB_DEV_UI_SKIP_COPY`
on the gateway so `frontend/public` is served in place (no copy to a temporary
directory). Runtime configuration (authentication flags, API base URL, etc.)
comes from the backend rather than the static file in `frontend/public/config.json`.

Pass `--with-ui /path` to `setup-dev-environment` to serve a built frontend tree
from the gateway with the normal asset copy pipeline (required for `dist/` and
placeholder base path replacement).

### Branding themes

Optional green and orange development themes apply custom colors, logos, and
favicon through the gateway. These placeholder assets under `dev/branding/` are
not intended for production use. Pass `--branding-theme` when starting the
development environment:

```console
$ dev/setup-dev-environment --branding-theme green
```

Use `--branding-theme orange` for the orange variant. When the flag is omitted,
default Slurm-web branding applies.

| Theme | Fake brand | Main color |
|-------|------------|------------|
| `green` | Verdant Grid | `#3d853d` |
| `orange` | Amber Stack | `#c97428` |

Each theme directory (`dev/branding/green/`, `dev/branding/orange/`) contains
`logo_login.png`, `logo_login_dark.png`, `logo_horizontal.png`,
`logo_horizontal_dark.png`, and `favicon.ico`. Placeholder images use a
transparent PNG background, the monocolor leaf in
[`dev/branding/leaves.svg`](branding/leaves.svg) (recolored per theme), and the
fake brand name. Login logos use `color_main` / `color_light` for the leaf;
horizontal logos use `color_dark` on `bg-slurmweb` / `color_main` and
`color_light` on dark-mode `gray-700`. Login ~140×160 px, horizontal ~280×64 px,
favicon ICO.

Brand names, `logo_alt` text, and theme colors live in
[`dev/lib/devenv/branding.py`](lib/devenv/branding.py). Regenerate assets after
editing that file or replacing `leaves.svg`:

```console
$ dev/generate-branding-assets
```

The generator reads theme colors from `branding.py` and requires ImageMagick
(`convert`).

With `--branding-theme`, the gateway copies `frontend/public` and theme assets
into a `ui/` subdirectory of the development session temporary directory
(`SLURMWEB_DEV_UI_ASSETS_DIR`).

## Slurmrestd tests

Remote `slurmrestd` instances can be accessed through local sockets in `/tmp/`
directory. For example:

```console
$ curl --silent --unix-socket /tmp/slurmrestd-nova.socket  \
  http://slurm/slurm/v0.0.41/jobs
```

## Remote Installation

To access Slurm-web deployed in containers, create SSH SOCKS5 proxy on the host
running the clusters containers:

```console
$ ssh -D 2223 <host>
```

Setup your browser to use this SOCKS5 proxy with remote DNS resolution.

Slurm-web can be accessed on all clusters, eg.:

* http://admin.titan/
* http://admin.nova/slurm-web/
* http://admin.zenith/
* http://admin.pulsar/
* http://admin.comet/

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

For example, Debian _trixie_ packages:

```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d trixie --sources 7.1.0~dev1@.
```

Or RPM _el8_ packages:

```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d el8 --sources 7.1.0~dev1@.
```
