#!/bin/sh

# Navigate to the specified directory
cd /etc/TLMRIS

# Check if the directory change was successful
if [ $? -eq 0 ]; then
    # Execute the go build command with sudo
    sudo git clone https://github.com/redraskal/r6-dissect.git
    cd r6-dissect
    sudo go build
    cd ..
    sudo mv r6-dissect/r6-dissect /dissect-runner/
    sudo rm -rf r6-dissect
else
    echo "Failed to change directory to /etc/TLMRIS. The directory may not exist."
fi

cd /etc/TLMRIS/scripts
bash dc-deploy.sh
