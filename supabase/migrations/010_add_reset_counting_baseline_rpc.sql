-- GEPv30-113 STEP A-2 — 통계 초기화 SECURITY DEFINER RPC
-- users_self_update 정책 삭제(011) 전에 countingResetService.js의 본인-초기화
-- 경로가 화이트리스트 컬럼(reset_baseline_at)만 갱신하도록 RPC로 전환.

CREATE OR REPLACE FUNCTION public.reset_counting_baseline(p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev timestamptz;
  v_new  timestamptz := now();
BEGIN
  SELECT reset_baseline_at INTO v_prev FROM public.users WHERE user_id = auth.uid();

  UPDATE public.users SET reset_baseline_at = v_new WHERE user_id = auth.uid();

  INSERT INTO public.reset_events
    (user_id, actor_user_id, actor_type, reset_scope, previous_baseline_at, new_baseline_at, reason)
  VALUES
    (auth.uid(), auth.uid(), 'self', 'all', v_prev, v_new, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.reset_counting_baseline(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_counting_baseline(text) TO authenticated;
