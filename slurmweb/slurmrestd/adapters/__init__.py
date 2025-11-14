# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import logging

from .base import BaseAdapter

# Import adapter classes after BaseAdapter is defined to avoid circular imports
from .v0_0_41 import AdapterV0_0_41
from .v0_0_42 import AdapterV0_0_42
from .v0_0_43 import AdapterV0_0_43

logger = logging.getLogger(__name__)

# Hard-coded registry of adapters
_ADAPTERS = {
    "0.0.41": AdapterV0_0_41,
    "0.0.42": AdapterV0_0_42,
    "0.0.43": AdapterV0_0_43,
}


def build_adaptation_chain(
    from_version: str, to_version: str, supported_versions: t.List[str]
) -> t.List[BaseAdapter]:
    """Build a chain of adapters from one version to another.

    Args:
        from_version: Starting version (e.g., "0.0.41")
        to_version: Target version (e.g., "0.0.44")
        supported_versions: List of supported versions in descending order

    Returns:
        List of adapter instances in order
    """
    # Build version chain from supported versions in ascending order
    # (reverse the descending order list to get ascending)
    VERSION_CHAIN = list(reversed(supported_versions))

    try:
        from_idx = VERSION_CHAIN.index(from_version)
        to_idx = VERSION_CHAIN.index(to_version)
    except ValueError:
        logger.warning(
            "Version %s or %s not in version chain, skipping adaptation",
            from_version,
            to_version,
        )
        return []

    if from_idx >= to_idx:
        return []

    chain = []
    for i in range(from_idx, to_idx):
        version = VERSION_CHAIN[i]
        adapter_class = _ADAPTERS.get(version)
        if adapter_class:
            chain.append(adapter_class())
        else:
            logger.debug("No adapter found for version %s", version)

    return chain
