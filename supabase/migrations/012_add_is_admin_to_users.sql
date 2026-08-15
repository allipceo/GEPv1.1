-- GEPv30-113 STEP B-1 — 관리자 판별을 이메일 목록에서 DB 컬럼으로 전환
-- is_admin=true 값 설정(기존 gep_admin_emails 등록 계정 이관)은 노팀장 별도 지시 대기.
-- 현재는 컬럼만 추가, 전원 기본값 false.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
