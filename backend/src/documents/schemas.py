import uuid
from datetime import datetime
from ninja import Schema, Field

# Schema -> Pydantic BaseModel

class DocSchema(Schema):
    id: uuid.UUID
    title: str
    content: str | None = Field(default="")
    is_owner: bool = False


class DocCreateSchema(Schema):
    title: str

class DocUpdateSchema(Schema):
    title: str
    content: str


class CollaboratorSchema(Schema):
    id: int
    email: str = Field(alias="user.email")
    active: bool
    created_at: datetime


class InviteSchema(Schema):
    email: str