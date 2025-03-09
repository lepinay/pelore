import os
import json
import re
import urllib.parse

def update_tracks_json():
    # S3 bucket base URL
    s3_base_url = "https://modplayer.s3.us-east-1.amazonaws.com/tracks/"
    
    # Directory where MP3 files are located
    directory = os.path.join(os.path.dirname(os.path.abspath(__file__)),"tracks")
    
    # Path to tracks.json file
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tracks.json')
    
    # Initialize an empty tracks list
    tracks = []
    
    # Find all MP3 files in the directory
    mp3_files = [f for f in os.listdir(directory) if f.lower().endswith('.mp3')]
    
    # Create track entries for all MP3 files
    for mp3_file in mp3_files:
        # Generate a name from the filename by replacing underscores with spaces
        # and removing the .mp3 extension
        name = re.sub(r'\.mp3$', '', mp3_file, flags=re.IGNORECASE)
        name = name.replace('_', ' ')
        
        # Add track to the list with S3 URL (properly URL encoded)
        tracks.append({
            "name": name,
            "file": mp3_file,
            "url": s3_base_url + urllib.parse.quote(mp3_file)
        })
    
    # Sort tracks by name for better organization
    tracks.sort(key=lambda x: x['name'])
    
    # Save tracks to json file (completely replacing any existing file)
    with open(json_path, 'w') as file:
        json.dump(tracks, file, indent=4)
    
    print(f"Created tracks.json with {len(tracks)} tracks")

if __name__ == "__main__":
    update_tracks_json()
