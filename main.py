
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Welcome to NeX AI!"}
@app.get("/health")
def health_check():
    return {"status": "ok", "app": "NeX AI"}