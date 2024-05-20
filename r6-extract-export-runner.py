from flask import Flask
import subprocess
import os

app = Flask(__name__)

def download_s3_file(bucket, file, local_path):
    # Full path to the file on S3
    s3_file_path = f"{bucket}{file}"
    print(f"Downloading {s3_file_path} to {local_path}")
    # Local path to save the file
    local_file_path = os.path.join(local_path, file)
    # AWS CLI command to download the file
    cmd = f"aws s3 cp {s3_file_path} {local_file_path}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Failed to download {file}: {result.stderr}")
    else:
        print(f"Successfully downloaded {file} to {local_file_path}")

def list_s3_files(bucket):
    # Using the AWS CLI to list files in the bucket
    cmd = f"aws s3 ls {bucket} --recursive"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error listing S3 bucket contents: {result.stderr}")
        return []
    lines = result.stdout.split('\n')
    # Extract file names without their paths or extensions
    files = [line.split()[-1] for line in lines if line.strip()]
    return files

@app.route('/api/runner', methods=['POST'])
def runner():
    # Ensure the /data directory exists
    data_directory = "/data"
    os.makedirs(data_directory, exist_ok=True)

    # Define the buckets
    intermediate_data_bucket = "s3://tlmrisserver/intermediate-data/"
    post_exported_data_bucket = "s3://tlmrisserver/post-exported-data/"

    # Get list of files from both buckets
    intermediate_files = list_s3_files(intermediate_data_bucket)
    post_exported_files = list_s3_files(post_exported_data_bucket)

    print(f"Intermediate files: {intermediate_files}")
    print(f"Post-exported files: {post_exported_files}")

    # Convert lists to sets for set operation
    intermediate_files_set = set(intermediate_files)
    post_exported_files_set = set(post_exported_files)

    # Find files present in intermediate-data but not in post-exported-data
    unique_files = intermediate_files_set - post_exported_files_set

    print(f"Unique files: {unique_files}")

    # Download unique files
    for file in unique_files:
        download_s3_file(intermediate_data_bucket, file, data_directory)

    return "File download complete!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
