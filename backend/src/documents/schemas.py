import uuid
from datetime import datetime
from typing import List
from ninja import Schema, Field

# Schema -> Pydantic BaseModel

class TagSchema(Schema):
    id: int
    name: str


class FolderSchema(Schema):
    id: int
    name: str
    created_at: datetime


class DocSchema(Schema):
    id: uuid.UUID
    title: str
    content: str | None = Field(default="")
    is_owner: bool = False
    deleted_at: datetime | None = None
    folder_id: int | None = Field(default=None, alias="folder_id")
    tags: List[TagSchema] = []
    created_at: datetime


class DocCreateSchema(Schema):
    title: str

class DocUpdateSchema(Schema):
    title: str
    content: str


class RenameSchema(Schema):
    title: str


class MoveSchema(Schema):
    folder_id: int | None


class CreateFolderSchema(Schema):
    name: str


class AddTagSchema(Schema):
    name: str


class ReplyCommentSchema(Schema):
    id: int
    body: str
    created_at: datetime
    updated_at: datetime
    author_email: str | None = Field(default=None, alias="user.email")
    parent_id: int | None


class CommentSchema(Schema):
    id: int
    body: str
    resolved: bool
    created_at: datetime
    updated_at: datetime
    author_email: str | None = Field(default=None, alias="user.email")
    parent_id: int | None
    replies: List[ReplyCommentSchema] = []


class CreateCommentSchema(Schema):
    body: str
    parent_id: int | None = None


class ResolveCommentSchema(Schema):
    resolved: bool


class EmptyPayloadSchema(Schema):
    pass
