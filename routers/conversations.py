from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.conversation import Conversation
from models.message import Message
from models.user import User
from schemas import ConversationCreate, ConversationOut, MessageCreate, MessageOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


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