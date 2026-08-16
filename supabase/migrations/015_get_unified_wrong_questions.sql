-- GEPv30-115 L2-F 통합오답복습 — attempts 원장 기반 오답 집계 RPC
-- wrong_questions/ox_wrong_questions 테이블이 DB에 존재하지 않아 통합오답복습이
-- 항상 0문제로 표시되던 문제 해결. wrong_count는 누적(전체 오답 시도 수),
-- last_correct는 최신 시도 기준으로 분리 — 최근에 맞히면 목록에서 제외되지만
-- 누적 오답 횟수(난이도 분류)는 계속 유지된다.
-- attempts_self RLS 정책(auth.uid()=user_id, SELECT 포함)에 의존하므로
-- SECURITY DEFINER 불필요 — 호출자 본인 데이터만 조회 가능.

CREATE OR REPLACE FUNCTION public.get_unified_wrong_questions(p_study_modes text[])
RETURNS TABLE(question_id text, wrong_count int, last_correct boolean, last_wrong_at timestamptz)
LANGUAGE sql STABLE AS $$
  SELECT
    a.question_id,
    COUNT(*) FILTER (WHERE a.is_correct = false)::int AS wrong_count,
    (ARRAY_AGG(a.is_correct ORDER BY a.attempted_at DESC))[1] AS last_correct,
    MAX(a.attempted_at) FILTER (WHERE a.is_correct = false) AS last_wrong_at
  FROM public.attempts a
  WHERE a.user_id = auth.uid()
    AND a.study_mode = ANY(p_study_modes)
  GROUP BY a.question_id
  HAVING COUNT(*) FILTER (WHERE a.is_correct = false) > 0;
$$;

REVOKE ALL ON FUNCTION public.get_unified_wrong_questions(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unified_wrong_questions(text[]) TO authenticated;
