from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class MessageRequest(BaseModel):
    message: str


@router.post("/echo")
def echo_message(data: MessageRequest):
    return {"you_said": data.message}