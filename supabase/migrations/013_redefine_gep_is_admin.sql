-- GEPv30-113 STEP B-3 — gep_is_admin()을 gep_admin_emails 테이블 참조에서
-- users.is_admin 컬럼 참조로 전환. 014에서 gep_admin_emails를 DROP하기 전
-- 반드시 먼저 적용해야 한다 (5개 RLS 정책이 이 함수를 사용: users_admin_select,
-- users_admin_update, reset_events_self_select, reset_events_self_insert,
-- gep_admin_emails_admin_read).

CREATE OR REPLACE FUNCTION public.gep_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE user_id = auth.uid()),
    false
  );
$$;
