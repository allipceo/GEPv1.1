-- GEP V3.0 Phase 3 pilot — add users.is_paused
-- AdminUsers.jsx / authStore.js already reference users.is_paused, but it was
-- only ever defined as part of the (unapplied) Phase 7 migration
-- (supabase/migrations/phase7_tables.sql). This migration extracts just that
-- one column so the Phase 3 pilot admin approval flow works without pulling
-- in unrelated Phase 7 billing/verification schema.
-- Run in Supabase SQL Editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;
