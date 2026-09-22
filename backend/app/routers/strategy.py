from fastapi import APIRouter, HTTPException

from app.schemas import Strategy
from app.services.rates.cache import get_or_set
from app.services.rates.service import fetch_kr_rates, fetch_us_rates, load_opinion_rows

router = APIRouter(prefix="/strategy", tags=["strategy"])

CACHE_TTL_SECONDS = 12 * 60 * 60  # 금리는 하루 한 번만 갱신되어도 충분하니 12시간 캐시


@router.get("", response_model=Strategy)
def get_strategy():
    try:
        us = get_or_set("rates:US", CACHE_TTL_SECONDS, fetch_us_rates)
        kr = get_or_set("rates:KR", CACHE_TTL_SECONDS, fetch_kr_rates)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"금리 데이터를 가져오지 못했습니다: {exc}")

    return {"rates": {"US": us, "KR": kr}, "opinions": {"rows": load_opinion_rows()}}
