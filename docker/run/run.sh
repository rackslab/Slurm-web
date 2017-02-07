#!/bin/bash

# EDIT: indicate where your configuration files will be stored
data=$PWD

docker run -d -v $data/conf:/etc/slurm-web \
              -v /etc/munge:/etc/munge \
              -v /etc/slurm:/etc/slurm-llnl \
              -v /etc/passwd:/etc/passwd \
              -v /etc/group:/etc/group \
              -p 8081:80 \
              slurm-web
