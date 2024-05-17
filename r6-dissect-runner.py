from flask import Flask, jsonify
import boto3

app = Flask(__name__)

# Initialize the S3 client using inherited AWS CLI configuration
s3_client = boto3.client('s3')

@app.route('/api/runner', methods=['POST'])
def runner():
    bucket_name = 'tlmrisserver'
    prefix = 'intermediate-data/'

    try:
        response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
        if 'Contents' in response:
            files = [content['Key'] for content in response['Contents']]
            return jsonify(files), 200
        else:
            return jsonify({"message": "No files found."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
