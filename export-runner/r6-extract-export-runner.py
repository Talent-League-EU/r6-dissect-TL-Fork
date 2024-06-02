import json
import csv
import logging
import os
import subprocess
from collections import Counter
from flask import Flask

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
    return local_file_path

def upload_file_to_s3(local_file_path, bucket, s3_file_path):
    """Uploads a file to an S3 bucket using AWS CLI."""
    cmd = f"aws s3 cp {local_file_path} s3://{bucket}/{s3_file_path}"
    try:
        subprocess.run(cmd, check=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Successfully uploaded {local_file_path} to s3://{bucket}/{s3_file_path}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to upload file to S3: {e.stderr.decode()}")

def process_exported_to_sheets(file_path):
    with open(file_path, 'r') as file:
        existing_csvs = file.read().splitlines()
    return set(existing_csvs)

def create_csv_from_json(json_file_path):
    # Read the JSON file
    with open(json_file_path, 'r') as file:
        data = json.load(file)
    
    # Define the CSV file name
    csv_file_name = os.path.splitext(json_file_path)[0] + '.csv'
    
    # Define the CSV headers
    headers = [
        "Date", "Team", "Players", "Rounds", "Kills", "Deaths", "Entry Kills", "Entry Deaths", 
        "HS%", "1vX", "Refrags", "Plants", "Defuses", "Attack Main", "Defense Main", "KOST"
    ]
    
    # Extract date from the first timestamp
    date = data['rounds'][0]['timestamp'].split('T')[0]
    
    # Extract team names
    teams = data['rounds'][0]['teams']
    team_names = {0: teams[0]['name'], 1: teams[1]['name']}

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
    rounds_contributions = {}  # Track contributions per round
    
    for round_data in data['rounds']:
        round_number = round_data['roundNumber']
        
        # Track operator swaps
        operator_swaps = {}

        for player in round_data['players']:
            username = player['username']
            team_index = player['teamIndex']
            team_name = team_names[team_index]
            operator_name = player['operator']['name']
            if username not in operator_counts:
                operator_counts[username] = {"attack": Counter(), "defense": Counter()}
                rounds_contributions[username] = set()
            if operator_name in attack_operators:
                operator_counts[username]["attack"][operator_name] += 1
            elif operator_name in defense_operators:
                operator_counts[username]["defense"][operator_name] += 1
            
            logging.info(f"Round {round_number}: {username} is using {operator_name}")

        # Check for operator swaps and update operator name
        for feedback in round_data['matchFeedback']:
            if feedback['type']['name'] == "OperatorSwap":
                operator_swaps[feedback['username']] = feedback['operator']['name']

        # Update operator names based on swaps
        for player in round_data['players']:
            username = player['username']
            if username in operator_swaps:
                old_operator = player['operator']['name']
                new_operator = operator_swaps[username]
                player['operator']['name'] = new_operator
                logging.info(f"Round {round_number}: {username} swapped from {old_operator} to {new_operator}")

        for stat in round_data['stats']:
            username = stat['username']
            team_index = stat['teamIndex']
            team_name = team_names[team_index]
            if username not in player_stats:
                player_stats[username] = {
                    "Date": date,
                    "Team": team_name,
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
                    if victim == prev_killer and (time_in_seconds - prev_time) <= 3:
                        if killer in player_stats:
                            player_stats[killer]["Refrags"] += 1
                        rounds_contributions[killer].add(round_number)  # Track round contribution for killer
                
                previous_kill = (killer, time_in_seconds)

            elif feedback['type']['name'] == "DefuserPlantComplete":
                username = feedback['username']
                if username in player_stats:
                    player_stats[username]["Plants"] += 1
                    rounds_contributions[username].add(round_number)  # Track round contribution for planter

            elif feedback['type']['name'] == "DefuserDisableComplete":
                username = feedback['username']
                if username in player_stats:
                    player_stats[username]["Defuses"] += 1
                    rounds_contributions[username].add(round_number)  # Track round contribution for defuser

    # Temporary variables
    not_targeted_counts = {username: 0 for username in player_stats}
    killed_in_rounds = {username: 0 for username in player_stats}
    for round_number, round_data in enumerate(data['rounds']):
        kill_targets = set()
        round_kills = set()
        for feedback in round_data['matchFeedback']:
            if feedback['type']['name'] == "Kill":
                killer = feedback['username']
                victim = feedback['target']
                kill_targets.add(victim)
                round_kills.add(killer)

                previous_kill = (killer, feedback['timeInSeconds'])

        for username in player_stats:
            if username not in kill_targets:
                not_targeted_counts[username] += 1
                rounds_contributions[username].add(round_number)  # Track round contribution for survival
            if username in round_kills:
                killed_in_rounds[username] += 1

    # Calculate KOST for each player
    first_player = next(iter(player_stats))
    total_rounds = player_stats[first_player]["Rounds"]
    for username, stats in player_stats.items():
        total_contributions = len(rounds_contributions[username])  # Count unique rounds with contributions
        stats["KOST"] = total_contributions / total_rounds

    # Determine the most common attacking and defending operators for each player
    for username, counts in operator_counts.items():
        if counts["attack"]:
            player_stats[username]["Attack Main"] = counts["attack"].most_common(1)[0][0]
        if counts["defense"]:
            player_stats[username]["Defense Main"] = counts["defense"].most_common(1)[0][0]

    # Log the most common attack and defense operators for each player
    for username, stats in player_stats.items():
        logging.info(f"{username} - Most common Attack Operator: {stats['Attack Main']}, Most common Defense Operator: {stats['Defense Main']}")

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
    
    logging.info(f"CSV file '{csv_file_name}' created successfully.")
    return csv_file_name

@app.route('/api/runner', methods=['POST'])
def runner():
    data_directory = "/app/data"
    os.makedirs(data_directory, exist_ok=True)
    intermediate_data_bucket = "s3://tlmrisserver/"
    post_exported_data_bucket = "s3://tlmrisserver/"
    root_bucket = "s3://tlmrisserver"
    exported_to_sheets_file = "exported-to-sheets.txt"
    
    # Download exported-to-sheets file from the root of the S3 bucket
    exported_to_sheets_path = download_s3_file(root_bucket, exported_to_sheets_file, data_directory)
    
    # Read existing CSV files listed in exported-to-sheets file
    existing_csvs = process_exported_to_sheets(exported_to_sheets_path)

    # List files in intermediate-data bucket
    intermediate_files = list_s3_files(intermediate_data_bucket)

    # Process each JSON file that doesn't have a corresponding CSV
    for file in intermediate_files:
        if file.endswith('.json'):
            csv_file_name = os.path.splitext(file)[0] + '.csv'
            if csv_file_name not in existing_csvs:
                json_file_path = download_s3_file(intermediate_data_bucket, file, data_directory)
                created_csv_file = create_csv_from_json(json_file_path)
                
                # Upload the newly created CSV file to the post-exported-data folder in S3
                s3_csv_path = f"post-exported-data/{os.path.basename(created_csv_file)}"
                upload_file_to_s3(created_csv_file, "tlmrisserver", s3_csv_path)

                # Add the S3 URL to the existing CSVs set
                s3_csv_url = f"s3://tlmrisserver/{s3_csv_path}"
                existing_csvs.add(s3_csv_url)
                
                # Clean up local files
                os.remove(json_file_path)
                os.remove(created_csv_file)
                logging.info(f"Deleted local file {json_file_path}")
                logging.info(f"Deleted local file {created_csv_file}")

    # Write the updated list of CSV files to exported-to-sheets file
    with open(exported_to_sheets_path, 'w') as file:
        for csv_file in existing_csvs:
            file.write(csv_file + '\n')
    
    # Clean up local files
    os.remove(exported_to_sheets_path)
    logging.info(f"Deleted local file {exported_to_sheets_path}")

    return "File download and processing complete!"

def list_s3_files(bucket):
    cmd = f"aws s3 ls {bucket} --recursive"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error listing S3 bucket contents: {result.stderr}")
        logging.error(f"Error listing S3 bucket contents: {result.stderr}")
        return []
    return [line.split()[-1] for line in result.stdout.split('\n') if line.strip()]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
