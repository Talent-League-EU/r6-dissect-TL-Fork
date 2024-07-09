#!/bin/bash

# Define the source and destination buckets
SOURCE_BUCKET="s3://tlmrisserver/MOSS Files/"
DEST_BUCKET="s3://tlmrisserver/LTS/MOSS Files/"

# Get current date in seconds since the epoch
current_date=$(date +%s)

# Get a list of objects in the source bucket with their last modified time
aws s3api list-objects --bucket tlmrisserver --prefix "MOSS Files/" --output json | jq -r '.Contents[] | select(.LastModified | fromdateiso8601 < ('$current_date' - 604800)) | .Key' | while read -r key; do
    echo "Processing $key..."

    # Define new key by replacing the prefix
    new_key=$(echo $key | sed 's@MOSS Files/@LTS/MOSS Files/@g')

    # Copy the file to the new location with the new storage class
    aws s3 cp "$SOURCE_BUCKET$key" "$DEST_BUCKET$new_key" --storage-class GLACIER_INSTANT_RETRIEVAL

    # Remove the original file if the copy was successful
    if [ $? -eq 0 ]; then
        aws s3 rm "$SOURCE_BUCKET$key"
        echo "Moved $key to $new_key with Glacier Instant Retrieval storage class."
    else
        echo "Failed to move $key to Glacier Instant Retrieval storage class."
    fi
done
