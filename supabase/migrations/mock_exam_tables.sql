-- GEP Phase 5 모의고사 테이블
-- 작성일: 2026.03.01
-- 실행: Supabase 대시보드 → SQL Editor에서 실행
-- 주의: supabase/schema.sql 이후에 실행할 것

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. mock_exam_sessions — 회차별 세션 (최신 응시 기준)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE mock_exam_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(user_id),
  round            INTEGER     NOT NULL CHECK (round BETWEEN 23 AND 31),
  attempt_number   INTEGER     NOT NULL DEFAULT 1,

  -- 1교시
  part1_score      NUMERIC(5,1),
  part1_completed  BOOLEAN     NOT NULL DEFAULT false,
  part1_time_spent INTEGER,                   -- 초 단위

  -- 2교시
  part2_score      NUMERIC(5,1),
  part2_completed  BOOLEAN     NOT NULL DEFAULT false,
  part2_time_spent INTEGER,

  -- 최종 결과
  total_average    NUMERIC(5,1),
  is_pass          BOOLEAN,
  is_complete      BOOLEAN     NOT NULL DEFAULT false,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_round
  ON mock_exam_sessions(user_id, round);

CREATE INDEX idx_sessions_user_complete
  ON mock_exam_sessions(user_id, is_complete);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. mock_exam_attempts — 문제별 응답 원장
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE mock_exam_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES mock_exam_sessions(id),
  user_id         UUID        NOT NULL REFERENCES users(user_id),
  question_id     TEXT        NOT NULL,
  selected_answer INTEGER,                    -- 1~4, null=미응답
  is_correct      BOOLEAN     NOT NULL,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mock_attempts_session
  ON mock_exam_attempts(session_id);

CREATE INDEX idx_mock_attempts_user
  ON mock_exam_attempts(user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. RLS (Row Level Security) — 본인 데이터만 접근
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE mock_exam_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_attempts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY mock_sessions_user_policy ON mock_exam_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY mock_attempts_user_policy ON mock_exam_attempts
  FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_mock_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mock_sessions_updated_at
  BEFORE UPDATE ON mock_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION update_mock_sessions_updated_at();
