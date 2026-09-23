#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
database/seed/profile_*.csv 를 읽어 frontend/data/profile.json 을 만든다.

읽는 파일: profile_basic.csv(한 행) · profile_career.csv · profile_education.csv ·
          profile_certifications.csv · profile_links.csv
데이터 계약과 각 CSV 의 열 설명은 docs/프로필타일_설계.md 를 본다.

날짜(period_start/period_end)는 "YYYY-MM" 또는 연도만("YYYY")을 기대하지만,
엑셀이 날짜로 인식해 "Sep-25" 처럼 자동 변환해 놓아도 같은 값으로 되돌린다.
이름·직함·소개·경력상세처럼 여러 줄을 담는 칸은 셀 안의 줄바꿈(\r\n/\r/\n 무관)을
그대로 배열로 옮긴다.

프로필 사진: frontend/assets/profile.jpg(+ profile@2x.jpg)가 있으면 자동으로 포함한다.
사진을 새로 넣거나 바꿀 때는 원본을 얼굴 중심으로 정사각형으로 잘라 그 이름으로 저장한다.

실행 (CSV 나 사진을 고칠 때마다 다시 실행한다):
    cd 저장소 루트
    python scripts/build_profile.py
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "database" / "seed"
ASSETS = ROOT / "frontend" / "assets"
JSON_PATH = ROOT / "frontend" / "data" / "profile.json"

MONTHS = {m.lower(): i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
)}


def norm_period(v: str) -> str | None:
    """'YYYY-MM' / 'YYYY' 로 정규화한다. 엑셀이 'Sep-25' 로 바꿔 놔도 같은 값으로 되돌린다."""
    v = (v or "").strip()
    if not v:
        return None
    if re.fullmatch(r"\d{4}", v):
        return v
    if re.fullmatch(r"\d{4}-\d{2}", v):
        return v
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return v[:7]
    m = re.fullmatch(r"([A-Za-z]{3})-(\d{2}|\d{4})", v)  # 엑셀: Sep-25, Sep-2025
    if m:
        mon = MONTHS.get(m.group(1).lower())
        if mon:
            y = int(m.group(2))
            if y < 100:
                y += 2000 if y <= 68 else 1900
            return f"{y:04d}-{mon:02d}"
    print(f"  ! 인식 못한 날짜 형식: {v!r} (그대로 둠 — 확인 필요)")
    return v


def lines(s: str) -> list[str]:
    # splitlines() 는 \r\n · \r · \n 을 모두 줄바꿈으로 인식한다 (엑셀 저장본마다 섞여도 안전)
    return [ln.strip() for ln in s.splitlines() if ln.strip()] if s else []


def read_csv(name: str) -> list[dict]:
    path = SEED / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def build() -> None:
    basic_rows = read_csv("profile_basic.csv")
    career = read_csv("profile_career.csv")
    education = read_csv("profile_education.csv")
    certifications = read_csv("profile_certifications.csv")
    links = read_csv("profile_links.csv")

    basic = basic_rows[0] if basic_rows else {}
    profile = {
        "_comment": "database/seed/profile_*.csv 로부터 생성 (scripts/build_profile.py). 직접 고치지 않는다.",
        "basic": {
            "name_ko": lines(basic.get("name_ko", "")),
            "name_en": lines(basic.get("name_en", "")),
            "title_ko": lines(basic.get("title_ko", "")),
            "title_en": lines(basic.get("title_en", "")),
            "bio_ko": lines(basic.get("bio_ko", "")),
            "bio_en": lines(basic.get("bio_en", "")),
        },
        "career": [
            {
                "org_ko": c.get("org_ko", ""), "org_en": c.get("org_en", ""),
                "role_ko": c.get("role_ko", ""), "role_en": c.get("role_en", ""),
                "start": norm_period(c.get("period_start", "")),
                "end": norm_period(c.get("period_end", "")),
                "desc_ko": lines(c.get("desc_ko", "")), "desc_en": lines(c.get("desc_en", "")),
            }
            for c in career
        ],
        "education": [
            {
                "school_ko": e.get("school_ko", ""), "school_en": e.get("school_en", ""),
                "degree_ko": e.get("degree_ko", ""), "degree_en": e.get("degree_en", ""),
                "start": norm_period(e.get("period_start", "")),
                "end": norm_period(e.get("period_end", "")),
            }
            for e in education
        ],
        "certifications": [
            {
                "name_ko": c.get("name_ko", ""), "name_en": c.get("name_en", ""),
                "issuer_ko": c.get("issuer_ko", ""), "issuer_en": c.get("issuer_en", ""),
                "year": c.get("year", ""),
            }
            for c in certifications
        ],
        "links": [
            {"label_ko": l.get("label_ko", ""), "label_en": l.get("label_en", ""), "url": l.get("url", "")}
            for l in links
        ],
    }

    if (ASSETS / "profile.jpg").exists():
        profile["basic"]["avatar"] = "assets/profile.jpg"
        if (ASSETS / "profile@2x.jpg").exists():
            profile["basic"]["avatar2x"] = "assets/profile@2x.jpg"

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"경력 {len(career)}건 · 학력 {len(education)}건 · 자격증 {len(certifications)}건 · "
        f"링크 {len(links)}건 · 사진 {'포함' if 'avatar' in profile['basic'] else '없음'} -> {JSON_PATH}"
    )


if __name__ == "__main__":
    build()
