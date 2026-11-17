
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Welcome to NeX AI!"}
@app.get("/health")
def health_check():
    return {"status": "ok", "app": "NeX AI"}
class MessageRequest(BaseModel):
    message: str


@app.post("/echo")
def echo_message(data: MessageRequest):
    return {"you_said": data.message}