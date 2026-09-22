# Junoo Park's Page

Fixed Income Strategist 박준우의 개인 소개 페이지와, 프론트엔드·백엔드 연동 실습 프로젝트입니다.
(클라우드 컴퓨팅 개인 과제)

## 프로젝트 소개

- **개인 소개 페이지**: HTML/CSS로 작성한 소개 페이지입니다.
- **API 연동 실습 페이지**: 배포된 화면이 FastAPI 백엔드를 호출해 서버 상태, 프로필, 방명록 결과를 보여줍니다.
- 두 페이지는 상단 내비게이션과 본문 링크로 서로 이동할 수 있습니다.
- **다크모드**: 헤더 버튼으로 전환합니다. 처음에는 OS 설정을 따르고, 직접 고르면 그 선택을 기억합니다.
- **한국어 / English**: 헤더 버튼으로 전환합니다. 처음에는 브라우저 언어를 따르고, 직접 고르면 그 선택을 기억합니다.

## 주요 구성

| 구분 | 기술 | 배포처 | 폴더 |
|---|---|---|---|
| 프론트엔드 | HTML · CSS · JavaScript (빌드 없음) | Vercel | [`frontend/`](frontend) |
| 백엔드 | Python · FastAPI · Pydantic | Render | [`backend/`](backend) |
| 소스 코드·문서 | Git | GitHub | 저장소 전체 |

```
mypage/
├─ frontend/            # Vercel (Root Directory)
│   ├─ index.html       # 개인 소개
│   ├─ demo.html        # API 연동 실습
│   ├─ css/style.css    # 라이트/다크 색상 토큰 포함
│   └─ js/
│       ├─ config.js    # API 주소 (로컬/배포 자동 선택)
│       ├─ theme-init.js# 다크모드 초기값 (깜빡임 방지)
│       ├─ i18n.js      # 한국어/English 문구 사전
│       ├─ main.js      # 테마·언어 전환 버튼
│       └─ demo.js      # API 호출·결과 표시
├─ backend/             # Render (Root Directory)
│   ├─ requirements.txt
│   └─ app/             # main.py, schemas.py, routers/
└─ docs/작업설계서.md
```

## 배포 주소

| 항목 | 주소 |
|---|---|
| 개인 소개 페이지 (Vercel) | https://mypage-fawn-nine.vercel.app |
| API 연동 실습 페이지 (Vercel) | https://mypage-fawn-nine.vercel.app/demo.html |
| 백엔드 Swagger UI (Render) | https://junoopark.onrender.com/docs |
| GitHub 저장소 | https://github.com/junoopark/mypage |

> Render 무료 플랜은 일정 시간 요청이 없으면 서버가 잠듭니다. 첫 요청은 30~60초 걸릴 수 있으며, 연동 실습 페이지에 안내 문구가 표시됩니다.

## API 목록

| 메서드 | 경로 | 설명 | 응답 |
|---|---|---|---|
| GET | `/` | 환영 메시지 | 200 |
| GET | `/health` | 서버 생존 확인 | 200 |
| GET | `/profile` | 프로필 정보 | 200 |
| GET | `/guestbook?limit=10` | 최근 방명록 조회 | 200 · 422 |
| POST | `/guestbook` | 방명록 작성 (이름 1~20자, 메시지 1~200자) | 201 · 422 |

- 방명록은 서버 메모리에 저장됩니다(최대 50건). 서버가 재시작되거나 잠들었다 깨어나면 비워집니다.
- 허용할 프론트엔드 주소는 환경변수 `ALLOWED_ORIGINS`로 지정합니다(쉼표로 구분, 끝에 `/` 없이).

## 로컬 실행 방법

Python 3.11 이상과 Git이 필요합니다. (아래는 Windows PowerShell 기준)

**다른 PC에서 이어서 작업하기**

```powershell
git clone https://github.com/junoopark/mypage.git
cd mypage
# 새 PC에서 처음 커밋하기 전에 한 번만 (이 저장소에만 적용)
git config user.name "이름"
git config user.email "이메일"
```

작업을 시작하기 전에는 `git pull`로 최신 내용을 받고, 끝나면 `git add` → `git commit` → `git push`로 올립니다. 가상환경(`.venv`)은 저장소에 포함되지 않으므로 아래 백엔드 설명대로 PC마다 새로 만듭니다.

**백엔드** — `http://127.0.0.1:8000/docs`

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
fastapi dev app/main.py
```

`.env`는 커밋되지 않으므로 PC마다 새로 만들고, `FRED_API_KEY`·`ECOS_API_KEY` 값을 채웁니다(발급 방법은 `.env.example` 주석 참고, 값은 `G:\내 드라이브\coding\shared\api_keys.env`에도 있습니다). 없으면 다른 API는 그대로 동작하고 `/strategy`만 502를 반환합니다.

**프론트엔드** — `http://127.0.0.1:5500`

```powershell
# 저장소 루트에서 (VS Code Live Server 확장을 써도 됩니다)
python -m http.server 5500 -d frontend --bind 127.0.0.1
```

`frontend/js/config.js`가 접속 주소를 보고 API 주소를 자동으로 고릅니다. `localhost`/`127.0.0.1`이면 로컬 백엔드(`:8000`)를, 그 밖에는 Render 주소를 호출합니다.

## 배포 설정

| 플랫폼 | 설정 |
|---|---|
| Render | Root Directory `backend` · Build `pip install -r requirements.txt` · Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` · 환경변수 `ALLOWED_ORIGINS` = Vercel 주소 |
| Vercel | Root Directory `frontend` · Framework Preset `Other` · 빌드 없음 |

`main` 브랜치에 push하면 Vercel과 Render가 자동으로 다시 배포합니다.
