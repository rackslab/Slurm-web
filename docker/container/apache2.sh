#!/bin/bash
set -e

exec /usr/sbin/apache2 -D FOREGROUND
