-- GEPv30-113 STEP A-4 — 권한 에스컬레이션 취약점 차단
-- users_self_update는 컬럼 제한 없는 포괄 정책(USING/WITH CHECK auth.uid()=user_id)이라
-- service_level/approval_status 등 민감 컬럼까지 셀프 에스컬레이션이 가능했다.
-- 본인-초기화 경로는 010의 SECURITY DEFINER RPC로 이미 전환 완료 — 이 정책 없이도 동작.

DROP POLICY IF EXISTS "users_self_update" ON public.users;
