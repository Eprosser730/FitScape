"""Prayer and Bible journal."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth import current_user
from app.db import get_db
from app.models import PrayerNote, User

router = APIRouter(prefix="/api/prayer/notes")

# Shortcut: the newest 200 notes only; add paging when someone writes more than that.
MAX_NOTES = 200


class NoteIn(BaseModel):
    read_on: date
    passage: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    summary: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)
    ]


class NoteOut(NoteIn):
    id: int


@router.get("", response_model=list[NoteOut])
def list_notes(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return db.scalars(
        select(PrayerNote)
        .where(PrayerNote.user_id == user.id)
        .order_by(PrayerNote.read_on.desc(), PrayerNote.id.desc())
        .limit(MAX_NOTES)
    ).all()


@router.post("", response_model=NoteOut, status_code=201)
def add_note(body: NoteIn, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    note = PrayerNote(user_id=user.id, **body.model_dump())
    db.add(note)
    db.flush()
    return note


@router.delete("/{note_id}", status_code=204)
def remove_note(note_id: int, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    note = db.get(PrayerNote, note_id)
    # Someone else's note looks exactly like a missing one.
    if note is None or note.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "note not found")
    db.delete(note)
    return Response(status_code=204)
