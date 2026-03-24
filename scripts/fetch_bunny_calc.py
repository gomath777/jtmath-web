import requests
import json
import os

API_KEY = "45e6333e-0ce6-4872-a74ac3914b4e-7cae-4850"
LIBRARY_ID = "566809"

headers = {
    "AccessKey": API_KEY,
    "accept": "application/json"
}

def fetch_all_videos():
    all_videos = []
    page = 1
    items_per_page = 100
    while True:
        url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos?page={page}&itemsPerPage={items_per_page}"
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"Error: {res.status_code}")
            break
        data = res.json()
        items = data.get('items', [])
        all_videos.extend(items)
        if len(items) < items_per_page:
            break
        page += 1
    return all_videos

videos = fetch_all_videos()
calc_videos = [v for v in videos if '미적분1' in v.get('title', '')]
print(f"Found {len(calc_videos)} videos for Calculus 1")

for v in calc_videos:
    print(f"- {v.get('title')} ({v.get('guid')})")
