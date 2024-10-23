# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t
import ipaddress
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

if t.TYPE_CHECKING:
    from rfl.settings import RuntimeSettings

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


def get_client_ipaddress(environ):
    """Return IP address of the client as found in request environment."""
    # To properly handle setup in which agent is behind a reverse proxy, first try to
    # use X-Forwarded-For header if defined. In this header, the original client IP
    # address the leftmost address in a comma (and optionally whitespaces) separated
    # list of addresses, followed by the addresses of the intermediate proxies. If
    # X-Forwarded-For is not defined, use REMOTE_ADDR environment key as fallback.
    try:
        ip = environ["HTTP_X_FORWARDED_FOR"].split(",")[0].strip()
    except KeyError:
        ip = environ["REMOTE_ADDR"]
    return ipaddress.ip_address(ip)


def make_wsgi_app(settings: "RuntimeSettings"):
    prometheus_app = prometheus_client.make_wsgi_app()

    def slurmweb_metrics_app(environ, start_response):

        # Check if client IP address is member of restricted networks list. If
        # not, send response with HTTP/403 status code.
        ip = get_client_ipaddress(environ)
        permitted = False
        for restricted_network in settings.restrict:
            if ip in restricted_network:
                permitted = True
                break
        if not permitted:
            status = "403 Forbidden"
            headers = [("", "")]
            output = f"IP address {ip} not authorized to request metrics"
            logger.warning(output)
            start_response(status, headers)
            return [(output + "\n").encode()]

        # Client IP address is authorized, return metrics.
        logger.debug("IP address %s authorized to request metrics", ip)
        return prometheus_app(environ, start_response)

    return slurmweb_metrics_app
