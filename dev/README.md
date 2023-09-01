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
