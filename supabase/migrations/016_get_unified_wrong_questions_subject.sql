-- GEPv30-136 STEP 2: get_unified_wrong_questions에 subject/sub_subject 반환 컬럼 추가
-- 반환 타입(RETURNS TABLE) 변경이라 CREATE OR REPLACE 불가 → DROP 후 재생성
-- 스키마/RLS 변경 없음, 기존 4개 반환 필드는 그대로 유지, 컬럼만 추가
DROP FUNCTION IF EXISTS public.get_unified_wrong_questions(text[]);

CREATE FUNCTION public.get_unified_wrong_questions(p_study_modes text[])
RETURNS TABLE(
  question_id   text,
  wrong_count   int,
  last_correct  boolean,
  last_wrong_at timestamptz,
  subject       text,
  sub_subject   text
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.question_id,
    COUNT(*) FILTER (WHERE a.is_correct = false)::int AS wrong_count,
    (ARRAY_AGG(a.is_correct  ORDER BY a.attempted_at DESC))[1] AS last_correct,
    MAX(a.attempted_at) FILTER (WHERE a.is_correct = false)    AS last_wrong_at,
    (ARRAY_AGG(a.subject     ORDER BY a.attempted_at DESC))[1] AS subject,
    (ARRAY_AGG(a.sub_subject ORDER BY a.attempted_at DESC))[1] AS sub_subject
  FROM public.attempts a
  WHERE a.user_id = auth.uid()
    AND a.study_mode = ANY(p_study_modes)
  GROUP BY a.question_id
  HAVING COUNT(*) FILTER (WHERE a.is_correct = false) > 0;
$$;

REVOKE ALL ON FUNCTION public.get_unified_wrong_questions(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unified_wrong_questions(text[]) TO authenticated;

-- search_path 고정 (Supabase security advisor: function_search_path_mutable 해소)
ALTER FUNCTION public.get_unified_wrong_questions(text[]) SET search_path = public;
