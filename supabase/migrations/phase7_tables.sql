-- GEP_125 Phase 7 서비스 인프라 테이블
-- 작성일: 2026.03.07
-- 실행: Supabase 대시보드 → SQL Editor에서 실행
-- 주의: 006_custom_mock_tables.sql 이후에 실행할 것
-- 기존 데이터 영향 없음 (IF NOT EXISTS + DEFAULT 사용)

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. users 테이블 확장 — 실명인증 / 시험정보 / 결제 / 중단 관리
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified           BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_name         TEXT,
  ADD COLUMN IF NOT EXISTS verified_method       TEXT,          -- 'kakao' | 'pass' | 'naver'
  ADD COLUMN IF NOT EXISTS verified_at           TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS exam_type             TEXT          DEFAULT 'insurance_broker',
  ADD COLUMN IF NOT EXISTS exam_date             DATE,
  ADD COLUMN IF NOT EXISTS is_exam_date_set      BOOLEAN       DEFAULT false,

  ADD COLUMN IF NOT EXISTS billing_cycle         TEXT          DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS next_billing_date     DATE,
  ADD COLUMN IF NOT EXISTS auto_renew            BOOLEAN       DEFAULT true,

  ADD COLUMN IF NOT EXISTS is_paused             BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_retention_until  TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. billing_history — 결제 이력
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_history (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(user_id),

  amount                INTEGER     NOT NULL,   -- 4900 or 7900 (원)
  service_level         INTEGER     NOT NULL,   -- 2~5
  billing_period_start  DATE        NOT NULL,
  billing_period_end    DATE        NOT NULL,

  status                TEXT        NOT NULL,   -- 'pending' | 'success' | 'failed' | 'refunded'
  payment_method        TEXT,                   -- 'card' | 'kakao_pay' | 'naver_pay'
  pg_transaction_id     TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_user
  ON billing_history(user_id, created_at DESC);

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_history_user_policy ON billing_history
  FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. level_change_history — 레벨 변경 이력 (주간 확인 선택 포함)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS level_change_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(user_id),

  from_level      INTEGER     NOT NULL,
  to_level        INTEGER     NOT NULL,
  change_type     TEXT        NOT NULL,   -- 'upgrade' | 'downgrade' | 'pause' | 'resume'
  effective_date  DATE        NOT NULL,
  reason          TEXT,                   -- 사용자 선택 메모 (optional)

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_level_change_user
  ON level_change_history(user_id, created_at DESC);

ALTER TABLE level_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY level_change_history_user_policy ON level_change_history
  FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. exam_types — 지원 시험 종류 및 일정 (공개 데이터, 코드 배포 없이 갱신 가능)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_types (
  id            TEXT        PRIMARY KEY,          -- 'insurance_broker', 'real_estate' 등
  name          TEXT        NOT NULL,             -- '손해보험중개사'
  is_enabled    BOOLEAN     NOT NULL DEFAULT true,
  exam_schedule JSONB,
  -- 예시: [{"year":2026,"date1":"2026-06-14","date2":"2026-09-27"}]

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;

-- 전체 읽기 허용 (공개 마스터 데이터)
CREATE POLICY exam_types_public_read ON exam_types
  FOR SELECT USING (true);

-- 초기 데이터
INSERT INTO exam_types (id, name, is_enabled, exam_schedule)
VALUES (
  'insurance_broker',
  '손해보험중개사',
  true,
  '[{"year":2026,"date1":"2026-06-14","date2":"2026-09-27"}]'
)
ON CONFLICT (id) DO NOTHING;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_exam_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_exam_types_updated_at
  BEFORE UPDATE ON exam_types
  FOR EACH ROW EXECUTE FUNCTION update_exam_types_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. attempts / ox_attempts — service_level_at_attempt 컬럼 추가
--    풀이 시점의 서비스 레벨 기록 (게스트=1, 유료회원=2~5)
--    기존 레코드는 DEFAULT 1 적용
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS service_level_at_attempt INTEGER DEFAULT 1;

ALTER TABLE ox_attempts
  ADD COLUMN IF NOT EXISTS service_level_at_attempt INTEGER DEFAULT 1;
