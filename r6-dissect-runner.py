import os
import time
from datetime import datetime

# Paths should use os.path.join to ensure they work across different operating systems
pre_exported_base = "data/pre-exported-data"
intermediate_data_base = "data/intermediate-data"

def handle_directory(directory_path):
    print(f"Checking directory: {directory_path}")
    # Normalize the paths for comparison
    normalized_directory_path = os.path.normpath(directory_path)
    normalized_pre_exported_base = os.path.normpath(pre_exported_base)

    # Check if the directory is within pre-exported-data
    if normalized_pre_exported_base in normalized_directory_path:
        folder_name = os.path.basename(directory_path)
        
        # Construct the path to the potential JSON file in intermediate-data
        json_path = os.path.join(intermediate_data_base, f"{folder_name}.json")
        if os.path.exists(json_path):
            print(f"Skipping {folder_name} as corresponding JSON exists.")
            return
        
        # Check that all files in the folder are .rec files
        all_rec_files = True
        for file in os.listdir(directory_path):
            if not file.endswith(".rec"):
                all_rec_files = False
                break
        
        if not all_rec_files:
            print(f"Skipping {folder_name} as it contains non .rec files.")
            return
        
        # Construct the command for valid folders
        command = f"r6-dissect {os.path.join(pre_exported_base, folder_name)} -o {os.path.join(intermediate_data_base, f'{folder_name}.json')}"
        os.system(command)  # Using os.system here for simplicity; consider subprocess.run for more complex needs
        print(f"Command executed for {folder_name} at {datetime.now()}")

def start_polling(interval=60):  # Interval in seconds
    while True:
        print(f"Scanning {pre_exported_base} at {datetime.now()}")
        if os.path.exists(pre_exported_base):
            for folder in os.listdir(pre_exported_base):
                folder_path = os.path.join(pre_exported_base, folder)
                if os.path.isdir(folder_path):
                    handle_directory(folder_path)
        time.sleep(interval)

if __name__ == "__main__":
    start_polling()
