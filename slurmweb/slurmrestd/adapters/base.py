# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t


class BaseAdapter:
    """Base class for API version adapters.

    Each adapter converts data from one API version to the next version.
    Methods should be named after the endpoint key (e.g., adapt_jobs, adapt_nodes).
    """

    def adapt(self, component: str, key: str, data: t.Any) -> t.Any:
        """Adapt data for the given key using the appropriate method.

        Args:
            component: The API component (e.g., "slurm", "slurmdb")
            key: The response key (e.g., "jobs", "nodes", "partitions")
            data: The data under that key to adapt)

        Returns:
            Adapted data
        """
        method_name = f"adapt_{component}_{key}"
        adapter = getattr(self, method_name, None)
        if adapter is not None:
            return adapter(data)

    def adapt_slurm_jobs(self, data: t.Any) -> t.Any:
        """Adapt jobs data from slurmctld."""
        return data

    def adapt_slurmdb_jobs(self, data: t.Any) -> t.Any:
        """Adapt jobs data from slurmdbd"""
        return data

    def adapt_slurm_nodes(self, data: t.Any) -> t.Any:
        """Adapt nodes data."""
        return data

    def adapt_slurm_partitions(self, data: t.Any) -> t.Any:
        """Adapt partitions data."""
        return data

    def adapt_slurmdb_accounts(self, data: t.Any) -> t.Any:
        """Adapt accounts data."""
        return data

    def adapt_slurmdb_associations(self, data: t.Any) -> t.Any:
        """Adapt associations data."""
        return data

    def adapt_slurm_reservations(self, data: t.Any) -> t.Any:
        """Adapt reservations data."""
        return data

    def adapt_slurmdb_qos(self, data: t.Any) -> t.Any:
        """Adapt qos data."""
        return data

    def adapt_slurm_ping(self, data: t.Any) -> t.Any:
        """Adapt ping data."""
        return data
