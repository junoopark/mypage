-- 데이터베이스 스키마 (PostgreSQL / Supabase 기준) — 초안, 아직 적용하지 않았다.
--
-- 테이블을 바꿀 때는 backend/app/db/models.py 도 함께 고친다.
-- 이름 규칙: 테이블은 복수형 소문자 snake_case, 기본키는 id, 생성 시각은 created_at (timestamptz)
-- 설명: docs/전망타일_설계.md


-- ═══ 타일 1: 매크로 및 금리 전망 (viewpoint) ═══════════════════════════

-- 한미 국채 투자의견. 미국과 한국은 각자의 기준일에 독립적으로 한 행씩 쌓는다
-- (한 시장만 바뀌면 그 시장의 행만 추가한다. 이력 = 「투자 전략 히스토리」와 공용).
-- 화면은 시장별로 가장 최근 행을 "현재", 그 시장의 바로 앞 행을 "직전"으로 쓴다.
create table treasury_opinions (
  id          bigint generated always as identity primary key,
  market      text      not null check (market in ('US', 'KR')),  -- 미국 / 한국
  as_of       date      not null,                                 -- 그 시장의 기준일
  opinion     smallint  not null check (opinion between -2 and 2),-- -2 적극축소 · -1 축소 · 0 중립 · 1 확대 · 2 적극확대
  report_url  text,                                               -- 기준일 날짜에 걸 링크 (선택)
  created_at  timestamptz not null default now(),
  unique (market, as_of)
);

-- 시장별 코멘트(미국 / 한국 각 2~3줄). 시장마다 기준일별로 한 행씩 쌓고, 화면은 시장별로 가장 최근 것을 쓴다.
create table viewpoint_comments (
  id          bigint generated always as identity primary key,
  as_of       date      not null,
  topic       text      not null check (topic in ('us', 'kr')),
  text_ko     text      not null check (char_length(text_ko) <= 200),
  text_en     text      check (text_en is null or char_length(text_en) <= 400),  -- 없으면 화면이 한국어로 대신한다
  created_at  timestamptz not null default now(),
  unique (as_of, topic)
);


-- ═══ 타일 3: 프로필 (profile) ═══════════════════════════════════════════
-- 표시 순서는 각 테이블의 id(생성 순서) 그대로 쓴다 — 별도 순서 열을 두지 않는다.
-- 여러 줄이 필요한 항목(이름·직함·소개·경력상세)은 text[] 배열로 저장한다.

-- 기본 정보. 한 사람의 정보이므로 한 행만 쓴다.
create table profile_basic (
  id          bigint generated always as identity primary key,
  name_ko     text[]  not null,
  name_en     text[],
  title_ko    text[]  not null,   -- 직함·소속. 줄마다 하나씩
  title_en    text[],
  bio_ko      text[]  not null,   -- 짧은 소개. 줄마다 하나씩
  bio_en      text[],
  updated_at  timestamptz not null default now()
);

-- 경력
create table profile_career (
  id           bigint generated always as identity primary key,
  org_ko       text  not null,
  org_en       text,
  role_ko      text  not null,
  role_en      text,
  period_start date  not null,   -- 월 단위. 일자는 항상 1일로 저장 (예: 2022-03-01)
  period_end   date,             -- null 이면 "재직중/현재"
  desc_ko      text[],           -- 상세 설명. 줄마다 하나씩 (선택)
  desc_en      text[]
);

-- 학력
create table profile_education (
  id           bigint generated always as identity primary key,
  school_ko    text  not null,
  school_en    text,
  degree_ko    text,             -- 학위·전공
  degree_en    text,
  period_start date  not null,
  period_end   date
);

-- 자격증 / 전문 분야
create table profile_certifications (
  id         bigint generated always as identity primary key,
  name_ko    text  not null,
  name_en    text,
  issuer_ko  text,
  issuer_en  text,
  year       smallint
);

-- 연락처 / 링크
create table profile_links (
  id        bigint generated always as identity primary key,
  label_ko  text  not null,
  label_en  text,
  url       text  not null
);
