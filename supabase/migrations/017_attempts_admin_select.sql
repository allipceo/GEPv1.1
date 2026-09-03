-- GEPv30-157: 관리자 대시보드(/admin/dashboard) 교차 조회 허용
-- 관리자(gep_is_admin())가 전 사용자 attempts를 SELECT할 수 있도록 정책 추가.
-- 기존 attempts_self (auth.uid() = user_id) 정책은 그대로 유지 —
-- 일반 사용자의 조회/삽입 동작은 불변. (permissive 정책은 OR로 결합)
-- users_admin_select 와 동일 패턴.
--
-- 롤백: DROP POLICY attempts_admin_select ON public.attempts;

CREATE POLICY attempts_admin_select ON public.attempts
  FOR SELECT
  USING (public.gep_is_admin());
