#!/bin/bash
set -e

mkdir -p /var/run/munge
chown munge: /var/{log,lib,run}/munge
exec /sbin/setuser munge /usr/sbin/munged 
