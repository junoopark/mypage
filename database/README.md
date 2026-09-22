# database/

앱 코드(`backend/`)와 **분리해서 관리하는 데이터베이스 설계·스크립트** 폴더입니다.
아직 DB는 구축하지 않았고, 소개 페이지의 6개 화면(타일) 내용이 정해지면 여기서 시작합니다.

## 계획

| 구분 | 로컬 | 배포 |
|---|---|---|
| DB | SQLite (`sqlite:///./local.db`, 설치 불필요) | Supabase(PostgreSQL) |
| 연결 방법 | 환경변수 `DATABASE_URL` | 환경변수 `DATABASE_URL` = Supabase **Session pooler** 문자열 |

- Render는 IPv6로 나가지 못하므로 Supabase는 **Session pooler** 연결 문자열을 씁니다.
- 연결 문자열에는 비밀번호가 들어 있으므로 **저장소에 커밋하지 않습니다.** (`.env`는 `.gitignore` 대상)

## CSV 인코딩 — 한글이 깨질 때

`seed/`의 CSV는 모두 **UTF-8 BOM 포함**으로 저장돼 있습니다. Windows 엑셀은 BOM이 없는 UTF-8 CSV를 열 때 한글을 다른 인코딩으로 잘못 읽어 깨뜨립니다. 이 폴더의 CSV를 열었는데 한글이 깨져 보이면 BOM이 빠진 것이니, 엑셀에서 **파일 → 다른 이름으로 저장 → "CSV UTF-8(쉼표로 분리)"** 을 골라 저장하면 BOM이 다시 붙습니다. 새 CSV를 만들 때도 이 형식으로 저장합니다.

## 폴더 구성

```
database/
├─ README.md           # 이 문서
├─ schema.sql          # 테이블 정의 (PostgreSQL 기준)
├─ seed.sql            # 초기 데이터 (SQL)
├─ seed/               # 입력용 CSV. 타일당 1개 이상
│   ├─ viewpoint_opinions.csv
│   ├─ viewpoint_comments.csv
│   ├─ profile_basic.csv
│   ├─ profile_career.csv
│   ├─ profile_education.csv
│   ├─ profile_certifications.csv
│   └─ profile_links.csv
└─ migrations/         # 스키마 변경 이력 (0001_*.sql, 0002_*.sql …)
```

## 화면(타일)과 데이터

소개 페이지의 6개 타일이 DB의 데이터 단위와 대응합니다. 식별자는 프론트엔드의 `data-tile` 값, `js/i18n.js`의 `tile.<식별자>.*` 키와 같습니다. 필요한 데이터 항목은 타일 내용이 정해지면 채웁니다.

| 위치 | 식별자 | 한국어 | English | 필요한 데이터 |
|---|---|---|---|---|
| 좌상 | `viewpoint` | 매크로 및 금리 전망 | Current Viewpoint | 한미 국채 투자의견(-2~+2), 미국·한국 코멘트 2개 → [설계서](../docs/전망타일_설계.md) |
| 중상 | `strategy` | 투자 전략 히스토리 | Strategy Track Record | 미국·한국 10년 금리 추이, 투자의견 이력(viewpoint와 공유) → [설계서](../docs/전략타일_설계.md) |
| 우상 | `profile` | 프로필 | Profile | 이름·직함/소속·소개, 경력·학력·자격증·링크 → [설계서](../docs/프로필타일_설계.md) |
| 좌하 | `reports` | 정기 보고서 | Periodic Reports | (미정) |
| 중하 | `issues` | 이슈 보고서 | Issue Reports | (미정) |
| 우하 | `media` | 언론/방송 | Media Appearance | (미정) |

## 앱 코드와의 관계

| 역할 | 위치 |
|---|---|
| 테이블 정의 (SQL, 사람이 읽는 기준본) | `database/schema.sql` |
| 테이블 정의 (Python ORM) | `backend/app/db/models.py` |
| DB 연결·세션 | `backend/app/db/session.py` |
| 조회·저장 로직 | `backend/app/crud/` |
| API 입출력 모양 (Pydantic) | `backend/app/schemas.py` |

`schema.sql`과 `db/models.py`는 같은 구조를 두 형태로 표현한 것이므로, 테이블을 바꿀 때 함께 고칩니다.

## 진행 순서 (예정)

1. 6개 화면의 내용을 확정하고, 화면마다 필요한 데이터를 표로 정리한다.
2. `schema.sql`에 테이블을 정의하고 `seed.sql`에 초기 데이터를 넣는다.
3. `backend/requirements.txt`에 `sqlalchemy`, `psycopg2-binary`를 추가한다.
4. `db/session.py`, `db/models.py`, `crud/`, 라우터를 채운다.
5. 로컬(SQLite)에서 확인한 뒤 Supabase를 만들어 Render에 `DATABASE_URL`을 설정한다.
