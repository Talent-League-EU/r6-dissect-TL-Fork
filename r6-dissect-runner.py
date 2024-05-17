from flask import Flask, jsonify
import boto3
import os

app = Flask(__name__)

# Initialize the S3 client using inherited AWS CLI configuration
s3_client = boto3.client('s3')

@app.route('/api/runner', methods=['POST'])
def runner():
    bucket_name = 'tlmrisserver'
    pre_exported_prefix = 'pre-exported-data/'
    intermediate_prefix = 'intermediate-data/'
    download_path = './data/pre-exported-data/'

    # Ensure the download path exists
    if not os.path.exists(download_path):
        os.makedirs(download_path)

    try:
        # List folders in pre-exported-data
        pre_exported_response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=pre_exported_prefix, Delimiter='/')
        pre_exported_folders = {content['Prefix'].rstrip('/').split('/')[-1] for content in pre_exported_response.get('CommonPrefixes', [])}

        # List files in intermediate-data
        intermediate_response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=intermediate_prefix)
        intermediate_files = {content['Key'].split('/')[-1].rsplit('.', 1)[0] for content in intermediate_response.get('Contents', [])}

        # Find folders in pre-exported-data that do not have corresponding files in intermediate-data
        unmatched_folders = [folder for folder in pre_exported_folders if folder not in intermediate_files]

        # Download unmatched folders
        for folder in unmatched_folders:
            folder_prefix = f"{pre_exported_prefix}{folder}/"
            folder_contents = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=folder_prefix)
            for content in folder_contents.get('Contents', []):
                key = content['Key']
                download_file_path = os.path.join(download_path, key[len(pre_exported_prefix):])
                os.makedirs(os.path.dirname(download_file_path), exist_ok=True)
                s3_client.download_file(bucket_name, key, download_file_path)

        return jsonify({"downloaded_folders": unmatched_folders}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
