import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from auth.router import router as auth_router
from users.router import router as users_router
from posts.router import router as posts_router
from medias.router import router as medias_router
from stories.router import router as stories_router
from likes.router import router as likes_router
from comments.router import router as comments_router
from follows.router import router as follows_router
from blocks.router import router as blocks_router
from saved.router import router as saved_router
from tags.router import router as tags_router
from chats.router import router as chats_router
from messages.router import router as messages_router
from notifications.router import router as notifications_router
from highlights.router import router as highlights_router
from uploads.router import router as uploads_router

Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Instagram API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(posts_router)
app.include_router(medias_router)
app.include_router(stories_router)
app.include_router(likes_router)
app.include_router(comments_router)
app.include_router(follows_router)
app.include_router(blocks_router)
app.include_router(saved_router)
app.include_router(tags_router)
app.include_router(chats_router)
app.include_router(messages_router)
app.include_router(notifications_router)
app.include_router(highlights_router)
app.include_router(uploads_router)
