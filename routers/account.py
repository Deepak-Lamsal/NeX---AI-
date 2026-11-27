from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.conversation import Conversation
from models.message import Message
from models.user import User
from schemas import PasswordChange
from security import hash_password, verify_password

router = APIRouter(prefix="/account", tags=["account"])


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current one",
        )

    current_user.hashed_password = hash_password(data.new_password)
    db.commit()


@router.delete("/conversations", status_code=status.HTTP_204_NO_CONTENT)
def clear_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    own_chat_ids = select(Conversation.id).where(
        Conversation.user_id == current_user.id
    )
    db.execute(delete(Message).where(Message.conversation_id.in_(own_chat_ids)))
    db.execute(delete(Conversation).where(Conversation.user_id == current_user.id))
    db.commit()