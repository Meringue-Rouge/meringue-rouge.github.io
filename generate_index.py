import os
import json

def generate_index():
    directories = [
        {'type': 'news', 'path': 'news'},
        {'type': 'assets', 'path': 'assets'},
        {'type': 'games', 'path': 'games'}
    ]
    index = []

    for dir_info in directories:
        dir_path = dir_info['path']
        if os.path.exists(dir_path):
            for filename in os.listdir(dir_path):
                if filename.endswith('.md'):
                    index.append({
                        'type': dir_info['type'],
                        'path': f"{dir_path}/{filename}"
                    })

    with open('index.json', 'w') as f:
        json.dump(index, f, indent=2)
    print("Generated index.json")

if __name__ == "__main__":
    generate_index()