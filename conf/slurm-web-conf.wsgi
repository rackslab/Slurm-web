import logging, sys
logging.basicConfig(stream=sys.stderr)
sys.path.insert(0, '/usr/share/slurm-web/conf-server')
from slurmwebconf import app as application
