#!/bin/sh

mkdir -p generated-doc/modules/misc/partials
# Replace issue with hyperlinks to github issues
sed 's/\(#\([0-9]\+\)\)/[#\2](https:\/\/github.com\/rackslab\/Slurm-web\/issues\/\2\)/g' < CHANGELOG.md | pandoc --from markdown --to asciidoctor --output generated-doc/modules/misc/partials/CHANGELOG.adoc
