import requests
import random

BASE = "http://localhost:8000"

users = [
    {"username": "fotima",     "phone": "+992111111111", "password": "1365244"},
    {"username": "abdufattoh", "phone": "+992222222222", "password": "1365244"},
    {"username": "sabrina",    "phone": "+992333333333", "password": "1365244"},
    {"username": "zarinna",    "phone": "+992444444444", "password": "1365244"},
    {"username": "farrux",     "phone": "+992555555555", "password": "1365244"},
    {"username": "Bum",        "phone": "+992939939641", "password": "1365244"},
    {"username": "madina",     "phone": "+992666666666", "password": "1365244"},
    {"username": "rayhona",    "phone": "+992777777777", "password": "1365244"},
    {"username": "muso",       "phone": "+992888888888", "password": "1365244"},
    {"username": "nino",       "phone": "+992999999999", "password": "1365244"},
]

video_urls = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
]

def login(phone, password):
    r = requests.post(f"{BASE}/auth/login", json={"phone": phone, "password": password})
    return r.json().get("access_token") if r.status_code == 200 else None

def create_story(token, url, media_type="image"):
    r = requests.post(f"{BASE}/stories/", json={"url": url, "type": media_type},
                      headers={"Authorization": f"Bearer {token}"})
    return r.status_code in (200, 201)

print("Adding stories for all users...\n")

img_seeds = random.sample(range(1, 999), 50)
seed_idx = 0
vid_idx = 0

for u in users:
    token = login(u["phone"], u["password"])
    if not token:
        print(f"  ERR {u['username']} - login failed")
        continue

    count = random.randint(2, 3)
    for i in range(count):
        if i == 1 and random.random() > 0.5:
            url = video_urls[vid_idx % len(video_urls)]
            vid_idx += 1
            ok = create_story(token, url, "video")
            print(f"  {'OK' if ok else 'ERR'} {u['username']} - story #{i+1} (video)")
        else:
            url = f"https://picsum.photos/seed/{img_seeds[seed_idx % len(img_seeds)]}/400/700"
            seed_idx += 1
            ok = create_story(token, url, "image")
            print(f"  {'OK' if ok else 'ERR'} {u['username']} - story #{i+1} (photo)")

print("\nDone!")
