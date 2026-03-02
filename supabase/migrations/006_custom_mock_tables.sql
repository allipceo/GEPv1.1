-- GEP_070 Phase 6-1 맞춤 모의고사 테이블
-- 작성일: 2026.03.02
-- 실행: Supabase 대시보드 → SQL Editor에서 실행
-- 주의: mock_exam_tables.sql 이후에 실행할 것

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. custom_mock_sessions — 맞춤 모의고사 세션 (회당 1행)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE custom_mock_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(user_id),

  -- 모드 및 타이머
  mode             TEXT        NOT NULL CHECK (mode IN ('standard', 'weakness')),
  timer_type       TEXT        NOT NULL CHECK (timer_type IN ('full', 'short')),

  -- 1교시 결과
  part1_score      NUMERIC(5,1),
  part1_completed  BOOLEAN     NOT NULL DEFAULT false,
  part1_time_spent INTEGER,                     -- 초 단위

  -- 2교시 결과
  part2_score      NUMERIC(5,1),
  part2_completed  BOOLEAN     NOT NULL DEFAULT false,
  part2_time_spent INTEGER,

  -- 최종 결과
  total_average    NUMERIC(5,1),
  is_pass          BOOLEAN,
  is_complete      BOOLEAN     NOT NULL DEFAULT false,

  -- 메타 (약점 세부과목, 문제 ID 목록 등)
  metadata         JSONB,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_sessions_user
  ON custom_mock_sessions(user_id);

CREATE INDEX idx_custom_sessions_user_complete
  ON custom_mock_sessions(user_id, is_complete);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. custom_mock_attempts — 문제별 응답 원장
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE custom_mock_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES custom_mock_sessions(id),
  user_id         UUID        NOT NULL REFERENCES users(user_id),
  question_id     TEXT        NOT NULL,
  selected_answer INTEGER,                      -- 1~4, null=미응답
  is_correct      BOOLEAN     NOT NULL,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_attempts_session
  ON custom_mock_attempts(session_id);

CREATE INDEX idx_custom_attempts_user
  ON custom_mock_attempts(user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. RLS (Row Level Security) — 본인 데이터만 조회/생성
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE custom_mock_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_mock_attempts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_sessions_user_policy ON custom_mock_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY custom_attempts_user_policy ON custom_mock_attempts
  FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_custom_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_custom_sessions_updated_at
  BEFORE UPDATE ON custom_mock_sessions
  FOR EACH ROW EXECUTE FUNCTION update_custom_sessions_updated_at();
