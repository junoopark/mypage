// 「투자 전략 히스토리」 타일 — 시장별 10년 금리 추이 + 투자의견 구간(음영) + 호버 툴팁
//
// 데이터 계약(JSON 모양)은 docs/전략타일_설계.md 에 있다.
// 지금은 data/strategy.json 을 읽는다. DB/API 가 생기면 STRATEGY_URL 만 API 주소로 바꾼다.
// opinions.rows 는 「매크로 및 금리 전망」 타일의 이력(전체)과 같은 표를 공유한다.

(function () {
  const STRATEGY_URL = `${API_BASE_URL}/strategy`;
  const MARKETS = ["US", "KR"]; // 차트 순서
  const PRIMARY_SERIES = { US: "y10", KR: "ktb10y" }; // 듀레이션 대표 지표(10년물)만 그린다
  const VIEW_MIN = -2;
  const VIEW_MAX = 2;
  const NS = "http://www.w3.org/2000/svg";
  const CHART_W = 600;
  const CHART_H = 200;
  const MARGIN = { top: 10, right: 10, bottom: 22, left: 32 };

  const body = document.querySelector('[data-tile="strategy"]');
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

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }

  const isView = (v) => Number.isInteger(v) && v >= VIEW_MIN && v <= VIEW_MAX;

  // "2026-09-17" → UTC 타임스탬프 (시간대 때문에 날짜가 하루 밀리지 않도록)
  function toTs(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function fillForOpinion(v) {
    if (v === -2) return "var(--neg-strong)";
    if (v === -1) return "url(#strategy-hatch-neg)";
    if (v === 0) return "url(#strategy-dots-neu)";
    if (v === 1) return "url(#strategy-hatch-pos)";
    if (v === 2) return "var(--pos-strong)";
    return "transparent";
  }

  // 차트에 한 번만 넣는 패턴(빗금·점) 정의. url(#id) 로 다른 svg 에서도 참조된다
  function buildDefs() {
    const svg = svgEl("svg", { width: 0, height: 0, "aria-hidden": "true", style: "position:absolute" });
    const defs = svgEl("defs", {});
    const hatch = (id, soft, ink) => {
      const p = svgEl("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse" });
      p.append(svgEl("rect", { width: 6, height: 6, fill: soft }));
      p.append(svgEl("path", { d: "M0,6 L6,0", stroke: ink, "stroke-width": 1.2 }));
      return p;
    };
    const dots = (id, soft, ink) => {
      const p = svgEl("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse" });
      p.append(svgEl("rect", { width: 6, height: 6, fill: soft }));
      p.append(svgEl("circle", { cx: 3, cy: 3, r: 1, fill: ink }));
      return p;
    };
    defs.append(
      hatch("strategy-hatch-neg", "var(--neg-soft)", "var(--neg)"),
      dots("strategy-dots-neu", "var(--neu-soft)", "var(--neu)"),
      hatch("strategy-hatch-pos", "var(--pos-soft)", "var(--pos)")
    );
    svg.append(defs);
    return svg;
  }

  // ── 범례: 적극축소·축소·중립·확대·적극확대 ───────────
  function buildLegend() {
    const ul = make("ul", "strategy-legend");
    for (let v = VIEW_MIN; v <= VIEW_MAX; v++) {
      const li = make("li");
      const swatch = make("span", "swatch");
      swatch.style.background = fillForOpinion(v).startsWith("url")
        ? "none"
        : fillForOpinion(v);
      if (fillForOpinion(v).startsWith("url")) {
        // CSS background 는 svg pattern 을 못 그리므로 작은 svg 로 대신한다
        const mini = svgEl("svg", { width: 12, height: 12 });
        mini.append(svgEl("rect", { width: 12, height: 12, fill: fillForOpinion(v) }));
        swatch.append(mini);
      }
      li.append(swatch, document.createTextNode(t(`view.${v}`)));
      ul.append(li);
    }
    return ul;
  }

  // 시장의 의견 이력을 [{startTs, endTs, opinion}] 구간으로 바꾼다.
  // 마지막 구간은 데이터 범위 끝(rangeEnd)까지 이어진다.
  function buildBands(opinionRows, market, rangeStart, rangeEnd) {
    const rows = opinionRows
      .filter((r) => r.market === market && isView(r.opinion))
      .map((r) => ({ ts: toTs(r.asOf), opinion: r.opinion }))
      .sort((a, b) => a.ts - b.ts);

    const bands = [];
    rows.forEach((row, i) => {
      const start = Math.max(row.ts, rangeStart);
      const end = i + 1 < rows.length ? Math.min(rows[i + 1].ts, rangeEnd) : rangeEnd;
      if (end > start) bands.push({ startTs: start, endTs: end, opinion: row.opinion });
    });
    return bands;
  }

  function opinionAt(bands, ts) {
    const band = bands.find((b) => ts >= b.startTs && ts < b.endTs);
    return band ? band.opinion : null;
  }

  // "2026-09-17" 류 타임스탬프 → 축 눈금 "26.9" (ko) / "Sep '26" (en)
  function formatAxisTs(ts) {
    const d = new Date(ts);
    const yy = d.getUTCFullYear() % 100;
    if (getLang() === "ko") return `${yy}.${d.getUTCMonth() + 1}`;
    return `${d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} '${yy}`;
  }

  // 툴팁용 날짜: "9/17" (ko) / "Sep 17" (en)
  function formatTooltipTs(ts) {
    const d = new Date(ts);
    if (getLang() === "ko") return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }

  // 2개월 간격으로 x축 눈금(월초) 목록을 만든다
  function monthTicks(tsMin, tsMax) {
    const start = new Date(tsMin);
    const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    const ticks = [];
    let i = 0;
    for (let ts = first; ts <= tsMax; ts = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + (++i), 1)) {
      if (ts >= tsMin && i % 2 === 0) ticks.push(ts);
    }
    return ticks;
  }

  function niceRange(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.12, 0.05);
    return [min - pad, max + pad];
  }

  // ── 시장 하나의 차트를 그린다 ───────────────────────
  function buildChart(market, marketData, opinionRows) {
    const primary = marketData.series?.[PRIMARY_SERIES[market]];
    if (!primary) return null;
    const points = primary.points.map((p) => ({ ts: toTs(p.date), value: p.value }));
    if (!points.length) return null;

    const tsMin = points[0].ts;
    const tsMax = points[points.length - 1].ts;
    const [vMin, vMax] = niceRange(points.map((p) => p.value));

    const x0 = MARGIN.left, x1 = CHART_W - MARGIN.right;
    const y0 = MARGIN.top, y1 = CHART_H - MARGIN.bottom;
    const xScale = (ts) => x0 + ((ts - tsMin) / (tsMax - tsMin || 1)) * (x1 - x0);
    const yScale = (v) => y1 - ((v - vMin) / (vMax - vMin || 1)) * (y1 - y0);

    const bands = buildBands(opinionRows, market, tsMin, tsMax);

    const svg = svgEl("svg", {
      class: "strategy-svg",
      viewBox: `0 0 ${CHART_W} ${CHART_H}`,
      role: "img",
      "aria-label": t(`strategy.chart.title.${market}`),
    });

    // 배경 음영: 투자의견 구간
    for (const b of bands) {
      svg.append(
        svgEl("rect", {
          x: xScale(b.startTs),
          y: y0,
          width: Math.max(xScale(b.endTs) - xScale(b.startTs), 0),
          height: y1 - y0,
          fill: fillForOpinion(b.opinion),
        })
      );
    }

    // y축 눈금(가로 그리드) 4단
    const yTickCount = 4;
    for (let i = 0; i <= yTickCount; i++) {
      const v = vMin + ((vMax - vMin) * i) / yTickCount;
      const y = yScale(v);
      svg.append(svgEl("line", { class: "axis-line", x1: x0, x2: x1, y1: y, y2: y }));
      const label = svgEl("text", { class: "axis-label", x: x0 - 5, y: y + 3, "text-anchor": "end" });
      label.textContent = v.toFixed(1);
      svg.append(label);
    }

    // x축 눈금(월 단위, 2개월 간격)
    for (const ts of monthTicks(tsMin, tsMax)) {
      const x = xScale(ts);
      const label = svgEl("text", { class: "axis-label", x, y: y1 + 14, "text-anchor": "middle" });
      label.textContent = formatAxisTs(ts);
      svg.append(label);
    }

    // 금리 선
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.ts).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(" ");
    svg.append(svgEl("path", { class: "rate-line", d }));

    // 호버: 세로선 + 점
    const hoverLine = svgEl("line", { class: "hover-line", y1: y0, y2: y1 });
    const hoverDot = svgEl("circle", { class: "hover-dot", r: 3 });
    svg.append(hoverLine, hoverDot);

    const wrap = make("div", "strategy-chart-wrap");
    const tooltip = make("div", "strategy-tooltip");
    wrap.append(svg, tooltip);

    function showAt(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      if (px < 0 || px > rect.width || py < 0 || py > rect.height) return hide();

      const vbX = (px / rect.width) * CHART_W;
      const ts = tsMin + ((vbX - x0) / (x1 - x0)) * (tsMax - tsMin);
      let nearest = points[0];
      for (const p of points) {
        if (Math.abs(p.ts - ts) < Math.abs(nearest.ts - ts)) nearest = p;
      }

      const nx = xScale(nearest.ts), ny = yScale(nearest.value);
      hoverLine.setAttribute("x1", nx);
      hoverLine.setAttribute("x2", nx);
      hoverLine.style.opacity = 1;
      hoverDot.setAttribute("cx", nx);
      hoverDot.setAttribute("cy", ny);
      hoverDot.style.opacity = 1;

      const opinion = opinionAt(bands, nearest.ts);
      tooltip.textContent = t("strategy.tooltip", {
        date: formatTooltipTs(nearest.ts),
        value: nearest.value.toFixed(2),
        opinion: opinion === null ? "-" : t(`view.${opinion}`),
      });
      tooltip.style.opacity = 1;
      tooltip.style.left = `${(nx / CHART_W) * rect.width}px`;
      tooltip.style.top = `${(ny / CHART_H) * rect.height}px`;
    }

    function hide() {
      hoverLine.style.opacity = 0;
      hoverDot.style.opacity = 0;
      tooltip.style.opacity = 0;
    }

    svg.addEventListener("mousemove", (e) => showAt(e.clientX, e.clientY));
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches[0]) showAt(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    svg.addEventListener("touchend", hide);

    const section = make("div", "strategy-chart");
    section.append(make("h3", "", t(`strategy.chart.title.${market}`)), wrap);
    return section;
  }

  // ── 그리기 ──────────────────────────────────────────
  function render() {
    body.replaceChildren();
    if (loadFailed || !data) {
      const p = make("p", "tile-placeholder", t(loadFailed ? "strategy.error" : "tile.placeholder"));
      body.append(p);
      return;
    }
    const wrap = make("div", "strategy");
    wrap.append(buildDefs(), buildLegend());
    for (const market of MARKETS) {
      const marketData = data.rates?.[market];
      if (!marketData) continue;
      const chart = buildChart(market, marketData, data.opinions?.rows || []);
      if (chart) wrap.append(chart);
    }
    body.append(wrap);
  }

  document.addEventListener("langchange", render);

  window.renderStrategy = (newData) => {
    data = newData;
    loadFailed = false;
    render();
  };

  fetch(STRATEGY_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((json) => window.renderStrategy(json))
    .catch((err) => {
      console.warn("strategy: 데이터를 불러오지 못했습니다", err);
      loadFailed = true;
      render();
    });
})();
