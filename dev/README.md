# Setup Development Environment

Deploy emulated clusters on remote host:

```console
$ firehpc deploy --db racksdb.yml --cluster tiny --os debian12 --custom tiny
$ firehpc deploy --db racksdb.yml --cluster emulator --os debian12 --custom emulator --slurm-emulator --users tiny
```

Create all required SSH tunnels:

```console
$ dev/setup-dev-environment
```

Launch frontend in a third shell:

```console
$ cd frontend && npm run dev
```

Testing QOS can be created, for example:

```
$ sacctmgr create qos fulltest Flags=OverPartQOS GrpTRES=node=50 GrpJobs=60 \
  MaxTRES=cpu=48 MaxWall=8:00:00 MaxTRESPU=cpu=10,mem=5 \
  MaxTRESPA=cpu=15,mem=10 MaxJobsPU=10 MaxSubmitJobsPU=20 MaxSubmitJobsPA=30 \
  Priority=100
```
