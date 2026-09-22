// 「언론/방송」 타일 — 출연한 유튜브 영상 목록 (썸네일 + 제목 + 날짜)
//
// 데이터 계약(JSON 모양)과 규칙은 docs/언론방송타일_설계.md 에 있다.
// 지금은 data/media.json 을 읽는다. 이 파일은 database/seed/media.csv 로부터
// scripts/build_media.py 로 만든다 (CSV 를 고치면 그 스크립트를 다시 돌린다).

(function () {
  const MEDIA_URL = "data/media.json";
  const body = document.querySelector('[data-tile="media"]');
  if (!body) return;

  let data = null;
  let loadFailed = false;

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // "2026-03-14" → 한국어 "2026.3.14", English "Mar 14, 2026"
  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (getLang() === "ko") return `${y}.${m}.${d}`;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }

  function buildItem(item) {
    const a = make("a", "media-item");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";

    const thumbWrap = make("span", "media-thumb");
    const img = document.createElement("img");
    img.src = item.thumbnailHq || item.thumbnail;
    img.alt = "";
    img.loading = "lazy";
    // 고화질 썸네일이 없는 영상은 유튜브가 404 대신 120x90 짜리 회색 "없음" 이미지를
    // 200 처럼 내려준다 — onerror 가 발동하지 않으므로, 로드된 실제 크기로 걸러낸다.
    img.addEventListener(
      "load",
      () => {
        if (img.naturalWidth <= 120 && img.src !== item.thumbnail) img.src = item.thumbnail;
      },
      { once: true }
    );
    img.addEventListener(
      "error",
      () => {
        if (img.src !== item.thumbnail) img.src = item.thumbnail;
      },
      { once: true }
    );
    thumbWrap.append(img);

    const text = make("span", "media-text");
    const title = getLang() === "ko" ? item.title_ko : item.title_en;
    text.append(make("span", "media-title", title || item.title_ko), make("time", "media-date", formatDate(item.date)));

    a.append(thumbWrap, text);
    return a;
  }

  function render() {
    body.replaceChildren();
    if (loadFailed) {
      body.append(make("p", "tile-placeholder", t("media.error")));
      return;
    }
    if (!data || !data.items || data.items.length === 0) {
      body.append(make("p", "tile-placeholder", t("media.empty")));
      return;
    }
    const list = make("div", "media-list");
    for (const item of data.items) list.append(buildItem(item));
    body.append(list);
  }

  document.addEventListener("langchange", render);

  // 다른 화면(테스트 등)에서 값을 바꿔 그려 볼 수 있도록 열어 둔다
  window.renderMedia = (newData) => {
    data = newData;
    loadFailed = false;
    render();
  };

  fetch(MEDIA_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((json) => window.renderMedia(json))
    .catch((err) => {
      console.warn("media: 데이터를 불러오지 못했습니다", err);
      loadFailed = true;
      render();
    });
})();
