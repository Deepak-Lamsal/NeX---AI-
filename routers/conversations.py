from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.conversation import Conversation
from models.message import Message
from models.user import User
from schemas import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    MessageCreate,
    MessageOut,
)
from services.ai_service import AIServiceError, generate_reply

router = APIRouter(prefix="/conversations", tags=["conversations"])

MAX_HISTORY_MESSAGES = 20


def get_owned_conversation(
    db: Session, conversation_id: int, user: User
) -> Conversation:
    convo = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = Conversation(title=data.title, user_id=current_user.id)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


@router.get("", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    ).all()


@router.patch("/{conversation_id}", response_model=ConversationOut)
def rename_conversation(
    conversation_id: int,
    data: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = get_owned_conversation(db, conversation_id, current_user)
    convo.title = data.title
    db.commit()
    db.refresh(convo)
    return convo


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = get_owned_conversation(db, conversation_id, current_user)
    db.execute(delete(Message).where(Message.conversation_id == convo.id))
    db.delete(convo)
    db.commit()


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def add_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = get_owned_conversation(db, conversation_id, current_user)
    message = Message(conversation_id=convo.id, role="user", content=data.content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = get_owned_conversation(db, conversation_id, current_user)
    return db.scalars(
        select(Message)
        .where(Message.conversation_id == convo.id)
        .order_by(Message.created_at, Message.id)
    ).all()


@router.post(
    "/{conversation_id}/chat",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def chat(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = get_owned_conversation(db, conversation_id, current_user)

    recent = db.scalars(
        select(Message)
        .where(Message.conversation_id == convo.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(MAX_HISTORY_MESSAGES)
    ).all()

    history = [(m.role, m.content) for m in reversed(recent)]
    history.append(("user", data.content))

    try:
        reply_text = generate_reply(history)
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    db.add(Message(conversation_id=convo.id, role="user", content=data.content))
    reply = Message(conversation_id=convo.id, role="assistant", content=reply_text)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply