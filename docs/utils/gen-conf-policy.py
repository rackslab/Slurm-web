#!/usr/bin/python3
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
  To generate partial of configuration reference documentation, run this
  command:

  $ python3 docs/utils/gen-conf-policy.py conf/vendor/policy.yml > \
    docs/modules/conf/partials/policy-actions.adoc
"""

import sys
from pathlib import Path

import jinja2
import yaml


def bases(obj):
    """Jinja2 Filter to list of parent classes names of an object."""
    return [_class.__name__ for _class in obj.__class__.__bases__]


def main():
    with open(sys.argv[1]) as fh:
        content = yaml.safe_load(fh)
    # Render template
    env = jinja2.Environment(loader=jinja2.FileSystemLoader(Path(__file__).parent))
    template = env.get_template("policy-actions.adoc.j2")
    output = template.render(
        actions=content["actions"],
    )
    print(output)


if __name__ == "__main__":
    main()
