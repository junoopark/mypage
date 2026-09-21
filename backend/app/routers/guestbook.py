from datetime import datetime

from fastapi import APIRouter, status

from app.schemas import GuestbookCreate, GuestbookOut

router = APIRouter(prefix="/guestbook", tags=["guestbook"])

MAX_ENTRIES = 50

# 인메모리 저장소: 서버가 재시작되면 비워진다
_entries: list[dict] = []
_next_id = 1


@router.get("", response_model=list[GuestbookOut])
def list_guestbook(limit: int = 10):
    # 최근 글이 먼저 오도록 뒤집어서 limit개만 돌려준다
    return list(reversed(_entries))[:limit]


@router.post("", response_model=GuestbookOut, status_code=status.HTTP_201_CREATED)
def create_guestbook(payload: GuestbookCreate):
    global _next_id
    entry = {"id": _next_id, "created_at": datetime.now(), **payload.model_dump()}
    _entries.append(entry)
    _next_id += 1
    if len(_entries) > MAX_ENTRIES:
        _entries.pop(0)
    return entry
