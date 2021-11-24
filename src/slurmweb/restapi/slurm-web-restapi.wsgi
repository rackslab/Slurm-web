import logging, sys
logging.basicConfig(stream=sys.stderr)
from slurmweb.restapi.slurmrestapi import app as application

