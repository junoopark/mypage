// 「프로필」 타일 — 이름·직함/소속·소개, 경력·학력·자격증·링크
//
// 데이터 계약(JSON 모양)과 규칙은 docs/프로필타일_설계.md 에 있다.
// 지금은 data/profile.json 을 읽는다. DB/API 가 생기면 PROFILE_URL 만 API 주소로 바꾼다.
// 이름·직함·소개·경력상세는 여러 줄을 담을 수 있도록 배열(*_ko/*_en)로 받는다.

(function () {
  const PROFILE_URL = "data/profile.json";
  const body = document.querySelector('[data-tile="profile"]');
  if (!body) return;

  let data = null;
  let loadFailed = false;

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // 언어별 배열(*_ko/*_en)에서 지금 언어의 줄들을 꺼낸다. en 이 비어 있으면 ko 로 대신한다.
  function linesOf(obj, field) {
    const lang = getLang();
    const primary = obj[`${field}_${lang}`];
    if (Array.isArray(primary) && primary.length) return primary;
    const fallback = obj[`${field}_ko`];
    return Array.isArray(fallback) ? fallback : [];
  }

  // 언어별 단일 값(*_ko/*_en)에서 지금 언어의 값을 꺼낸다. en 이 비어 있으면 ko 로 대신한다.
  function valueOf(obj, field) {
    const lang = getLang();
    return obj[`${field}_${lang}`] || obj[`${field}_ko`] || "";
  }

  // 여러 줄을 각각 <p> 로 담아 container 에 붙인다
  function appendLines(container, lines, className) {
    for (const line of lines) container.append(make("p", className, line));
  }

  // "2022-03" → 한국어 "2022.03", English "Mar 2022". "2022"(연도만)이면 그대로 "2022".
  function formatYearMonth(ym) {
    if (/^\d{4}$/.test(ym)) return ym; // 연도만 있는 경우(예: 재학 중인 학위의 입학연도)
    const [y, m] = ym.split("-").map(Number);
    if (getLang() === "ko") return `${y}.${String(m).padStart(2, "0")}`;
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  // 기간 문구: 끝이 없으면 "현재/Present"
  function formatPeriod(start, end) {
    if (!start) return "";
    const from = formatYearMonth(start);
    return end ? `${from} – ${formatYearMonth(end)}` : `${from} – ${t("profile.period.present")}`;
  }

  // ── 기본 정보: 이름 · 직함/소속 · 소개 ──────────────────
  function buildBasic(basic) {
    const frag = document.createDocumentFragment();
    const nameLines = linesOf(basic, "name");
    const titleLines = linesOf(basic, "title");
    const bioLines = linesOf(basic, "bio");

    if (nameLines.length || titleLines.length) {
      const row = make("div", "profile-head");
      const text = make("div", "profile-head-text");
      if (nameLines.length) {
        const h3 = make("h3", "profile-name");
        appendLines(h3, nameLines);
        text.append(h3);
      }
      if (titleLines.length) {
        const div = make("div", "profile-title");
        appendLines(div, titleLines);
        text.append(div);
      }
      row.append(text);
      if (basic.avatar) {
        const img = document.createElement("img");
        img.className = "profile-avatar";
        img.src = basic.avatar;
        if (basic.avatar2x) img.srcset = `${basic.avatar} 1x, ${basic.avatar2x} 2x`;
        img.alt = "";
        row.append(img);
      }
      frag.append(row);
    }
    if (bioLines.length) {
      const div = make("div", "profile-bio");
      appendLines(div, bioLines);
      frag.append(div);
    }
    return frag;
  }

  // ── 경력 / 학력: 목록 + 기간 + (경력만) 상세 ─────────────
  function buildTimeline(items, kind) {
    const ul = make("ul", "profile-list");
    for (const item of items) {
      const li = make("li");
      const head = make("div", "pl-head");
      head.append(make("strong", "", valueOf(item, "org") || valueOf(item, "school")));
      const roleOrDegree = valueOf(item, "role") || valueOf(item, "degree");
      if (roleOrDegree) head.append(make("span", "pl-sub", roleOrDegree));
      li.append(head);

      const period = formatPeriod(item.start, item.end);
      if (period) li.append(make("p", "pl-period", period));

      if (kind === "career") {
        const descLines = linesOf(item, "desc");
        appendLines(li, descLines, "pl-desc");
      }
      ul.append(li);
    }
    return ul;
  }

  // ── 자격증 ──────────────────────────────────────────
  function buildCertifications(items) {
    const ul = make("ul", "profile-list");
    for (const item of items) {
      const li = make("li");
      const head = make("div", "pl-head");
      head.append(make("strong", "", valueOf(item, "name")));
      const issuer = valueOf(item, "issuer");
      const tail = [issuer, item.year].filter(Boolean).join(" · ");
      if (tail) head.append(make("span", "pl-sub", tail));
      li.append(head);
      ul.append(li);
    }
    return ul;
  }

  // ── 링크: 알약 모양 버튼 목록 ────────────────────────
  function buildLinks(items) {
    const ul = make("ul", "profile-links");
    for (const item of items) {
      if (!item.url) continue;
      const li = make("li");
      const a = make("a", "", valueOf(item, "label") || item.url);
      a.href = item.url;
      if (!item.url.startsWith("mailto:")) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      li.append(a);
      ul.append(li);
    }
    return ul;
  }

  function section(titleKey, contentEl) {
    const wrap = make("section", "profile-section");
    wrap.append(make("h4", "", t(titleKey)), contentEl);
    return wrap;
  }

  // ── 그리기 ──────────────────────────────────────────
  function render() {
    body.replaceChildren();
    if (loadFailed || !data) {
      body.append(make("p", "tile-placeholder", t(loadFailed ? "profile.error" : "tile.placeholder")));
      return;
    }
    const wrap = make("div", "profile");
    if (data.basic) wrap.append(buildBasic(data.basic));
    if (data.career?.length) wrap.append(section("profile.section.career", buildTimeline(data.career, "career")));
    if (data.education?.length) wrap.append(section("profile.section.education", buildTimeline(data.education, "education")));
    if (data.certifications?.length) wrap.append(section("profile.section.certifications", buildCertifications(data.certifications)));
    if (data.links?.length) wrap.append(section("profile.section.links", buildLinks(data.links)));
    body.append(wrap);
  }

  document.addEventListener("langchange", render);

  // 다른 화면(테스트 등)에서 값을 바꿔 그려 볼 수 있도록 열어 둔다
  window.renderProfile = (newData) => {
    data = newData;
    loadFailed = false;
    render();
  };

  fetch(PROFILE_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((json) => window.renderProfile(json))
    .catch((err) => {
      console.warn("profile: 데이터를 불러오지 못했습니다", err);
      loadFailed = true;
      render();
    });
})();
