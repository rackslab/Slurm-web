# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

try:
    from importlib import metadata
except ImportError:
    import importlib_metadata as metadata


def get_version():
    return metadata.version("slurm-web")
