"""「투자 전략 히스토리」 타일의 데이터를 모은다: 금리(FRED/ECOS) + 투자의견 이력(CSV).

데이터 계약은 docs/전략타일_설계.md 참고.
"""

import csv
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from .ecos_client import EcosClient
from .fred_client import FredClient

LOOKBACK_YEARS = 3
OPINIONS_CSV = Path(__file__).resolve().parents[4] / "database" / "seed" / "viewpoint_opinions.csv"


def _date_range() -> tuple[str, str]:
    end = date.today()
    start = end - timedelta(days=365 * LOOKBACK_YEARS)
    return start.isoformat(), end.isoformat()


def _series_to_points(series: pd.Series) -> list[dict]:
    return [{"date": idx.date().isoformat(), "value": round(float(v), 3)} for idx, v in series.dropna().items()]


def fetch_us_rates() -> dict:
    client = FredClient()
    start, end = _date_range()
    return {
        "unit": "%",
        "series": {
            key: {"label": FredClient.LABELS[key], "points": _series_to_points(client.get_by_key(key, start, end))}
            for key in FredClient.SERIES
        },
    }


def fetch_kr_rates() -> dict:
    client = EcosClient()
    start, end = _date_range()
    return {
        "unit": "%",
        "series": {
            key: {"label": EcosClient.SERIES[key][3], "points": _series_to_points(client.get_by_key(key, start, end))}
            for key in EcosClient.SERIES
        },
    }


def load_opinion_rows() -> list[dict]:
    """viewpoint 타일과 공유하는 투자의견 이력. database/seed/viewpoint_opinions.csv 가 원본이다."""
    rows = []
    with OPINIONS_CSV.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            rows.append({"market": row["market"], "asOf": row["as_of"], "opinion": int(row["opinion"])})
    return rows
