// API 연동 실습 페이지 — 백엔드를 호출하고 결과를 화면에 표시한다.
// API_BASE_URL 은 config.js 에 있다.

const $ = (selector) => document.querySelector(selector);

$("#api-base").textContent = API_BASE_URL;
$("#docs-link").href = `${API_BASE_URL}/docs`;

// ── 상태 표시 ─────────────────────────────────────────
function setStatus(text, kind = "") {
  const el = $("#status");
  el.textContent = text;
  el.className = `status ${kind}`.trim();
}

// ── API 호출 공통 함수 ─────────────────────────────────
function errorMessage(status, data) {
  if (status === 422 && Array.isArray(data?.detail)) {
    // FastAPI 검증 오류: 항목별 메시지를 모아서 보여준다
    return `입력값 오류: ${data.detail.map((d) => d.msg).join(", ")}`;
  }
  return `요청 실패 (HTTP ${status})`;
}

async function api(path, options) {
  // Render 무료 플랜은 잠들어 있다가 첫 요청에 30~60초가 걸린다. 3초가 넘으면 안내한다.
  const wakeTimer = setTimeout(
    () => setStatus("서버를 깨우는 중입니다… 무료 서버라 첫 응답은 최대 1분 걸릴 수 있어요", "loading"),
    3000
  );
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(errorMessage(res.status, data));
    return data;
  } finally {
    clearTimeout(wakeTimer);
  }
}

// 요청 한 번을 실행하고 상태 줄에 결과를 반영한다
async function run(label, task) {
  setStatus(`${label} 요청 중…`, "loading");
  try {
    const result = await task();
    setStatus(`${label} 성공`, "ok");
    return result;
  } catch (err) {
    const network = err instanceof TypeError; // fetch 자체가 실패한 경우
    setStatus(
      network
        ? `${label} 실패: 서버에 연결할 수 없습니다 (서버가 꺼져 있거나 CORS 설정을 확인하세요)`
        : `${label} 실패: ${err.message}`,
      "error"
    );
    return null;
  }
}

// ── 1, 2. 상태 확인 · 프로필 ───────────────────────────
function showJson(selector, data) {
  $(selector).textContent = JSON.stringify(data, null, 2);
}

$("#btn-health").addEventListener("click", async () => {
  const data = await run("서버 상태 확인", () => api("/health"));
  if (data) showJson("#out-health", data);
});

$("#btn-profile").addEventListener("click", async () => {
  const data = await run("프로필 조회", () => api("/profile"));
  if (data) showJson("#out-profile", data);
});

// ── 3. 방명록 ─────────────────────────────────────────
function renderGuestbook(entries) {
  const list = $("#guestbook-list");
  list.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "아직 작성된 글이 없습니다. 첫 글을 남겨 보세요!";
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
    time.textContent = new Date(e.created_at).toLocaleString("ko-KR");
    head.append(name, time);
    const message = document.createElement("p");
    message.textContent = e.message;
    item.append(head, message);
    list.append(item);
  }
}

async function loadGuestbook() {
  const entries = await run("방명록 조회", () => api("/guestbook?limit=10"));
  if (entries) renderGuestbook(entries);
}

$("#btn-refresh").addEventListener("click", loadGuestbook);

$("#guestbook-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const body = { name: form.name.value.trim(), message: form.message.value.trim() };
  const created = await run("방명록 작성", () =>
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

// 페이지를 열면 방명록을 한 번 불러온다 (잠든 서버를 미리 깨우는 효과도 있다)
loadGuestbook();
