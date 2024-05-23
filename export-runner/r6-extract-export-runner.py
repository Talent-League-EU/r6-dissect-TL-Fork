from flask import Flask
import subprocess
import os
import json
import csv
import logging
from openpyxl import Workbook

# Set up logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

def download_s3_file(bucket, file, local_path):
    s3_file_path = os.path.join(bucket, file)
    print(f"Downloading {s3_file_path} to {local_path}")
    logging.info(f"Downloading {s3_file_path} to {local_path}")
    local_file_name = os.path.basename(file)
    local_file_path = os.path.join(local_path, local_file_name)
    cmd = f"aws s3 cp {s3_file_path} {local_file_path}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Failed to download {file}: {result.stderr}")
        logging.error(f"Failed to download {file}: {result.stderr}")
    else:
        print(f"Successfully downloaded {file} to {local_file_path}")
        logging.info(f"Successfully downloaded {file} to {local_file_path}")
        create_csv_from_json(local_file_path)

def upload_file_to_s3(local_file_path, bucket, s3_file_path):
    """Uploads a file to an S3 bucket using AWS CLI."""
    cmd = f"aws s3 cp {local_file_path} s3://{bucket}/{s3_file_path}"
    try:
        subprocess.run(cmd, check=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Successfully uploaded {local_file_path} to s3://{bucket}/{s3_file_path}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to upload file to S3: {e.stderr.decode()}")

def create_csv_from_json(json_file_path):
    # Read the JSON file
    with open(json_file_path, 'r') as file:
        data = json.load(file)
    
    # Define the CSV file name
    csv_file_name = os.path.splitext(json_file_path)[0] + '.csv'
    
    # Define the CSV headers
    headers = [
        "Players", "Rounds", "Kills", "Deaths", "Entry Kills", "Entry Deaths", 
        "HS%", "1vX", "Refrags", "Plants", "Defuses", "Attack Main", "Defense Main", "KOST"
    ]
    
    # List of operators considered as attackers
    attack_operators = [
        "Sledge", "Thatcher", "Ash", "Thermite", "Twitch", "Montagne", "Glaz",
        "Fuze", "Blitz", "IQ", "Buck", "Blackbeard", "Capitao", "Hibana", "Jackal",
        "Ying", "Zofia", "Dokkaebi", "Lion", "Finka", "Maverick", "Nomad", "Gridlock",
        "Nokk", "Amaru", "Kali", "Iana", "Ace", "Zero", "Flores", "Osa", "Sens", "Grim",
        "Brava", "Ram", "Deimos"
    ]

    # List of operators considered as defenders
    defense_operators = [
        "Smoke", "Mute", "Castle", "Pulse", "Doc", "Rook", "Jager", "Bandit",
        "Frost", "Valkyrie", "Caveira", "Echo", "Mira", "Lesion", "Ela", "Vigil",
        "Maestro", "Alibi", "Clash", "Kaid", "Mozzie", "Warden", "Goyo", "Wamai",
        "Oryx", "Melusi", "Aruni", "Thunderbird", "Thorn", "Azami", "Solace"
    ]

    # Extract players data
    player_stats = {}
    operator_counts = {}
    for round_data in data['rounds']:
        for player in round_data['players']:
            username = player['username']
            operator_name = player['operator']['name']
            if username not in operator_counts:
                operator_counts[username] = {"attack": Counter(), "defense": Counter()}
            if operator_name in attack_operators:
                operator_counts[username]["attack"][operator_name] += 1
            elif operator_name in defense_operators:
                operator_counts[username]["defense"][operator_name] += 1
        
        for stat in round_data['stats']:
            username = stat['username']
            if username not in player_stats:
                player_stats[username] = {
                    "Rounds": 0, "Kills": 0, "Deaths": 0, "Entry Kills": 0, "Entry Deaths": 0, 
                    "HS%": 0, "1vX": 0, "Refrags": 0, "Plants": 0, "Defuses": 0, 
                    "Attack Main": "", "Defense Main": "", "KOST": 0
                }
            player_stats[username]["Rounds"] += 1
            player_stats[username]["Kills"] += stat.get("kills", 0)
            player_stats[username]["Deaths"] += stat.get("died", 0)
            if "1vX" in stat:
                player_stats[username]["1vX"] += 1

        # Extract entry kills, entry deaths, refrags, plants, and defuses
        first_kill = None
        previous_kill = None
        kill_targets = set()
        for feedback in round_data['matchFeedback']:
            if feedback['type']['name'] == "Kill":
                killer = feedback['username']
                victim = feedback['target']
                time_in_seconds = feedback['timeInSeconds']
                kill_targets.add(victim)

                # Track entry kills and deaths
                if first_kill is None:
                    if killer in player_stats:
                        player_stats[killer]["Entry Kills"] += 1
                    if victim in player_stats:
                        player_stats[victim]["Entry Deaths"] += 1
                    first_kill = (killer, victim, time_in_seconds)

                # Track refrags (trades)
                if previous_kill:
                    prev_killer, prev_time = previous_kill
                    if victim == prev_killer and (prev_time - time_in_seconds) <= 3:
                        if killer in player_stats:
                            player_stats[killer]["Refrags"] += 1
                
                previous_kill = (killer, time_in_seconds)

            elif feedback['type']['name'] == "DefuserPlantComplete":
                username = feedback['username']
                if username in player_stats:
                    player_stats[username]["Plants"] += 1

            elif feedback['type']['name'] == "DefuserDisableComplete":
                username = feedback['username']
                if username in player_stats:
                    player_stats[username]["Defuses"] += 1

    # Temporary variable to store number of rounds not being targeted
    not_targeted_counts = {username: 0 for username in player_stats}

    for round_data in data['rounds']:
        kill_targets = set()
        for feedback in round_data['matchFeedback']:
            if feedback['type']['name'] == "Kill":
                kill_targets.add(feedback['target'])
        for username in player_stats:
            if username not in kill_targets:
                not_targeted_counts[username] += 1

    # Determine the most common operator for each player for attack and defense
    for username, counts in operator_counts.items():
        if username in player_stats:
            # Attack Main
            most_common_attack = counts["attack"].most_common(1)
            if most_common_attack:
                player_stats[username]["Attack Main"] = most_common_attack[0][0]
            # Defense Main
            most_common_defense = counts["defense"].most_common(1)
            if most_common_defense:
                player_stats[username]["Defense Main"] = most_common_defense[0][0]
            print(f"Username: {username}, Attack Main: {player_stats[username]['Attack Main']}, Defense Main: {player_stats[username]['Defense Main']}")

    # Calculate KOST for each player
    first_player = next(iter(player_stats))
    total_rounds = player_stats[first_player]["Rounds"]
    for username, stats in player_stats.items():
        total_contributions = (
            stats["Kills"] +
            stats["Plants"] +
            stats["Defuses"] +
            not_targeted_counts[username] +
            stats["Refrags"]
        )
        stats["KOST"] = total_contributions / total_rounds

    # Extract HS% from the very last stats section
    last_stats = data['stats']
    for stat in last_stats:
        username = stat['username']
        if username in player_stats:
            player_stats[username]["HS%"] = stat.get("headshotPercentage", 0)

    # Write data to CSV
    with open(csv_file_name, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=headers)
        writer.writeheader()
        
        for username, stats in player_stats.items():
            row = {"Players": username}
            row.update(stats)
            writer.writerow(row)
    
    print(f"CSV file '{csv_file_name}' created successfully.")

    # Upload to S3
    s3_bucket = "tlmrisserver"
    s3_path = "post-exported-data/"
    s3_file_path = s3_path + os.path.basename(csv_file_name)
    upload_file_to_s3(csv_file_name, s3_bucket, s3_file_path)

    # Clean up local files
    os.remove(json_file_path)
    print(f"Deleted local file {json_file_path}")
    os.remove(csv_file_name)
    print(f"Deleted local file {csv_file_name}")





def list_s3_files(bucket):
    cmd = f"aws s3 ls {bucket} --recursive"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error listing S3 bucket contents: {result.stderr}")
        logging.error(f"Error listing S3 bucket contents: {result.stderr}")
        return []
    return [line.split()[-1] for line in result.stdout.split('\n') if line.strip()]

@app.route('/api/runner', methods=['POST'])
def runner():
    data_directory = "/app/data"
    os.makedirs(data_directory, exist_ok=True)
    intermediate_data_bucket = "s3://tlmrisserver/intermediate-data"
    post_exported_data_bucket = "s3://tlmrisserver/post-exported-data"

    intermediate_files = list_s3_files(intermediate_data_bucket)
    post_exported_files = list_s3_files(post_exported_data_bucket)

    intermediate_files_set = set(intermediate_files)
    post_exported_files_set = set(post_exported_files)

    unique_files = intermediate_files_set - post_exported_files_set

    for file in unique_files:
        download_s3_file("s3://tlmrisserver/", file, data_directory)

    return "File download and processing complete!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
