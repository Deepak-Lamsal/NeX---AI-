from fastapi import FastAPI
from routers import chat

app = FastAPI()
app.include_router(chat.router)


@app.get("/")
def home():
    return {"message": "Welcome to NeX AI!"}


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "NeX AI"}