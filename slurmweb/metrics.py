# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import logging

import prometheus_client
import prometheus_client.core

from .errors import SlurmwebCacheError
from .slurmrestd.errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdInternalError,
)

logger = logging.getLogger(__name__)


class SlurmWebMetricsCollector(prometheus_client.registry.Collector):
    def __init__(self, slurmrestd):
        self.slurmrestd = slurmrestd
        self.register()

    def describe(self):
        """This method is defined to avoid the registry call collect() and request
        slurmrestd eventually when the collector is registered to get a description of
        all metrics exported by this collector. Just return an empty list to avoid
        redundant code with _collect() method."""
        return []

    def register(self):
        prometheus_client.REGISTRY.register(self)
        # Unregister all standard built-ins collectors.
        for collector in (
            prometheus_client.GC_COLLECTOR,
            prometheus_client.PLATFORM_COLLECTOR,
            prometheus_client.PROCESS_COLLECTOR,
        ):
            try:
                prometheus_client.REGISTRY.unregister(collector)
            except KeyError:
                # Ignore if collector has not been found in registry
                pass

    def unregister(self):
        prometheus_client.REGISTRY.unregister(self)

    def _collect(self):
        (nodes_states, cores_states, nodes_total, cores_total) = (
            self.slurmrestd.nodes_cores_states()
        )
        c = prometheus_client.core.GaugeMetricFamily(
            "slurm_nodes", "Slurm nodes", labels=["state"]
        )
        for status, value in nodes_states.items():
            c.add_metric([status], value)
        yield c
        yield prometheus_client.metrics_core.GaugeMetricFamily(
            "slurm_nodes_total", "Slurm total number of nodes", value=nodes_total
        )
        c = prometheus_client.core.GaugeMetricFamily(
            "slurm_cores", "Slurm cores", labels=["state"]
        )
        for status, value in cores_states.items():
            c.add_metric([status], value)
        yield c
        yield prometheus_client.metrics_core.GaugeMetricFamily(
            "slurm_cores_total", "Slurm total number of cores", value=cores_total
        )

        (jobs_states, jobs_total) = self.slurmrestd.jobs_states()
        c = prometheus_client.core.GaugeMetricFamily(
            "slurm_jobs", "Slurm jobs", labels=["state"]
        )
        for status, value in jobs_states.items():
            c.add_metric([status], value)
        yield c
        yield prometheus_client.core.GaugeMetricFamily(
            "slurm_jobs_total", "Slurm total number of jobs", value=jobs_total
        )

    def collect(self):
        try:
            yield from self._collect()
        except SlurmrestdNotFoundError as err:
            logger.error(
                "Unable to collect metrics due to URL not found on slurmrestd: %s", err
            )
        except SlurmrestdInvalidResponseError as err:
            logger.error(
                "Unable to collect metrics due to slurmrestd invalid response: %s", err
            )
        except SlurmrestConnectionError as err:
            logger.error(
                "Unable to collect metrics due to slurmrestd connection error: %s", err
            )
        except SlurmrestdInternalError as err:
            logger.error(
                "Unable to collect metrics due to slurmrestd internal error: %s (%s)",
                err.description,
                err.source,
            )
        except SlurmwebCacheError as err:
            logger.error("Unable to collect metrics due to cache error: %s", err)

def make_wsgi_app():
    return prometheus_client.make_wsgi_app()
