# Slurm-web Development Notes

## Setup Development Environment

Deploy emulated clusters on remote host:

```console
$ firehpc deploy --db db --cluster tiny --os debian12 --custom tiny
$ firehpc deploy --db db --cluster emulator --os debian12 --custom emulator --slurm-emulator --users tiny
$ firehpc deploy --db db --cluster pocket --os rocky8 --custom pocket --users tiny
```

Install additional dependencies in virtual environment:

```console
$ pip install sshtunnel
```

Create all required SSH tunnels:

```console
$ dev/setup-dev-environment
```

Launch frontend in a third shell:

```console
$ cd frontend && npm run dev
```

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

Access to Slurm-web deployed in containers:

```console
$ ssh -D 2223 firehpc.dev
```

http://admin.tiny

## Build Packages


```console
$ fatbuildrctl --uri https://build.rackslab.io/devs build -a slurm-web -d bookworm --sources 3.0.0~dev1@.
```
