# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

"""Metrics of resources usage by individual jobs, queried in Prometheus (or
compatible) database and exported by third-party exporters."""

import typing as t
import asyncio
import logging
import math

from rfl.core.asyncio import asyncio_run

from ..errors import SlurmwebConfigurationError, SlurmwebMetricsDBError

if t.TYPE_CHECKING:
    from .db import SlurmwebMetricsDB

logger = logging.getLogger(__name__)

# Ordered list of supported job metrics:
# - cpu: CPU usage in percent of allocated CPUs
# - memory: memory usage in bytes
# - memory_allocated: memory allocated to the job in bytes
# - gpu: GPU usage in percent, averaged over allocated GPUs
# - gpu_memory: GPU memory usage in percent, averaged over allocated GPUs
JOB_METRICS = ("cpu", "memory", "memory_allocated", "gpu", "gpu_memory")

# Maximum number of points per series in job metrics.
JOB_METRICS_MAX_POINTS = 300
# Minimal step between points in seconds, about the scrape interval of exporters.
JOB_METRICS_MIN_STEP = 15
# Minimal range window in seconds for rate() function, so it covers at least a
# few samples with common scrape intervals.
JOB_METRICS_MIN_WINDOW = 60


def _escape(value: str) -> str:
    """Escape label value in PromQL selector."""
    return str(value).replace("\\", "\\\\").replace('"', '\\"')


class SlurmwebJobMetricsExporter:
    """Abstract class of exporters which provides metrics of jobs resources usage.
    Child classes must define the set of provided metrics and implement promql()
    method."""

    name: str = None
    provides: t.Tuple[str, ...] = ()

    def promql(self, metric: str, job: int, window: int) -> str:
        """Return PromQL expression which evaluates to a single series of the given
        metric for the given job. Window is the duration in seconds of range vectors
        for functions over time."""
        raise NotImplementedError


class SlurmwebJobMetricsExporterCEEMS(SlurmwebJobMetricsExporter):
    """Jobs metrics exported by CEEMS exporter (https://ceems-dev.github.io/ceems/).

    CPU and memory metrics are computed with the metrics of compute units provided by
    CEEMS exporter. GPU metrics are provided by CEEMS recording rules, they are
    available for all GPU vendors supported by CEEMS, provided these rules are loaded
    in Prometheus."""

    name = "ceems"
    provides = JOB_METRICS
    # Names of CEEMS recording rules for GPU metrics per compute unit
    GPU_USAGE_RULE = "uuid:ceems_gpu_usage:ratio"
    GPU_MEMORY_USAGE_RULE = "uuid:ceems_gpu_memory_usage:ratio"

    def __init__(self, prometheus_job: t.Optional[str] = None):
        self.prometheus_job = prometheus_job

    def _selector(self, job: int, scrape_job: bool = True) -> str:
        labels = [f'uuid="{_escape(job)}"', 'manager="slurm"']
        if scrape_job and self.prometheus_job:
            labels.append(f'job="{_escape(self.prometheus_job)}"')
        return "{" + ",".join(labels) + "}"

    def promql(self, metric: str, job: int, window: int) -> str:
        selector = self._selector(job)
        if metric == "cpu":
            return (
                f"sum(rate(ceems_compute_unit_cpu_user_seconds_total{selector}"
                f"[{window}s]) + rate(ceems_compute_unit_cpu_system_seconds_total"
                f"{selector}[{window}s])) / sum(ceems_compute_unit_cpus{selector}) "
                "* 100"
            )
        if metric == "memory":
            return f"sum(ceems_compute_unit_memory_used_bytes{selector})"
        if metric == "memory_allocated":
            return f"sum(ceems_compute_unit_memory_total_bytes{selector})"
        # Labels of series produced by recording rules depend on the rules, only
        # filter on compute unit identifier.
        selector = "{" + f'uuid="{_escape(job)}"' + "}"
        if metric == "gpu":
            return f"avg({self.GPU_USAGE_RULE}{selector})"
        if metric == "gpu_memory":
            return f"avg({self.GPU_MEMORY_USAGE_RULE}{selector})"
        raise SlurmwebMetricsDBError(f"Unsupported job metric {metric}")


EXPORTERS = {
    SlurmwebJobMetricsExporterCEEMS.name: SlurmwebJobMetricsExporterCEEMS,
}


def build_exporters(settings) -> t.List[SlurmwebJobMetricsExporter]:
    """Return the list of jobs metrics exporters instanciated with metrics
    settings."""
    exporters = []
    for name in settings.job_exporters or []:
        if name not in EXPORTERS:
            raise SlurmwebConfigurationError(f"Unsupported job metrics exporter {name}")
        if name == SlurmwebJobMetricsExporterCEEMS.name:
            exporters.append(SlurmwebJobMetricsExporterCEEMS(settings.ceems_job))
        else:
            exporters.append(EXPORTERS[name]())
    return exporters


class SlurmwebJobMetrics:
    """Query metrics of resources usage by individual jobs in metrics database with
    the PromQL expressions provided by the exporters."""

    def __init__(
        self, db: "SlurmwebMetricsDB", exporters: t.List[SlurmwebJobMetricsExporter]
    ):
        self.db = db
        # Select the exporter of every metric, the first exporter declared wins.
        self.exporters: t.Dict[str, SlurmwebJobMetricsExporter] = {}
        for exporter in exporters:
            for metric in exporter.provides:
                self.exporters.setdefault(metric, exporter)

    def available(self) -> t.List[str]:
        """Return the list of available metrics, ordered as JOB_METRICS."""
        return [metric for metric in JOB_METRICS if metric in self.exporters]

    @staticmethod
    def resolution(start: int, end: int) -> t.Tuple[int, int]:
        """Return step and window in seconds for a range query between start and end
        timestamps."""
        step = max(
            JOB_METRICS_MIN_STEP, math.ceil((end - start) / JOB_METRICS_MAX_POINTS)
        )
        window = max(JOB_METRICS_MIN_WINDOW, step)
        return step, window

    def request(self, job: int, start: int, end: int) -> t.Dict[str, t.List]:
        """Return dict of available metrics for the given job between start and end
        timestamps in seconds. Values are lists of [timestamp in ms, value] pairs,
        possibly empty when no data is available for the job."""
        metrics = self.available()
        step, window = self.resolution(start, end)
        # Round boundaries on step so successive requests select the same points.
        start = start - start % step
        results = asyncio_run(self._requests(metrics, job, start, end, step, window))
        return dict(zip(metrics, results))

    async def _requests(self, metrics, job, start, end, step, window):
        return await asyncio.gather(
            *[
                self._request(metric, job, start, end, step, window)
                for metric in metrics
            ]
        )

    async def _request(self, metric, job, start, end, step, window):
        promql = self.exporters[metric].promql(metric, job, window)
        series = await self.db.query_range(promql, start, end, step)
        if not series:
            return []
        if len(series) > 1:
            logger.warning(
                "Unexpected %d series for job %s metric %s, keeping the first one",
                len(series),
                job,
                metric,
            )
        try:
            return [
                # Convert timestamps from seconds to milliseconds and values from
                # strings to floats.
                [int(timestamp * 1000), float(value)]
                for timestamp, value in series[0]["values"]
                if not math.isnan(float(value))
            ]
        except (KeyError, TypeError, ValueError) as err:
            raise SlurmwebMetricsDBError(
                f"Unexpected result on job {job} metric {metric} query"
            ) from err
