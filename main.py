from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from models.user import User
from models.conversation import Conversation
from models.message import Message
from routers import account, auth, chat, conversations

Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(account.router)
app.mount("/app", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")


@app.get("/")
def home():
    return {"message": "Welcome to NeX AI!"}


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "NeX AI"}