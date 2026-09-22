from datetime import date, datetime
from typing import Literal

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


class RatePoint(BaseModel):
    date: date
    value: float


class RateSeries(BaseModel):
    label: str
    points: list[RatePoint]


class MarketRates(BaseModel):
    unit: str
    series: dict[str, RateSeries]


class OpinionRow(BaseModel):
    market: Literal["US", "KR"]
    asOf: date
    opinion: int = Field(ge=-2, le=2)


class Opinions(BaseModel):
    rows: list[OpinionRow]


class Strategy(BaseModel):
    rates: dict[Literal["US", "KR"], MarketRates]
    opinions: Opinions
