# GEP_040_STEP3_레벨2서버저장_틀린문제

**작업일시:** 2026.02.23
**작업자:** 고팀장 (Claude Code)

## 작업 내용

GEP_039 STEP3 — 레벨2 회원 서버 저장 활성화 + 틀린문제 모아풀기 + 이어풀기 버그 수정

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/stores/authStore.js` | `userId` 필드 추가 (auth.uid() 캐시) |
| `src/services/statsService.js` | attempts INSERT user_id 누락 버그 수정 + question_stats UPSERT RPC 추가 |
| `supabase/schema.sql` | `upsert_question_stat` 함수 정의 추가 |
| `src/pages/WrongReview.jsx` | **신규** — 틀린문제 모아풀기 페이지 |
| `src/App.jsx` | `/wrong-review` 라우트 추가 |
| `src/pages/Home.jsx` | 레벨2 전용 "틀린문제 풀기" 버튼 추가 |
| `src/stores/examStore.js` | Issue-3 이어풀기 버그 수정 + Supabase progress 연동 |

## 변경 전/후

### 작업1 — statsService 서버 저장 게이트

**Before:**
```js
// user_id 없이 INSERT → 항상 실패 (RLS 위반)
supabase.from('attempts').insert({
  question_id, question_round, ...  // user_id 누락!
})
// question_stats UPSERT 없음
```

**After:**
```js
// authStore.userId 추가 → INSERT 정상 동작
supabase.from('attempts').insert({
  user_id: userId,  // ← 추가
  question_id, question_round, ...
})
// question_stats 원자적 증가 RPC 추가
supabase.rpc('upsert_question_stat', { p_question_id, p_is_correct })
```

### 작업2 — 틀린문제 모아풀기

- `src/pages/WrongReview.jsx` 신규 생성
- attempts 테이블 `is_correct=false` 조회 → 로컬 questions 매핑
- study_mode='wrong_review' 로 기록
- Home.jsx 과목별 학습 탭에 레벨2 전용 버튼 추가

### 작업3 — Issue-3 이어풀기 버그

**Before:**
```js
// progressMap 키에 subSubject 미포함 → 세부과목 이어풀기 불가
function makeProgressKey(round, subject) { return `${round}_${subject}` }
// setSubSubject 항상 0으로 리셋
setSubSubject: (sub) => set({ selectedSubSubject: sub, currentIndex: 0 })
```

**After:**
```js
// subSubject 포함 키 → 세부과목별 이어풀기 정상 동작
function makeProgressKey(round, subject, subSubject = null) {
  return subSubject ? `${round}_${subject}_${subSubject}` : `${round}_${subject}`
}
// progressMap에서 저장값 로드
setSubSubject: (sub) => {
  const key = makeProgressKey(round, subject, sub)
  const savedIndex = sub ? (progressMap[key] ?? 0) : 0
  set({ selectedSubSubject: sub, currentIndex: savedIndex })
}
// 레벨2+ setCurrentIndex 호출 시 Supabase progress 동기화
```

## Supabase SQL 수동 실행 필요

`supabase/schema.sql` 하단의 `upsert_question_stat` 함수를 Supabase SQL Editor에서 실행:

```sql
CREATE OR REPLACE FUNCTION upsert_question_stat(p_question_id TEXT, p_is_correct BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO question_stats (user_id, question_id, total_attempts, correct_count, last_attempted_at)
  VALUES (auth.uid(), p_question_id, 1, CASE WHEN p_is_correct THEN 1 ELSE 0 END, NOW())
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    total_attempts    = question_stats.total_attempts + 1,
    correct_count     = question_stats.correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    last_attempted_at = NOW();
END;
$$;
```

## 완료 기준 검증

1. 레벨2 계정으로 문제 풀기 → attempts 테이블 행 생성 ← user_id 버그 수정으로 활성화
2. question_stats 집계 반영 ← upsert_question_stat RPC (SQL 수동 실행 후 동작)
3. 틀린문제 목록 조회 + 모아풀기 ← WrongReview.jsx 완성
4. `npm run build` ✅ 성공

## 배포 결과

- 빌드: ✅ 성공 (106 modules, 439.29 kB)
- 커밋: `769a31e`
- 배포: git push origin main 완료 (Vercel 자동 배포 진행 중)
- URL: https://gepv11.vercel.app
- 비고: Supabase `upsert_question_stat` 함수는 조대표님이 SQL Editor에서 수동 실행 필요
