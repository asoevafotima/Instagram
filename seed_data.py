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

post_captions = [
    "Прекрасный день! 🌞",
    "Вечерняя прогулка 🚶",
    "Новое место 📍",
    "Хорошее настроение 😊",
    "Природа лечит 🌿",
    "Момент счастья ❤️",
    "Любимый вид 🏙️",
    "Отличный день был 👌",
    "Всем привет! 👋",
    "Красота вокруг нас 🌸",
    "Лучшие моменты ✨",
    "Просто жизнь 💫",
    "Утро началось хорошо ☕",
    "Закат сегодня 🌅",
    "Люблю такие дни 🤍",
    "Настроение на высоте 🔥",
    "Будни 😅",
    "Выходные в кайф 🎉",
    "Не могу остановиться 📸",
    "Живём! 💪",
]

# Публичные видео (Google sample videos)
video_urls = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
]

def login(phone, password):
    r = requests.post(f"{BASE}/auth/login", json={"phone": phone, "password": password})
    return r.json().get("access_token") if r.status_code == 200 else None

def get_me(token):
    r = requests.get(f"{BASE}/users/me", headers={"Authorization": f"Bearer {token}"})
    return r.json() if r.status_code == 200 else None

def create_story(token, url, media_type="image"):
    r = requests.post(f"{BASE}/stories/", json={"url": url, "type": media_type},
                      headers={"Authorization": f"Bearer {token}"})
    return r.status_code in (200, 201)

def create_post(token, caption, url, media_type="image"):
    r = requests.post(f"{BASE}/posts/", json={"caption": caption, "type": "post"},
                      headers={"Authorization": f"Bearer {token}"})
    if r.status_code not in (200, 201):
        return False
    post_id = r.json()["id"]
    requests.post(f"{BASE}/medias/post/{post_id}",
                  json={"url": url, "type": media_type, "order": 0},
                  headers={"Authorization": f"Bearer {token}"})
    return True

def follow(token, user_id):
    r = requests.post(f"{BASE}/follows/{user_id}",
                      headers={"Authorization": f"Bearer {token}"})
    return r.status_code in (200, 201)

# ── 1. Логинимся ──
print("🔐 Логинимся...")
tokens = {}
user_ids = {}
for u in users:
    token = login(u["phone"], u["password"])
    if not token:
        print(f"  ✗ {u['username']} — не удалось войти")
        continue
    me = get_me(token)
    if me:
        tokens[u["username"]] = token
        user_ids[u["username"]] = me["id"]
        print(f"  ✓ {u['username']} (id={me['id']})")

if not tokens:
    print("Нет пользователей! Сначала зарегистрируй их.")
    exit()

img_seeds = random.sample(range(10, 999), 100)
seed_idx = 0
vid_idx = 0

# ── 2. Истории ──
print("\n📸 Создаём истории...")
for username, token in tokens.items():
    count = random.randint(2, 3)
    for i in range(count):
        # Каждая 3-я история — видео
        if i == 1 and random.random() > 0.5:
            url = video_urls[vid_idx % len(video_urls)]
            vid_idx += 1
            create_story(token, url, "video")
            print(f"  ✓ {username} — история #{i+1} (видео)")
        else:
            url = f"https://picsum.photos/seed/{img_seeds[seed_idx]}/400/700"
            seed_idx += 1
            create_story(token, url, "image")
            print(f"  ✓ {username} — история #{i+1} (фото)")

# ── 3. Посты ──
print("\n🖼  Создаём посты...")
captions = post_captions.copy()
random.shuffle(captions)
cap_idx = 0
for username, token in tokens.items():
    count = random.randint(2, 3)
    for i in range(count):
        caption = captions[cap_idx % len(captions)]
        cap_idx += 1
        # Каждый 3-й пост — видео
        if i == 2 or (i == 1 and random.random() > 0.6):
            url = video_urls[vid_idx % len(video_urls)]
            vid_idx += 1
            ok = create_post(token, caption, url, "video")
            print(f"  ✓ {username} — пост #{i+1} (видео): {ok}")
        else:
            url = f"https://picsum.photos/seed/{img_seeds[seed_idx]}/600/600"
            seed_idx += 1
            ok = create_post(token, caption, url, "image")
            print(f"  ✓ {username} — пост #{i+1} (фото): {ok}")

# ── 4. Подписки ──
print("\n👥 Создаём подписки...")
usernames = list(tokens.keys())
for username in usernames:
    token = tokens[username]
    others = [u for u in usernames if u != username]
    to_follow = random.sample(others, random.randint(3, 6))
    for target in to_follow:
        follow(token, user_ids[target])
    print(f"  ✓ {username} подписался на {len(to_follow)} пользователей")

print("\n✅ Готово! Всё заполнено.")
