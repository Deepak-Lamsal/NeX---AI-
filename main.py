from fastapi import FastAPI

from database import Base, engine
from models.user import User
from models.conversation import Conversation
from models.message import Message
from routers import chat


Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(chat.router)


@app.get("/")
def home():
    return {"message": "Welcome to NeX AI!"}


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "NeX AI"}