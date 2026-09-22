"""FRED API 클라이언트 (G:\\내 드라이브\\coding\\shared\\fred\\fred_client.py 를 이 프로젝트에 맞게 축소).

원본과의 차이: 이 프로젝트에 필요한 시리즈만 남기고, .env 로딩은 app.main 이 담당한다
(FRED_API_KEY 는 os.getenv 로만 읽는다).
"""

import os

import pandas as pd
from fredapi import Fred


class FredClient:
    # key → FRED 시리즈 코드
    SERIES = {
        "base": "FEDFUNDS",  # 미국 기준금리(실효 연방기금금리, 월별)
        "y2": "DGS2",        # 미국 2년 국채
        "y10": "DGS10",      # 미국 10년 국채
    }
    LABELS = {
        "base": "미국 기준금리",
        "y2": "미국 2년",
        "y10": "미국 10년",
    }

    def __init__(self, api_key: str = None):
        key = api_key or os.getenv("FRED_API_KEY")
        if not key:
            raise ValueError("FRED_API_KEY가 설정되지 않았습니다.")
        self._fred = Fred(api_key=key)

    def get_by_key(self, key: str, start_date: str = None, end_date: str = None) -> pd.Series:
        series_id = self.SERIES[key]
        return self._fred.get_series(series_id, observation_start=start_date, observation_end=end_date)
