#!/bin/sh

# Check the status of the Docker containers
containers_up=$(sudo docker-compose ps | grep "Up")

if [ -z "$containers_up" ]; then
    echo "Containers are not running. Starting them with 'up -d' command."
    sudo docker-compose build
    sudo docker-compose up -d
else
    echo "Containers are running. Restarting them with 'restart' command."
    sudo docker-compose down -v
    sudo docker-compose build
    sudo docker-compose up -d
fi


cd /etc/TLMRIS/scripts
chmod +x autorun.sh


