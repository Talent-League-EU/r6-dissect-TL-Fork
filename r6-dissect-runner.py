import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess

class ChangeHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        if event.is_directory:
            self.handle_directory(event.src_path)

    def handle_directory(self, directory_path):
        pre_exported_base = "/etc/TLMRIS/data/pre-exported-data"
        intermediate_data_base = "/etc/TLMRIS/data/intermediate-data"
        
        # Check if the directory is within pre-exported-data
        if pre_exported_base in directory_path:
            folder_name = os.path.basename(directory_path)
            
            # Check for a matching JSON file in intermediate-data
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
            
            # Run the command for valid folders
            command = f"r6-dissect data/pre-exported-data/{folder_name} -o /data/intermediate-data/{folder_name}.json"
            subprocess.run(command, shell=True)
            print(f"Command executed for {folder_name}")

def start_monitoring():
    path = "/etc/TLMRIS/data/pre-exported-data"
    event_handler = ChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    try:
        while True:
            pass
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    start_monitoring()
