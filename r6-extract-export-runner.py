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

@app.route('/api/runner', methods=['POST'])
def runner():
    # Define the buckets
    intermediate_data_bucket = "s3://tlmrisserver/intermediate-data/"
    post_exported_data_bucket = "s3://tlmrisserver/post-exported-data/"

    # Get list of files from both buckets, filenames without extensions
    intermediate_files = list_s3_files(intermediate_data_bucket)
    post_exported_files = list_s3_files(post_exported_data_bucket)

    # Convert lists to sets for set operation
    intermediate_files_set = set(intermediate_files)
    post_exported_files_set = set(post_exported_files)

    # Find files present in intermediate-data but not in post-exported-data
    unique_files = intermediate_files_set - post_exported_files_set

    # Print paths of unique files (with a placeholder for the original file extension)
    for file in unique_files:
        print(f"{intermediate_data_bucket}{file}")

    return "Comparison complete!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
