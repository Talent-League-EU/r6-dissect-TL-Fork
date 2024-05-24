import os
import csv
import subprocess
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from flask import Flask, request, jsonify

app = Flask(__name__)

# Read the JSON content from a file
SERVICE_ACCOUNT_FILE = '/app/service-account-file.json'
credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)

# Initialize the Sheets and Drive API
sheets_service = build('sheets', 'v4', credentials=credentials)
drive_service = build('drive', 'v3', credentials=credentials)

BUCKET_NAME = "tlmrisserver"
EXPORT_FILE = "exported-to-sheets-sheets.txt"
POST_EXPORT_BUCKET = "tlmrisserver/post-exported-data/"

def run_aws_cli_command(command):
    try:
        result = subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        return result.stdout.decode('utf-8').strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        return None

def download_file_from_s3(bucket, key, local_path):
    command = f"aws s3 cp s3://{bucket}/{key} {local_path}"
    return run_aws_cli_command(command)

def upload_file_to_s3(bucket, key, local_path):
    command = f"aws s3 cp {local_path} s3://{bucket}/{key}"
    return run_aws_cli_command(command)

def list_files_in_s3_bucket(bucket, prefix=""):
    command = f"aws s3 ls s3://{bucket}/{prefix} --recursive"
    output = run_aws_cli_command(command)
    if output:
        return [line.split()[-1] for line in output.split('\n') if line]
    else:
        return []

def create_google_sheet_from_files(file_paths):
    spreadsheet = {
        'properties': {
            'title': 'Exported Data'
        }
    }
    spreadsheet = sheets_service.spreadsheets().create(body=spreadsheet,
                                                       fields='spreadsheetId').execute()
    spreadsheet_id = spreadsheet.get('spreadsheetId')

    for file_path in file_paths:
        sheet_name = os.path.splitext(os.path.basename(file_path))[0]
        with open(file_path, 'r') as file:
            reader = csv.reader(file)
            values = [row for row in reader]
            body = {
                'values': values
            }
            # Add a new sheet with the name of the file (without extension)
            sheets_service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={
                "requests": [
                    {
                        "addSheet": {
                            "properties": {
                                "title": sheet_name
                            }
                        }
                    }
                ]
            }).execute()

            # Write values to the newly created sheet
            sheets_service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=f'{sheet_name}!A1',
                valueInputOption='RAW',
                body=body
            ).execute()

    # Make the spreadsheet public
    drive_service.permissions().create(
        fileId=spreadsheet_id,
        body={'type': 'anyone', 'role': 'reader'}
    ).execute()

    return f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"

@app.route('/api/runner', methods=['POST'])
def runner():
    # Step 1: Download the export file from S3
    download_file_from_s3(BUCKET_NAME, EXPORT_FILE, EXPORT_FILE)

    # Step 2: Read the contents of the export file
    try:
        with open(EXPORT_FILE, 'r') as file:
            exported_files = file.read().splitlines()
    except FileNotFoundError:
        exported_files = []

    print(f"Exported Files: {exported_files}")

    # Step 3: List the contents of the post-exported-data bucket
    post_export_files = list_files_in_s3_bucket(BUCKET_NAME, POST_EXPORT_BUCKET)
    print(f"Post Export Files: {post_export_files}")

    # Step 4: Download files not in the export file
    new_files = [file for file in post_export_files if file not in exported_files]
    print(f"New Files: {new_files}")

    local_file_paths = []
    for file in new_files:
        local_path = os.path.basename(file)
        download_file_from_s3(BUCKET_NAME, file, local_path)
        local_file_paths.append(local_path)

    # Step 5: Export the new files to a Google Sheet
    if local_file_paths:
        sheet_link = create_google_sheet_from_files(local_file_paths)

        # Step 6: Update the export file and upload it back to S3
        with open(EXPORT_FILE, 'a') as file:
            for file_name in new_files:
                file.write(f"{file_name},{sheet_link}\n")

        upload_file_to_s3(BUCKET_NAME, EXPORT_FILE, EXPORT_FILE)
    else:
        sheet_link = "No new files to process."

    # Step 7: Clean up local files
    for file_path in local_file_paths:
        os.remove(file_path)

    return jsonify({'status': 'success', 'sheet_link': sheet_link})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
