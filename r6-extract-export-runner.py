from flask import Flask
import subprocess
import json

app = Flask(__name__)

def list_s3_files(bucket):
    # Using the AWS CLI to list files in the bucket
    cmd = f"aws s3 ls {bucket} --recursive"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print("Error listing S3 bucket contents:", result.stderr)
        return []
    lines = result.stdout.split('\n')
    files = [line.split()[-1] for line in lines if line.strip()]
    # Extract just the file names without extensions
    return {file.rsplit('.', 1)[0] for file in files}

@app.route('/api/runner', methods=['GET'])
def runner():
    # Define the buckets
    intermediate_data_bucket = "s3://tlmrisserver/intermediate-data/"
    post_exported_data_bucket = "s3://tlmrisserver/post-exported-data/"

    # Get list of files from both buckets
    intermediate_files = list_s3_files(intermediate_data_bucket)
    post_exported_files = list_s3_files(post_exported_data_bucket)

    # Compare files and find those only in the intermediate-data bucket
    unique_files = intermediate_files - post_exported_files

    # Print paths of unique files in intermediate-data
    for file in unique_files:
        print(f"{intermediate_data_bucket}{file}")

    return "Comparison complete!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
