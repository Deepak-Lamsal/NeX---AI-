from sqlalchemy import select

from database import SessionLocal
from models.user import User
from models.conversation import Conversation
from models.message import Message

db = SessionLocal()

# 1. Add a user
user = User(
    username="testuser",
    email="dlamsal234@gmail.com",
    hashed_password="not-a-real-hash",
)
db.add(user)
db.commit()
db.refresh(user)

# 2. Adding a conversation that belongs to that user
convo = Conversation(title="My first chat", user_id=user.id)
db.add(convo)
db.commit()
db.refresh(convo)

# 3. Add two messages inside that conversation
db.add(Message(conversation_id=convo.id, role="user", content="Hello NeX AI"))
db.add(Message(conversation_id=convo.id, role="assistant", content="Hi! How can I help?"))
db.commit()

# 4. Read the messages back
messages = db.scalars(
    select(Message).where(Message.conversation_id == convo.id)
).all()

for m in messages:
    print(m.role, ":", m.content)

db.close()