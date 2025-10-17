#!/usr/bin/python3
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

"""
  To generate partial of configuration reference documentation, run this
  command:

  $ python3 docs/utils/gen-conf-ex.py conf/vendor/gateway.yml > \
    docs/modules/admin/examples/conf-gateway.ini
"""

import sys
from pathlib import Path

import jinja2

from rfl.settings.definition import SettingsDefinition, SettingsDefinitionLoaderYaml


def main():
    definition = SettingsDefinition(SettingsDefinitionLoaderYaml(path=sys.argv[1]))
    # Render template
    env = jinja2.Environment(loader=jinja2.FileSystemLoader(Path(__file__).parent))
    template = env.get_template("conf-ex.ini.j2")
    output = template.render(
        definition=definition,
    )
    print(output)


if __name__ == "__main__":
    main()
