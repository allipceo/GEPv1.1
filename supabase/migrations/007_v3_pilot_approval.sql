-- GEP V3.0 Phase 3 pilot approval and reset baseline
-- Run in Supabase SQL Editor before deploying the Phase 3 frontend.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS real_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'paused')),
  ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS approval_memo TEXT,
  ADD COLUMN IF NOT EXISTS reset_baseline_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS reset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  actor_user_id UUID REFERENCES users(user_id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('self', 'operator')),
  reset_scope TEXT NOT NULL DEFAULT 'all',
  previous_baseline_at TIMESTAMPTZ,
  new_baseline_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gep_admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GEP V3.0 phase-1 pilot fixed operator.
-- Operator: 조은상 / choeunsang@gmail.com / 010-2067-6442
-- This fixed seed is for the phase-1 pilot only and should be replaced
-- by editable operator management before commercial launch.
INSERT INTO gep_admin_emails (email)
VALUES ('choeunsang@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION gep_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM gep_admin_emails
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

ALTER TABLE reset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gep_admin_emails ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_users_approval_status
  ON users(approval_status, approval_requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_reset_events_user
  ON reset_events(user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_admin_select'
  ) THEN
    CREATE POLICY users_admin_select ON users
      FOR SELECT USING (gep_is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_admin_update'
  ) THEN
    CREATE POLICY users_admin_update ON users
      FOR UPDATE USING (gep_is_admin())
      WITH CHECK (gep_is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reset_events'
      AND policyname = 'reset_events_self_select'
  ) THEN
    CREATE POLICY reset_events_self_select ON reset_events
      FOR SELECT USING (auth.uid() = user_id OR gep_is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reset_events'
      AND policyname = 'reset_events_self_insert'
  ) THEN
    CREATE POLICY reset_events_self_insert ON reset_events
      FOR INSERT WITH CHECK (auth.uid() = user_id OR gep_is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gep_admin_emails'
      AND policyname = 'gep_admin_emails_admin_read'
  ) THEN
    CREATE POLICY gep_admin_emails_admin_read ON gep_admin_emails
      FOR SELECT USING (gep_is_admin());
  END IF;
END $$;

-- Additional operator accounts can be added manually if needed:
-- INSERT INTO gep_admin_emails (email) VALUES ('operator@example.com')
-- ON CONFLICT (email) DO NOTHING;
