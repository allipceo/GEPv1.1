-- GEP V3.0 — users_self RLS 구멍 수정
-- 문제: schema.sql의 `users_self` 정책이 FOR ALL + WITH CHECK 없음으로 작성되어,
--       로그인한 사용자가 본인 행의 approval_status/service_level/is_paused 등을
--       자유롭게 UPDATE해 운영자 승인 절차를 우회할 수 있었다.
-- 조치: users_self를 SELECT 전용으로 좁히고, INSERT는 안전한 기본값일 때만 허용.
--       가입승인요청(real_name/phone_number/approval_status='pending')은
--       SECURITY DEFINER RPC로 분리해 화이트리스트 필드만 본인이 바꿀 수 있게 한다.
-- 참고: schema.sql / 007_v3_pilot_approval.sql 원본은 수정하지 않는다 (변경 금지 범위 준수).

DROP POLICY IF EXISTS "users_self" ON users;

CREATE POLICY "users_self_select" ON users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_self_insert" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND service_level = 1
    AND approval_status = 'pending'
    AND status = 'active'
    AND is_paused = false
  );

CREATE OR REPLACE FUNCTION submit_approval_request(
  p_real_name TEXT,
  p_phone_number TEXT,
  p_memo TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET real_name = p_real_name,
      phone_number = p_phone_number,
      approval_status = 'pending',
      approval_requested_at = NOW(),
      approval_memo = p_memo,
      status = 'active'
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION submit_approval_request(TEXT, TEXT, TEXT) TO authenticated;
