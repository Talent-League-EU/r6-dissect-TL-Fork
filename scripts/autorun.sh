#!/bin/bash

# First POST request to port 5000
curl -X POST http://www.talent-league.org/process/api/runner

# Sleep for 10 minutes (600 seconds)
sleep 600

# Second POST request to port 5002
curl -X POST http://www.talent-league.org/extract/api/runner

# Sleep for 1 minutes (60 seconds)
sleep 60

# Third POST request to port 5003
curl -X POST http://www.talent-league.org/export/api/runner
