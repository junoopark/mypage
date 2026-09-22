// 한국어 / English 문구 사전과 번역 적용 함수.
// HTML 에서는 data-i18n="키" 로 연결하고, JS 에서는 t("키") 로 가져온다.
//   data-i18n="키"                  → 요소의 글자(textContent)를 바꾼다
//   data-i18n-html="키"             → 굵은 글씨 등 태그가 든 문구 (사전은 우리가 쓴 고정 문구라 안전)
//   data-i18n-attr="속성:키;속성:키" → title, aria-label, content 같은 속성을 바꾼다

const I18N = {
  ko: {
    // 공통
    "nav.aria": "페이지 이동",
    "nav.home": "소개",
    "nav.demo": "API 연동 실습",
    "theme.toDark": "다크",
    "theme.toLight": "라이트",
    "theme.aria.toDark": "다크 모드로 전환",
    "theme.aria.toLight": "라이트 모드로 전환",
    "lang.other": "EN",
    "lang.aria": "Switch to English",

    // 소개 페이지 — 6개 타일 (좌상단부터 가로 순서)
    "tile.viewpoint.title": "매크로 및 금리 전망",
    "tile.strategy.title": "투자 전략 히스토리",
    "tile.profile.title": "프로필",
    "tile.reports.title": "정기 보고서",
    "tile.issues.title": "이슈 보고서",
    "tile.media.title": "언론/방송",
    "tile.placeholder": "내용 준비 중",

    // 「매크로 및 금리 전망」 타일
    "viewpoint.opinion.title": "한미 국채 투자의견",
    "viewpoint.market": "시장",
    "market.US": "미국",
    "market.KR": "한국",
    "view.-2": "적극축소",
    "view.-1": "축소",
    "view.0": "중립",
    "view.1": "확대",
    "view.2": "적극확대",
    "view.group.neg": "축소",
    "view.group.neu": "중립",
    "view.group.pos": "확대",
    "viewpoint.current": "현재 전망: {label}",
    "viewpoint.prev": "직전 전망: {label}",
    "viewpoint.note.withPrev": "주: {asOf} 기준. ●는 직전 전망",
    "viewpoint.note.noPrev": "주: {asOf} 기준.",
    "viewpoint.note.dotOnly": "주: ●는 직전 전망",
    "viewpoint.topic.us": "미국",
    "viewpoint.topic.kr": "한국",
    "viewpoint.error": "데이터를 불러오지 못했습니다",

    // 「투자 전략 히스토리」 타일
    "strategy.chart.title": "{market} {maturity} 및 듀레이션 전략",
    "strategy.maturity.base": "기준금리",
    "strategy.maturity.short": "단기(2·3년)",
    "strategy.maturity.long": "10년",
    "strategy.maturity.base.title": "기준금리",
    "strategy.maturity.short.title": "2·3년 금리",
    "strategy.maturity.long.title": "10년 금리",
    "strategy.tooltip": "{date} · {value}% · {opinion}",
    "strategy.error": "데이터를 불러오지 못했습니다",

    // 「프로필」 타일
    "profile.section.career": "경력",
    "profile.section.education": "학력",
    "profile.section.certifications": "자격증",
    "profile.section.links": "링크",
    "profile.period.present": "현재",
    "profile.error": "데이터를 불러오지 못했습니다",

    // 소개 페이지
    "index.title": "박준우 — 개인 소개",
    "index.desc": "박준우의 개인 소개 페이지",
    "index.h1": "PARKBOND",
    "index.avatar": "박",
    "index.name": "박준우",
    "index.intro": "채권 시장을 분석하고 전략을 세우는 일을 합니다.",
    "index.github": "GitHub 프로필",
    "index.interests.title": "관심 분야",
    "index.interests.sub": "무엇을 파고드나",
    "index.interests.bond": "채권",
    "index.interests.rate": "금리",
    "index.interests.cloud": "클라우드 컴퓨팅",
    "index.about.title": "이 페이지는",
    "index.about.sub": "클라우드 컴퓨팅 개인 과제",
    "index.about.text":
      "HTML로 만든 소개 페이지와, FastAPI 백엔드를 호출하는 연동 실습 페이지로 이루어져 있습니다.",
    "index.about.link": "API 연동 실습 보기 →",

    // 연동 실습 페이지
    "demo.title": "API 연동 실습 — 박준우",
    "demo.desc": "FastAPI 백엔드 API를 호출하고 결과를 보여주는 연동 실습 페이지",
    "demo.h1": "API 연동 실습",
    "demo.lead":
      "이 페이지는 <strong>Vercel</strong>에 배포된 화면이 <strong>Render</strong>의 FastAPI 서버를 호출해 결과를 보여줍니다.",
    "demo.apiServer": "API 서버:",
    "demo.p1.title": "1. 서버 상태 확인",
    "demo.p2.title": "2. 프로필 불러오기",
    "demo.p3.title": "3. 방명록",
    "demo.call": "호출하기",
    "demo.out.empty": "아직 호출하지 않았습니다.",
    "demo.out.healthAria": "서버 상태 응답",
    "demo.out.profileAria": "프로필 응답",
    "demo.form.name": "이름",
    "demo.form.message": "메시지",
    "demo.form.submit": "남기기",
    "demo.form.refresh": "목록 새로고침",
    "demo.hint": "방명록은 서버 메모리에만 저장되어, 서버가 재시작되면 비워집니다.",
    "demo.back": "← 개인 소개 페이지로",
    "gb.empty": "아직 작성된 글이 없습니다. 첫 글을 남겨 보세요!",

    // 요청 상태
    "status.ready": "준비됨",
    "status.requesting": "{label} 요청 중…",
    "status.success": "{label} 성공",
    "status.failure": "{label} 실패: {reason}",
    "status.waking":
      "서버를 깨우는 중입니다… 무료 서버라 첫 응답은 최대 1분 걸릴 수 있어요",
    "label.health": "서버 상태 확인",
    "label.profile": "프로필 조회",
    "label.gbList": "방명록 조회",
    "label.gbPost": "방명록 작성",
    "err.network": "서버에 연결할 수 없습니다 (서버가 꺼져 있거나 CORS 설정을 확인하세요)",
    "err.validation": "입력값 오류: {detail}",
    "err.http": "요청 실패 (HTTP {status})",
  },

  en: {
    // Common
    "nav.aria": "Page navigation",
    "nav.home": "About",
    "nav.demo": "API Demo",
    "theme.toDark": "Dark",
    "theme.toLight": "Light",
    "theme.aria.toDark": "Switch to dark mode",
    "theme.aria.toLight": "Switch to light mode",
    "lang.other": "한국어",
    "lang.aria": "한국어로 전환",

    // About page — 6 tiles (left to right, top to bottom)
    "tile.viewpoint.title": "Current Viewpoint",
    "tile.strategy.title": "Strategy Track Record",
    "tile.profile.title": "Profile",
    "tile.reports.title": "Periodic Reports",
    "tile.issues.title": "Issue Reports",
    "tile.media.title": "Media Appearance",
    "tile.placeholder": "Content coming soon",

    // "Current Viewpoint" tile
    "viewpoint.opinion.title": "US & Korea Treasury stance",
    "viewpoint.market": "Market",
    "market.US": "US",
    "market.KR": "Korea",
    "view.-2": "Strong underweight",
    "view.-1": "Underweight",
    "view.0": "Neutral",
    "view.1": "Overweight",
    "view.2": "Strong overweight",
    "view.group.neg": "Underweight",
    "view.group.neu": "Neutral",
    "view.group.pos": "Overweight",
    "viewpoint.current": "Current view: {label}",
    "viewpoint.prev": "Previous view: {label}",
    "viewpoint.note.withPrev": "Note: as of {asOf}. ● = previous view",
    "viewpoint.note.noPrev": "Note: as of {asOf}.",
    "viewpoint.note.dotOnly": "Note: ● = previous view",
    "viewpoint.topic.us": "US",
    "viewpoint.topic.kr": "Korea",
    "viewpoint.error": "Failed to load data",

    // "Strategy Track Record" tile
    "strategy.chart.title": "{market} {maturity} & Duration Strategy",
    "strategy.maturity.base": "Policy rate",
    "strategy.maturity.short": "Short (2Y/3Y)",
    "strategy.maturity.long": "10Y",
    "strategy.maturity.base.title": "Policy Rate",
    "strategy.maturity.short.title": "2Y/3Y Rate",
    "strategy.maturity.long.title": "10Y Rate",
    "strategy.tooltip": "{date} · {value}% · {opinion}",
    "strategy.error": "Failed to load data",

    // "Profile" tile
    "profile.section.career": "Career",
    "profile.section.education": "Education",
    "profile.section.certifications": "Certifications",
    "profile.section.links": "Links",
    "profile.period.present": "Present",
    "profile.error": "Failed to load data",

    // About page
    "index.title": "Junoo Park — About",
    "index.desc": "Personal introduction page of Junoo Park",
    "index.h1": "Meet Junoo Park",
    "index.avatar": "J",
    "index.name": "Junoo Park",
    "index.intro": "I analyze bond markets and build investment strategies.",
    "index.github": "GitHub profile",
    "index.interests.title": "Interests",
    "index.interests.sub": "What I dig into",
    "index.interests.bond": "Bonds",
    "index.interests.rate": "Interest rates",
    "index.interests.cloud": "Cloud computing",
    "index.about.title": "About this page",
    "index.about.sub": "Cloud computing individual assignment",
    "index.about.text":
      "It consists of an introduction page written in HTML and a demo page that calls a FastAPI backend.",
    "index.about.link": "View the API demo →",

    // API demo page
    "demo.title": "API Demo — Junoo Park",
    "demo.desc": "A demo page that calls a FastAPI backend and displays the results",
    "demo.h1": "API Integration Demo",
    "demo.lead":
      "This page, deployed on <strong>Vercel</strong>, calls a FastAPI server on <strong>Render</strong> and shows the results.",
    "demo.apiServer": "API server:",
    "demo.p1.title": "1. Server health check",
    "demo.p2.title": "2. Load profile",
    "demo.p3.title": "3. Guestbook",
    "demo.call": "Call",
    "demo.out.empty": "Not called yet.",
    "demo.out.healthAria": "Server health response",
    "demo.out.profileAria": "Profile response",
    "demo.form.name": "Name",
    "demo.form.message": "Message",
    "demo.form.submit": "Post",
    "demo.form.refresh": "Refresh list",
    "demo.hint": "Entries are kept only in server memory and are cleared when the server restarts.",
    "demo.back": "← Back to About",
    "gb.empty": "No entries yet. Be the first to write one!",

    // Request status
    "status.ready": "Ready",
    "status.requesting": "{label}: requesting…",
    "status.success": "{label}: success",
    "status.failure": "{label}: failed — {reason}",
    "status.waking":
      "Waking up the server… On the free plan the first response can take up to a minute.",
    "label.health": "Health check",
    "label.profile": "Profile",
    "label.gbList": "Guestbook list",
    "label.gbPost": "Guestbook post",
    "err.network": "Cannot reach the server (it may be down, or check the CORS settings)",
    "err.validation": "Invalid input: {detail}",
    "err.http": "Request failed (HTTP {status})",
  },
};

// 언어 결정: 저장된 선택 → 브라우저 언어(한국어면 ko) → English
function detectLang() {
  let saved = null;
  try {
    saved = localStorage.getItem("lang");
  } catch (e) {}
  if (saved && I18N[saved]) return saved;
  return (navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en";
}

let currentLang = detectLang();

function getLang() {
  return currentLang;
}

// 날짜 표시에 쓸 로케일
function getLocale() {
  return currentLang === "ko" ? "ko-KR" : "en-US";
}

// 문구 조회. "{이름}" 자리는 params 로 채운다. 없는 키는 한국어 → 키 이름 순으로 대신한다.
function t(key, params = {}) {
  const text = I18N[currentLang][key] ?? I18N.ko[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
}

// 페이지 안의 data-i18n* 속성이 붙은 요소를 현재 언어로 바꾼다
function applyI18n() {
  document.documentElement.lang = currentLang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.dataset.i18nHtml);
  }
  for (const el of document.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":");
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
}

// 언어를 바꾸고 저장한 뒤, 동적으로 그린 화면이 다시 그릴 수 있도록 알린다
function setLang(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch (e) {}
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}
