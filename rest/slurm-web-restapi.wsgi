import logging, sys
logging.basicConfig(stream=sys.stderr)
sys.path.insert(0, '/usr/share/slurm-web/restapi')
from slurmrestapi import app as application
