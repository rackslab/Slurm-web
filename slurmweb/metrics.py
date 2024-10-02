# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import prometheus_client

from prometheus_client import core


class SlurmWebCollector(prometheus_client.registry.Collector):
    def __init__(self, slurmrestd):
        self.slurmrestd = slurmrestd

    def collect(self):
        nodes_states = self.slurmrestd.nodes_states()
        c = core.GaugeMetricFamily("slurm_nodes", "Slurm nodes", labels=["state"])
        for status, value in nodes_states.items():
            c.add_metric([status], value)
        yield c

        jobs_states = self.slurmrestd.jobs_states()
        c = core.GaugeMetricFamily("slurm_jobs", "Slurm jobs", labels=["state"])
        for status, value in jobs_states.items():
            c.add_metric([status], value)
        yield c


def register_collector(slurmrestd):
    prometheus_client.REGISTRY.register(SlurmWebCollector(slurmrestd))
    prometheus_client.REGISTRY.unregister(prometheus_client.GC_COLLECTOR)
    prometheus_client.REGISTRY.unregister(prometheus_client.PLATFORM_COLLECTOR)
    prometheus_client.REGISTRY.unregister(prometheus_client.PROCESS_COLLECTOR)
    return prometheus_client.make_wsgi_app()

#curl --data-urlencode 'query=slurm_nodes{job="slurm"}[30m]' http://localhost:9090/api/v1/query | jq
