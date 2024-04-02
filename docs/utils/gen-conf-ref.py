#!/usr/bin/python3
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
  To generate partial of configuration reference documentation, run this
  command:

  $ python3 docs/utils/gen-conf-ref.py conf/vendor/gateway.yml > \
    docs/modules/admin/partials/conf-gateway.adoc
"""
import sys
from pathlib import Path

import jinja2

from rfl.settings.definition import SettingsDefinition, SettingsDefinitionLoaderYaml

def bases(obj):
    """Jinja2 Filter to list of parent classes names of an object."""
    return [_class.__name__ for _class in obj.__class__.__bases__]


def main():

    definition = SettingsDefinition(SettingsDefinitionLoaderYaml(path=sys.argv[1]))
    # Render template
    env = jinja2.Environment(loader=jinja2.FileSystemLoader(Path(__file__).parent))
    template = env.get_template("conf-ref.adoc.j2")
    output = template.render(
        definition=definition,
    )
    print(output)


if __name__ == "__main__":
    main()
