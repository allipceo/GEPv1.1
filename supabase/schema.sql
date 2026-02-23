-- GEP v1.1 Supabase 스키마
-- 작성일: 2026.02.22
-- 실행: Supabase 대시보드 → SQL Editor에서 전체 실행

-- ──────────────────────────────────────────────
-- 1. users
-- ──────────────────────────────────────────────
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'active',
  service_level INTEGER NOT NULL DEFAULT 1
    CHECK (service_level BETWEEN 1 AND 5),
  features_override JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ──────────────────────────────────────────────
-- 2. oauth_accounts
-- ──────────────────────────────────────────────
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  UNIQUE (provider, provider_user_id)
);

-- ──────────────────────────────────────────────
-- 3. sessions
-- ──────────────────────────────────────────────
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  refresh_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- ──────────────────────────────────────────────
-- 4. devices
-- ──────────────────────────────────────────────
CREATE TABLE devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  platform TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- ──────────────────────────────────────────────
-- 5. subscriptions
-- ──────────────────────────────────────────────
CREATE TABLE subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 6. attempts (핵심 원장)
-- ──────────────────────────────────────────────
CREATE TABLE attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  question_id TEXT NOT NULL,
  question_round INTEGER NOT NULL,
  subject TEXT NOT NULL,
  sub_subject TEXT NOT NULL,
  study_mode TEXT NOT NULL DEFAULT 'round',
  selected_answer INTEGER NOT NULL CHECK (selected_answer BETWEEN 1 AND 4),
  is_correct BOOLEAN NOT NULL,
  exam_version TEXT NOT NULL DEFAULT '1.0',
  service_level INTEGER NOT NULL DEFAULT 1,
  device_id UUID REFERENCES devices(device_id),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 7. question_stats (집계 캐시 — 조회 성능용)
-- ──────────────────────────────────────────────
CREATE TABLE question_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  question_id TEXT NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  UNIQUE (user_id, question_id)
);

-- ──────────────────────────────────────────────
-- 8. progress (이어풀기)
-- ──────────────────────────────────────────────
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  filter_key TEXT NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, filter_key)
);

-- ──────────────────────────────────────────────
-- RLS (Row Level Security)
-- ──────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self" ON users
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "attempts_self" ON attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "qstats_self" ON question_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "progress_self" ON progress
  FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 인덱스
-- ──────────────────────────────────────────────
CREATE INDEX idx_attempts_user        ON attempts(user_id);
CREATE INDEX idx_attempts_question    ON attempts(question_id);
CREATE INDEX idx_attempts_user_round  ON attempts(user_id, question_round);
CREATE INDEX idx_attempts_user_subject ON attempts(user_id, sub_subject);
CREATE INDEX idx_progress_user        ON progress(user_id, filter_key);

-- ──────────────────────────────────────────────
-- RPC 함수 — question_stats 원자적 증가
-- ★ GEP_039 STEP3 추가: Supabase SQL Editor에서 별도 실행 필요
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_question_stat(
  p_question_id TEXT,
  p_is_correct  BOOLEAN
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO question_stats (user_id, question_id, total_attempts, correct_count, last_attempted_at)
  VALUES (
    auth.uid(),
    p_question_id,
    1,
    CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    total_attempts    = question_stats.total_attempts + 1,
    correct_count     = question_stats.correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    last_attempted_at = NOW();
END;
$$;
