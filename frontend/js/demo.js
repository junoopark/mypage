// API 연동 실습 페이지 — 백엔드를 호출하고 결과를 화면에 표시한다.
// API_BASE_URL 은 config.js, t()·getLocale() 은 i18n.js 에 있다.

const $ = (selector) => document.querySelector(selector);

$("#api-base").textContent = API_BASE_URL;
$("#docs-link").href = `${API_BASE_URL}/docs`;

// ── 상태 표시 ─────────────────────────────────────────
// 문구를 "함수"로 보관해 두면, 언어를 바꿀 때 같은 상태를 새 언어로 다시 그릴 수 있다.
let statusText = () => t("status.ready");
let statusKind = "";

function renderStatus() {
  const el = $("#status");
  el.textContent = statusText();
  el.className = `status ${statusKind}`.trim();
}

function setStatus(textFn, kind = "") {
  statusText = textFn;
  statusKind = kind;
  renderStatus();
}

// ── API 호출 공통 함수 ─────────────────────────────────
// 실패 원인도 "언어를 바꿔도 다시 만들 수 있는 함수(describe)"로 들고 다닌다.
class ApiError extends Error {
  constructor(describe) {
    super("API error");
    this.describe = describe;
  }
}

function errorFrom(status, data) {
  if (status === 422 && Array.isArray(data?.detail)) {
    // FastAPI 검증 오류: 항목별 메시지를 모아서 보여준다 (서버 메시지는 영어)
    const detail = data.detail.map((d) => d.msg).join(", ");
    return new ApiError(() => t("err.validation", { detail }));
  }
  return new ApiError(() => t("err.http", { status }));
}

async function api(path, options) {
  // Render 무료 플랜은 잠들어 있다가 첫 요청에 30~60초가 걸린다. 3초가 넘으면 안내한다.
  const wakeTimer = setTimeout(() => setStatus(() => t("status.waking"), "loading"), 3000);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw errorFrom(res.status, data);
    return data;
  } finally {
    clearTimeout(wakeTimer);
  }
}

// 요청 한 번을 실행하고 상태 줄에 결과를 반영한다. labelKey 는 i18n 의 "label.*" 키.
async function run(labelKey, task) {
  const label = () => t(labelKey);
  setStatus(() => t("status.requesting", { label: label() }), "loading");
  try {
    const result = await task();
    setStatus(() => t("status.success", { label: label() }), "ok");
    return result;
  } catch (err) {
    let reason;
    if (err instanceof TypeError) {
      reason = () => t("err.network"); // fetch 자체가 실패한 경우
    } else if (err instanceof ApiError) {
      reason = err.describe;
    } else {
      reason = () => String(err.message);
    }
    setStatus(() => t("status.failure", { label: label(), reason: reason() }), "error");
    return null;
  }
}

// ── 1, 2. 상태 확인 · 프로필 ───────────────────────────
function showJson(selector, data) {
  const el = $(selector);
  el.removeAttribute("data-i18n"); // 결과가 들어오면 "아직 호출하지 않았습니다" 문구는 더 이상 갱신하지 않는다
  el.textContent = JSON.stringify(data, null, 2);
}

$("#btn-health").addEventListener("click", async () => {
  const data = await run("label.health", () => api("/health"));
  if (data) showJson("#out-health", data);
});

$("#btn-profile").addEventListener("click", async () => {
  const data = await run("label.profile", () => api("/profile"));
  if (data) showJson("#out-profile", data);
});

// ── 3. 방명록 ─────────────────────────────────────────
let lastEntries = null; // 언어를 바꿀 때 시각 표시를 다시 그리기 위해 보관

function renderGuestbook(entries) {
  lastEntries = entries;
  const list = $("#guestbook-list");
  list.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = t("gb.empty");
    list.append(empty);
    return;
  }
  for (const e of entries) {
    // 사용자가 입력한 글이므로 innerHTML 이 아니라 textContent 로만 넣는다 (XSS 방지)
    const item = document.createElement("li");
    const head = document.createElement("div");
    head.className = "gb-head";
    const name = document.createElement("strong");
    name.textContent = e.name;
    const time = document.createElement("time");
    time.dateTime = e.created_at;
    time.textContent = new Date(e.created_at).toLocaleString(getLocale());
    head.append(name, time);
    const message = document.createElement("p");
    message.textContent = e.message;
    item.append(head, message);
    list.append(item);
  }
}

async function loadGuestbook() {
  const entries = await run("label.gbList", () => api("/guestbook?limit=10"));
  if (entries) renderGuestbook(entries);
}

$("#btn-refresh").addEventListener("click", loadGuestbook);

$("#guestbook-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const body = { name: form.name.value.trim(), message: form.message.value.trim() };
  const created = await run("label.gbPost", () =>
    api("/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  if (created) {
    form.message.value = "";
    await loadGuestbook();
  }
});

// 언어가 바뀌면 동적으로 그린 부분(상태 줄, 방명록 목록)을 새 언어로 다시 그린다
document.addEventListener("langchange", () => {
  renderStatus();
  if (lastEntries) renderGuestbook(lastEntries);
});

// 페이지를 열면 방명록을 한 번 불러온다 (잠든 서버를 미리 깨우는 효과도 있다)
renderStatus();
loadGuestbook();
