from flask import Flask, jsonify
import subprocess

app = Flask(__name__)

def list_s3_files(bucket):
    # Using the AWS CLI to list files in the bucket
    cmd = f"aws s3 ls {bucket} --recursive"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error listing S3 bucket contents: {result.stderr}")
        return []
    lines = result.stdout.split('\n')
    # Extract file names without their paths or extensions
    files = [line.split()[-1].split('/')[-1].rsplit('.', 1)[0] for line in lines if line.strip()]
    return files

@app.route('/api/runner', methods=['POST'])
def runner():
    # Define the buckets
    intermediate_data_bucket = "s3://tlmrisserver/intermediate-data/"
    post_exported_data_bucket = "s3://tlmrisserver/post-exported-data/"

    # Print start message
    print("Starting the comparison of S3 bucket files.")

    # Get list of files from both buckets
    intermediate_files = list_s3_files(intermediate_data_bucket)
    post_exported_files = list_s3_files(post_exported_data_bucket)

    # Convert lists to sets for set operation
    intermediate_files_set = set(intermediate_files)
    post_exported_files_set = set(post_exported_files)

    # Find files present in intermediate-data but not in post-exported-data
    unique_files = intermediate_files_set - post_exported_files_set

    # Print and collect unique files for response
    response_files = []
    for file in unique_files:
        file_path = f"{intermediate_data_bucket}{file}"
        print(f"Unique file in intermediate-data: {file_path}")
        response_files.append(file_path)

    # Return the list of unique files in the response
    return jsonify(response_files)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
