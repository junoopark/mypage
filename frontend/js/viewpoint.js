// 「매크로 및 금리 전망」 타일 — 한미 국채 투자의견 표 + 미국/한국 코멘트
//
// 데이터 계약(JSON 모양)과 규칙은 docs/전망타일_설계.md 에 있다.
// 지금은 data/viewpoint.json 을 읽는다. DB/API 가 생기면 VIEWPOINT_URL 만 API 주소로 바꾼다.
// 투자의견은 숫자로 적는다: -2 적극축소, -1 축소, 0 중립, +1 확대, +2 적극확대.

(function () {
  const VIEWPOINT_URL = "data/viewpoint.json";
  const VIEW_MIN = -2;
  const VIEW_MAX = 2;
  const MARKETS = ["US", "KR"]; // 표의 행 순서
  const TOPICS = ["us", "kr"]; // 코멘트는 시장(미국·한국)별로 2~3줄

  const body = document.querySelector('[data-tile="viewpoint"]');
  if (!body) return;

  let data = null;
  let loadFailed = false;

  // ── 작은 도우미 ─────────────────────────────────────
  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  const isView = (v) => Number.isInteger(v) && v >= VIEW_MIN && v <= VIEW_MAX;
  const signClass = (v) => (v < 0 ? "neg" : v > 0 ? "pos" : "neu");

  // "2026-09-17" → 한국어 "9/17", English "Sep 17" (시간대 때문에 날짜가 하루 밀리지 않도록 UTC 로 계산)
  function formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    if (getLang() === "ko") return `${m}/${d}`;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  // 날짜 글자 (주소가 있으면 링크)
  function dateNode(iso, url) {
    const text = formatDate(iso);
    if (!url) return document.createTextNode(text);
    const a = make("a", "", text);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  // "주: {asOf} 기준" 같은 문구의 {자리}에 노드를 끼워 넣는다 (innerHTML 을 쓰지 않는다)
  function fillTemplate(container, template, nodes) {
    for (const part of template.split(/(\{\w+\})/)) {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      if (name && nodes[name]) container.append(nodes[name]);
      else container.append(document.createTextNode(part));
    }
  }

  // ── 국채 투자의견 표 ────────────────────────────────
  function buildOpinionTable(opinions) {
    const table = make("table", "opinion");
    table.append(make("caption", "sr-only", t("viewpoint.opinion.title")));

    // 열 머리글: 축소(열 1~2) · 중립(열 3) · 확대(열 4~5)
    const headRow = make("tr");
    const corner = make("th");
    corner.scope = "col";
    corner.append(make("span", "sr-only", t("viewpoint.market")));
    headRow.append(corner);
    for (const [group, span] of [["neg", 2], ["neu", 1], ["pos", 2]]) {
      const th = make("th", `group ${group}`, t(`view.group.${group}`));
      th.scope = "colgroup";
      th.colSpan = span;
      headRow.append(th);
    }
    const thead = make("thead");
    thead.append(headRow);
    table.append(thead);

    const tbody = make("tbody");
    for (const market of MARKETS) {
      const row = opinions.rows.find((r) => r.market === market);
      if (!row || !isView(row.opinion)) continue;

      const tr = make("tr");
      const th = make("th", "market", t(`market.${market}`));
      th.scope = "row";
      tr.append(th);

      for (let value = VIEW_MIN; value <= VIEW_MAX; value++) {
        const td = make("td");
        td.title = t(`view.${value}`);
        if (value === row.opinion) {
          // 현재 전망: 색과 테두리 + (색을 못 보는 사람을 위한) 숨은 글자
          td.className = `current ${signClass(value)}${Math.abs(value) === 2 ? " strong" : ""}`;
          td.append(make("span", "sr-only", t("viewpoint.current", { label: t(`view.${value}`) })));
        } else if (isView(row.prevOpinion) && row.prevOpinion !== row.opinion && value === row.prevOpinion) {
          // 직전 전망: 회색 원. 직전과 같으면 그리지 않는다
          const dot = make("span", "prev-dot");
          dot.append(make("span", "sr-only", t("viewpoint.prev", { label: t(`view.${value}`) })));
          td.append(dot);
        }
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    return table;
  }

  // 기준일 묶음: 모든 시장이 같은 날짜(와 링크)를 가지면 하나로, 다르거나 일부 시장의 날짜를
  // 모르면 "미국 9/17 · 한국 5/28" 처럼 시장 이름을 붙여 적는다. total 은 표에 그려진 시장 수.
  function datePart(items, total) {
    const frag = document.createDocumentFragment();
    const same =
      items.length === total && items.every((i) => i.iso === items[0].iso && (i.url || "") === (items[0].url || ""));
    if (same) {
      frag.append(dateNode(items[0].iso, items[0].url));
      return frag;
    }
    items.forEach((item, index) => {
      if (index) frag.append(document.createTextNode(" · "));
      frag.append(document.createTextNode(`${t(`market.${item.market}`)} `), dateNode(item.iso, item.url));
    });
    return frag;
  }

  // 각주. 미국과 한국은 각자의 기준일을 가진다. 직전 전망은 "그 기준일 이전의 전망"이라
  // 날짜를 따로 적지 않는다.
  function buildNote(rows) {
    const current = rows.filter((r) => r.asOf).map((r) => ({ market: r.market, iso: r.asOf, url: r.asOfUrl }));
    const hasDot = rows.some((r) => isView(r.prevOpinion) && r.prevOpinion !== r.opinion);

    let key;
    if (current.length) key = hasDot ? "viewpoint.note.withPrev" : "viewpoint.note.noPrev";
    else if (hasDot) key = "viewpoint.note.dotOnly"; // 기준일은 없어도 회색 원의 뜻은 알려 준다
    else return null;

    const note = make("p", "vp-note");
    fillTemplate(note, t(key), { asOf: current.length ? datePart(current, rows.length) : document.createTextNode("") });
    return note;
  }

  // ── 시장별 핵심 코멘트 ───────────────────────────────
  function buildComments(comments) {
    const list = make("ul", "comments");
    for (const topic of TOPICS) {
      const c = comments.find((item) => item.topic === topic);
      if (!c) continue;
      const text = c[getLang()] || c.ko || "";
      const li = make("li");
      li.append(make("strong", "", t(`viewpoint.topic.${topic}`)), document.createTextNode(` ${text}`));
      list.append(li);
    }
    return list;
  }

  // ── 그리기 ──────────────────────────────────────────
  function render() {
    body.replaceChildren();
    if (loadFailed || !data) {
      const p = make("p", "tile-placeholder", t(loadFailed ? "viewpoint.error" : "tile.placeholder"));
      body.append(p);
      return;
    }
    const wrap = make("div", "viewpoint");
    if (data.opinions?.rows?.length) {
      const rows = MARKETS.map((m) => data.opinions.rows.find((r) => r.market === m)).filter((r) => r && isView(r.opinion));
      wrap.append(make("h3", "vp-title", t("viewpoint.opinion.title")), buildOpinionTable(data.opinions));
      const note = buildNote(rows);
      if (note) wrap.append(note);
    }
    if (data.comments?.length) wrap.append(buildComments(data.comments));
    body.append(wrap);
  }

  document.addEventListener("langchange", render);

  // 다른 화면(테스트 등)에서 값을 바꿔 그려 볼 수 있도록 열어 둔다
  window.renderViewpoint = (newData) => {
    data = newData;
    loadFailed = false;
    render();
  };

  fetch(VIEWPOINT_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((json) => window.renderViewpoint(json))
    .catch((err) => {
      console.warn("viewpoint: 데이터를 불러오지 못했습니다", err);
      loadFailed = true;
      render();
    });
})();
