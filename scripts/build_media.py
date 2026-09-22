#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
database/seed/media.csv 를 읽어 frontend/data/media.json 을 만든다.

CSV 에는 유튜브 주소(url)만 있으면 된다 — 제목·게시일·썸네일은 유튜브에서 자동으로 가져온다.
필요하면 title_ko / title_en / date 열에 값을 직접 적어 자동으로 가져온 값을 덮어쓸 수 있다.

가져오는 방법 (모두 API 키 불필요):
  - 제목: YouTube oEmbed (공식 공개 API) — https://www.youtube.com/oembed?url=...
  - 게시일: 영상 페이지 HTML 안의 publishDate 값
  - 썸네일: 영상 ID로 만드는 고정 주소 (img.youtube.com/vi/<ID>/...) — 조회조차 필요 없다

실행 (CSV 를 고칠 때마다 다시 실행한다):
    cd 저장소 루트
    python scripts/build_media.py
"""
import csv
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "database" / "seed" / "media.csv"
JSON_PATH = ROOT / "frontend" / "data" / "media.json"

# youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID 모두 지원
VIDEO_ID_RE = re.compile(
    r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|shorts/|embed/)|[?&]v=)([A-Za-z0-9_-]{11})"
)
DATE_RE = re.compile(r'"publishDate":"(\d{4}-\d{2}-\d{2})')

UA = {"User-Agent": "Mozilla/5.0 (compatible; mypage-media-fetch/1.0)"}


def extract_video_id(url: str) -> str:
    m = VIDEO_ID_RE.search(url)
    if not m:
        raise ValueError(f"유튜브 주소에서 영상 ID를 찾지 못했습니다: {url}")
    return m.group(1)


def fetch_oembed(url: str) -> dict:
    q = urllib.parse.urlencode({"url": url, "format": "json"})
    req = urllib.request.Request(f"https://www.youtube.com/oembed?{q}", headers=UA)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def fetch_published_date(video_id: str) -> str | None:
    req = urllib.request.Request(f"https://www.youtube.com/watch?v={video_id}", headers=UA)
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode("utf-8", errors="ignore")
    m = DATE_RE.search(html)
    return m.group(1) if m else None


def build() -> None:
    if not CSV_PATH.exists():
        sys.exit(f"CSV 가 없습니다: {CSV_PATH}")

    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig", newline="")))
    items = []
    for row in rows:
        url = (row.get("url") or "").strip()
        if not url:
            continue

        video_id = extract_video_id(url)
        print(f"조회 중: {url}")
        try:
            oembed = fetch_oembed(url)
        except urllib.error.HTTPError as e:
            print(f"  ! oEmbed 실패({e.code}) — 비공개/삭제된 영상이거나 주소가 잘못됐을 수 있습니다. 건너뜁니다.")
            continue

        auto_title = oembed.get("title", "")
        try:
            auto_date = fetch_published_date(video_id)
        except Exception as e:
            print(f"  ! 게시일을 가져오지 못했습니다: {e}")
            auto_date = None

        title_ko = (row.get("title_ko") or "").strip() or auto_title
        title_en = (row.get("title_en") or "").strip() or auto_title
        date = (row.get("date") or "").strip() or auto_date or ""

        items.append(
            {
                "url": url,
                "videoId": video_id,
                "title_ko": title_ko,
                "title_en": title_en,
                "date": date,
                "channel": oembed.get("author_name", ""),
                "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                "thumbnailHq": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
            }
        )

    items.sort(key=lambda x: x["date"], reverse=True)  # 최신 출연이 위로

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(
        json.dumps(
            {"_comment": "database/seed/media.csv 로부터 생성 (scripts/build_media.py). 직접 고치지 않는다.", "items": items},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\n{len(items)}건 -> {JSON_PATH}")


if __name__ == "__main__":
    build()
