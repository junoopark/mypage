from datetime import datetime

from pydantic import BaseModel, Field


class Profile(BaseModel):
    name: str
    role: str
    intro: str
    interests: list[str]
    links: dict[str, str]


class GuestbookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    message: str = Field(min_length=1, max_length=200)


class GuestbookOut(BaseModel):
    id: int
    name: str
    message: str
    created_at: datetime
