# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from pathlib import Path

DEV_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = DEV_ROOT.parent
CONF_DIR = DEV_ROOT / "conf"
ASSETS = REPO_ROOT / "tests" / "assets"
REALM_IMPORT_FILENAME = "slurm-realm.json"
