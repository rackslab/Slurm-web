# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from pathlib import Path
import logging

import markdown


logger = logging.getLogger(__name__)


def render_html(path: Path) -> str:
    """Return rendered HTML string of the markdown file pointed by path."""
    with open(path) as fh:
        text = fh.read()
    return markdown.markdown(text)
