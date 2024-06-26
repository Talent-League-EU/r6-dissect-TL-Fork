#!/bin/bash

# Function to send POST request and wait for a successful response
send_post_request() {
    url=$1
    while true; do
        response=$(curl -s -o response.txt -w "%{http_code}" -X POST $url)
        if [ $response -eq 200 ]; then
            cat response.txt
            break
        else
            echo "Request to $url failed with status $response. Response: $(cat response.txt)"
            sleep 5
        fi
    done
    rm response.txt
}

# First POST request to port 5000
send_post_request http://www.talent-league.org/process/api/runner

# Second POST request to port 5002
send_post_request http://www.talent-league.org/extract/api/runner

# Third POST request to port 5003
send_post_request http://www.talent-league.org/export/api/runner
