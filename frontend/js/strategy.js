// 「투자 전략 히스토리」 타일 — 시장별 10년 금리 추이 + 투자의견 구간(음영) + 호버 툴팁
//
// 데이터 계약(JSON 모양)은 docs/전략타일_설계.md 에 있다.
// 지금은 data/strategy.json 을 읽는다. DB/API 가 생기면 STRATEGY_URL 만 API 주소로 바꾼다.
// opinions.rows 는 「매크로 및 금리 전망」 타일의 이력(전체)과 같은 표를 공유한다.

(function () {
  const STRATEGY_URL = `${API_BASE_URL}/strategy`;
  const MARKETS = ["US", "KR"]; // 차트 순서
  const CHART_START_DATE = "2026-01-01"; // 금리 차트는 이 날짜부터 그린다
  // 만기 토글: key 는 화면 상태, US/KR 은 시장마다 다른 series 키로 연결한다.
  // 선은 색 대신 검정/회색 + 실선/점선으로 구분한다 (보고서 인쇄에서도 구분되도록)
  const MATURITIES = [
    { key: "base", US: "base", KR: "base", color: "var(--ink-soft)", dash: "5 3" },
    { key: "short", US: "y2", KR: "ktb3y", color: "var(--ink-soft)", dash: null },
    { key: "long", US: "y10", KR: "ktb10y", color: "var(--ink)", dash: null },
  ];
  // 선택된 만기 집합(복수 선택 가능) — 기본값: 장기(10년) 하나. 두 개 이상 고르면 자동으로 겹쳐 그린다
  let selectedMaturities = new Set(["long"]);
  const CHART_MARKET_LABEL = { US: "UST", KR: "KTB" }; // 차트 제목에만 쓰는 표기 (영문 약어, 두 언어 공통)
  const VIEW_MIN = -2;
  const VIEW_MAX = 2;
  const NS = "http://www.w3.org/2000/svg";
  const CHART_W = 600;
  const CHART_H = 200;
  const MARGIN = { top: 10, right: 10, bottom: 26, left: 38 }; // 축 글씨가 커진 만큼 여백도 넓힌다

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
    if (v === 0) return "var(--neu-soft)"; // 중립은 무늬 없이 회색 음영만
    if (v === 1) return "url(#strategy-hatch-pos)";
    if (v === 2) return "var(--pos-strong)";
    return "transparent";
  }

  // 차트에 한 번만 넣는 빗금 패턴 정의. url(#id) 로 다른 svg 에서도 참조된다
  function buildDefs() {
    const svg = svgEl("svg", { width: 0, height: 0, "aria-hidden": "true", style: "position:absolute" });
    const defs = svgEl("defs", {});
    const hatch = (id, soft, ink) => {
      const p = svgEl("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse" });
      p.append(svgEl("rect", { width: 6, height: 6, fill: soft }));
      p.append(svgEl("path", { d: "M0,6 L6,0", stroke: ink, "stroke-width": 1.2 }));
      return p;
    };
    defs.append(hatch("strategy-hatch-neg", "var(--neg-soft)", "var(--neg)"), hatch("strategy-hatch-pos", "var(--pos-soft)", "var(--pos)"));
    svg.append(defs);
    return svg;
  }

  // ── 범례: 적극축소·축소·중립·확대·적극확대 ───────────
  function buildLegend() {
    const ul = make("ul", "strategy-legend");
    for (let v = VIEW_MIN; v <= VIEW_MAX; v++) {
      const li = make("li");
      const swatch = make("span", "swatch");
      const fill = fillForOpinion(v);
      if (fill.startsWith("url")) {
        // CSS background 는 svg pattern 을 못 그리므로 작은 svg 로 대신한다
        const mini = svgEl("svg", { width: 12, height: 12 });
        mini.append(svgEl("rect", { width: 12, height: 12, fill }));
        swatch.append(mini);
      } else {
        swatch.style.background = fill;
      }
      li.append(swatch, document.createTextNode(t(`view.${v}`)));
      ul.append(li);
    }
    return ul;
  }

  // ── 만기 토글: 기준금리 · 단기(2·3년) · 장기(10년), 복수 선택 가능(누르면 켜고 끈다) ─────
  function buildToggle(onChange) {
    const div = make("div", "strategy-toggle");
    div.setAttribute("role", "group");
    for (const m of MATURITIES) {
      const btn = make("button", "", t(`strategy.maturity.${m.key}`));
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(selectedMaturities.has(m.key)));
      btn.addEventListener("click", () => {
        if (selectedMaturities.has(m.key)) {
          if (selectedMaturities.size === 1) return; // 최소 하나는 켜져 있어야 한다
          selectedMaturities.delete(m.key);
        } else {
          selectedMaturities.add(m.key);
        }
        onChange();
      });
      div.append(btn);
    }
    return div;
  }

  // 두 개 이상 선택했을 때만 보이는, 어떤 선이 어떤 만기인지 알려주는 작은 범례
  function buildLineLegend(activeMaturities) {
    const div = make("div", "strategy-line-legend");
    for (const m of activeMaturities) {
      const span = make("span");
      const swatch = make("i");
      swatch.style.background = m.dash
        ? `repeating-linear-gradient(to right, ${m.color} 0 3px, transparent 3px 6px)`
        : m.color;
      span.append(swatch, document.createTextNode(t(`strategy.maturity.${m.key}`)));
      div.append(span);
    }
    return div;
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

  // 2개월 간격으로 x축 눈금(월초) 목록을 만든다. 첫 달은 tsMin 이 1일이 아니어도 왼쪽 끝에 표시한다
  function monthTicks(tsMin, tsMax) {
    const start = new Date(tsMin);
    const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    const ticks = [];
    let i = 0;
    for (let ts = first; ts <= tsMax; ts = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + (++i), 1)) {
      if (i % 2 === 0) ticks.push(Math.max(ts, tsMin));
    }
    return ticks;
  }

  function niceRange(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.12, 0.05);
    return [min - pad, max + pad];
  }

  function nearestPoint(points, ts) {
    let nearest = points[0];
    for (const p of points) {
      if (Math.abs(p.ts - ts) < Math.abs(nearest.ts - ts)) nearest = p;
    }
    return nearest;
  }

  // ── 시장 하나의 차트를 그린다. 만기를 2개 이상 고르면 자동으로 겹쳐 그린다 ──
  function buildChart(market, marketData, opinionRows, activeMaturities) {
    const chartStart = toTs(CHART_START_DATE);
    const isMulti = activeMaturities.length > 1;
    const activeSeries = activeMaturities
      .map((m) => {
        const raw = marketData.series?.[m[market]];
        if (!raw) return null;
        const points = raw.points.map((p) => ({ ts: toTs(p.date), value: p.value })).filter((p) => p.ts >= chartStart);
        return points.length ? { key: m.key, color: m.color, dash: m.dash, points } : null;
      })
      .filter(Boolean);
    if (!activeSeries.length) return null;

    // 호버 시 x 위치를 맞추는 기준: 점이 가장 촘촘한(보통 일별) 시리즈
    const refSeries = activeSeries.reduce((a, b) => (b.points.length > a.points.length ? b : a));

    const allPoints = activeSeries.flatMap((s) => s.points);
    const tsMin = Math.min(...allPoints.map((p) => p.ts));
    const tsMax = Math.max(...allPoints.map((p) => p.ts));
    const [vMin, vMax] = niceRange(allPoints.map((p) => p.value));

    const x0 = MARGIN.left, x1 = CHART_W - MARGIN.right;
    const y0 = MARGIN.top, y1 = CHART_H - MARGIN.bottom;
    const xScale = (ts) => x0 + ((ts - tsMin) / (tsMax - tsMin || 1)) * (x1 - x0);
    const yScale = (v) => y1 - ((v - vMin) / (vMax - vMin || 1)) * (y1 - y0);

    const bands = buildBands(opinionRows, market, tsMin, tsMax);
    const title = t("strategy.chart.title", { market: CHART_MARKET_LABEL[market] });

    const svg = svgEl("svg", {
      class: "strategy-svg",
      viewBox: `0 0 ${CHART_W} ${CHART_H}`,
      role: "img",
      "aria-label": title,
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
      const label = svgEl("text", { class: "axis-label", x: x0 - 6, y: y + 4, "text-anchor": "end" });
      label.textContent = v.toFixed(1);
      svg.append(label);
    }

    // x축 눈금(월 단위, 2개월 간격)
    for (const ts of monthTicks(tsMin, tsMax)) {
      const x = xScale(ts);
      const label = svgEl("text", { class: "axis-label", x, y: y1 + 17, "text-anchor": "middle" });
      label.textContent = formatAxisTs(ts);
      svg.append(label);
    }

    // 금리 선 (겹쳐보기면 만기마다 한 줄, 아니면 한 줄)
    for (const s of activeSeries) {
      const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.ts).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(" ");
      svg.append(svgEl("path", { class: "rate-line", d, style: `stroke:${s.color};stroke-dasharray:${s.dash || "none"}` }));
    }

    // 호버: 세로선 + 시리즈마다 점 하나씩
    const hoverLine = svgEl("line", { class: "hover-line", y1: y0, y2: y1 });
    svg.append(hoverLine);
    const hoverDots = activeSeries.map((s) => {
      const dot = svgEl("circle", { class: "hover-dot", r: 3, style: `stroke:${s.color}` });
      svg.append(dot);
      return dot;
    });

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
      const nearestRef = nearestPoint(refSeries.points, ts);

      const nx = xScale(nearestRef.ts);
      hoverLine.setAttribute("x1", nx);
      hoverLine.setAttribute("x2", nx);
      hoverLine.style.opacity = 1;

      const opinion = opinionAt(bands, nearestRef.ts);
      const opinionLabel = opinion === null ? "-" : t(`view.${opinion}`);

      activeSeries.forEach((s, i) => {
        const p = nearestPoint(s.points, nearestRef.ts);
        hoverDots[i].setAttribute("cx", xScale(p.ts));
        hoverDots[i].setAttribute("cy", yScale(p.value));
        hoverDots[i].style.opacity = 1;
      });

      if (isMulti) {
        const lines = [t("strategy.tooltip.header", { date: formatTooltipTs(nearestRef.ts), opinion: opinionLabel })];
        for (const s of activeSeries) {
          const p = nearestPoint(s.points, nearestRef.ts);
          lines.push(t("strategy.tooltip.line", { maturity: t(`strategy.maturity.${s.key}`), value: p.value.toFixed(2) }));
        }
        tooltip.textContent = lines.join("\n");
      } else {
        tooltip.textContent = t("strategy.tooltip", {
          date: formatTooltipTs(nearestRef.ts),
          value: nearestRef.value.toFixed(2),
          opinion: opinionLabel,
        });
      }
      tooltip.style.opacity = 1;
      tooltip.style.left = `${(nx / CHART_W) * rect.width}px`;
      tooltip.style.top = `${(yScale(nearestRef.value) / CHART_H) * rect.height}px`;
    }

    function hide() {
      hoverLine.style.opacity = 0;
      hoverDots.forEach((dot) => (dot.style.opacity = 0));
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
    section.append(make("h3", "", title));
    if (isMulti) section.append(buildLineLegend(activeMaturities));
    section.append(wrap);
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
    wrap.append(buildDefs(), buildLegend(), buildToggle(render));
    for (const market of MARKETS) {
      const marketData = data.rates?.[market];
      if (!marketData) continue;
      const activeMaturities = MATURITIES.filter((m) => selectedMaturities.has(m.key));
      const chart = buildChart(market, marketData, data.opinions?.rows || [], activeMaturities);
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
