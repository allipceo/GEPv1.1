# GEPv30-157 관리자 대시보드 — 구현 결과보고서

**작성일**: 2026-09-03
**작성자**: 고팀장 (Claude Code)
**지시서**: [GEPv30-157](GEPv30-157-DEV-고팀장_대시보드_개발지시서.md) (노팀장, 조대표 착수 승인)
**선행**: GEPv30-156 D-1 (attempts.device_type) — 커밋 `c117ce9` push 완료

---

## 1. 작업 요약

| 항목 | 결과 |
|------|------|
| 1단계 git push | ✅ `71e0932..c117ce9` (GEPv30-156) origin/main 반영 |
| 2단계 AdminDashboard | ✅ `src/pages/AdminDashboard.jsx` 신규 (CSS-only, 외부 라이브러리 0) |
| 라우트 | ✅ `src/App.jsx`에 `/admin/dashboard` 신규 등록 (지시서엔 "이미 존재"였으나 **실제 미등록** — 추가함) |
| 빌드 | ✅ `vite build` 성공 (165 modules, 에러 0, 7.8s) |
| 3단계 커밋/push | ✅ 커밋 `046c350` → origin/main (`c117ce9..046c350`) |
| **데이터 조회** | ✅ **해결 — 선택지 A 적용 (조대표 승인 2026-09-04). 마이그레이션 `017_attempts_admin_select` 반영** |

---

## 2. 구현 내용

### 2-1. 파일
- **신규** `src/pages/AdminDashboard.jsx` (약 300줄)
- **수정** `src/App.jsx` (+2줄: import, `<Route path="/admin/dashboard">`)

### 2-2. 화면 (지시서 §2 전 항목 구현)
- 헤더: "📊 파일럿 학습 현황 대시보드" + 마지막 새로고침 시각 + 새로고침 버튼
- 전체 현황 4카드: 총 풀이 수 / 전체 정답률 / 오늘 풀이 수 / 활성 사용자(최근 3일) `N / 전체`
- 일별 풀이 추이: CSS 세로 바 차트 (파일럿 시작 2026-09-03 ~ 오늘, 빈 날 0)
- 서비스별 이용 비중: CSS 가로 바 + 건수/%
- 기기 분포: 모바일/데스크톱/미상 + 출처 라벨
- 참가자별 카드: 이름·마지막 접속·누적 풀이·정답률·주 이용 서비스·기기. 풀이 0건 → "아직 풀이 없음"
- 관리자 가드: `if (!isAdmin)` → 권한 필요 화면 (AdminUsers.jsx와 동일 패턴)

### 2-3. 스타일
- 카드 `bg-white rounded-xl shadow-sm border border-gray-100 p-4`
- 정답률 색: ≥70 green / 50–70 yellow / <50 red
- 그래프: 전부 `<div>` + Tailwind width/height %. 의존성 추가 없음.

---

## 3. 지시서 대비 정정 사항 (실 스키마 검증 결과)

CLAUDE.md 교훈 "지시서 전 데이터 구조 검증 필수"에 따라 Supabase 실스키마를 조회하여 지시서의 컬럼/값 오류를 바로잡음.

| 지시서 표기 | 실제 | 조치 |
|------------|------|------|
| `attempts.id` | `attempts.attempt_id` (PK) | 쿼리 컬럼 정정 |
| `attempts.created_at` | `attempts.attempted_at` | 날짜 집계 컬럼 정정 |
| `MODE_LABEL: service_a / service_b` | 실제 `study_mode` = `service_a_sequence`, `service_b_subject_random`, `ox`, `mini_mock`, `wrong_review`, `unified_wrong_challenge` | 라벨 맵 실값 기준 재작성 + 미매핑 값은 원문 표시 |
| 기기 = `attempts.device_type` | 현재 **전 행 NULL** (1,407행) | `device_type` 우선, 0이면 `users.last_device` 폴백 + 출처 표시 |
| 참가자 12명 | 실제 active·비관리자 **14명** | 하드코딩 안 함 — 쿼리 결과대로 렌더 |

---

## 4. 🔴 미해결 — attempts RLS로 관리자 교차 조회 불가

### 현상
`attempts` 테이블 RLS 정책이 **`attempts_self` 하나뿐**:
```
POLICY attempts_self  FOR ALL  USING (auth.uid() = user_id)
```
→ 관리자(조대표) 계정으로 `/admin/dashboard`를 열어도 `supabase.from('attempts').select(...)`는
**본인 풀이 행만** 반환. 전체 풀이 수·정답률·일별 추이·서비스 비중·참가자별 통계가 **비거나 관리자 1인분만** 표시됨.

`users`는 `users_admin_select USING (gep_is_admin())` 정책이 있어 참가자 명단은 정상 조회됨.
→ 대시보드는 "참가자 카드 14명, 전원 '아직 풀이 없음'" 형태로 렌더되고, 상단에 안내 배너 표시하도록 방어 코딩함.

### 조대표 결정 요청 — 2개 선택지

**[선택지 A] `attempts`에 관리자 SELECT RLS 정책 추가 (권장)**
```sql
-- supabase/migrations/017_attempts_admin_select.sql
CREATE POLICY attempts_admin_select ON public.attempts
  FOR SELECT USING (public.gep_is_admin());
```
- 기존 `users_admin_select`와 동일 패턴. `gep_is_admin()` 재사용
- 즉시 적용·롤백 용이 (`DROP POLICY`). 프론트 코드 변경 0
- 관리자는 전 사용자 풀이 원장을 읽게 됨(대시보드 목적에 부합)

**[선택지 B] 집계 전용 `SECURITY DEFINER` RPC 신설**
```sql
CREATE FUNCTION gep_admin_dashboard() RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public'
AS $$ ... 서버에서 집계하여 요약 JSON만 반환 ... $$;
```
- 원장 원본 노출 없이 집계값만 전달 (최소권한 원칙)
- 프론트 재작업 필요(직접 쿼리 → RPC 호출), 지표 추가 시마다 함수 수정

> 노팀장 권고: **A** (파일럿 규모·속도 우선, 관리자 전용 화면이므로 원장 노출 리스크 낮음).
> A 승인 시 마이그레이션 1건 적용 → 2분 내 대시보드 정상화.

### ✅ 조치 결과 (2026-09-04, 조대표 A 승인)

`supabase/migrations/017_attempts_admin_select.sql` 적용 완료:
```sql
CREATE POLICY attempts_admin_select ON public.attempts
  FOR SELECT USING (public.gep_is_admin());
```
- 확인: `pg_policies`에 `attempts_admin_select`(SELECT, `gep_is_admin()`) + 기존 `attempts_self`(ALL) 공존
- permissive 정책 OR 결합 → 관리자=전체 행 조회 / 일반 사용자=본인 행만 (동작 불변)
- 롤백: `DROP POLICY attempts_admin_select ON public.attempts;`

### 파일럿 기간 한정 집계 (조대표 지시 2026-09-04 — 후속 반영)

전 패널을 파일럿 개시(2026-09-03) 이후 `attempts`로 한정.
- `AdminDashboard.jsx`: attempts 쿼리에 `.gte('attempted_at', PILOT_START_TS)` 추가
- `PILOT_START_TS = '2026-09-02T15:00:00+00:00'` (= 2026-09-03 00:00 KST) — UTC midnight로 잡으면 9/3 오전 KST 풀이가 누락되므로 KST 자정 기준
- 헤더에 "집계 기간: 파일럿 개시(2026-09-03) ~ 현재" 명시
- 개시 전 개발·테스트 데이터(약 1,343건)는 모든 지표에서 제외됨

**배포 후 대시보드 예상 수치 (파일럿 한정, 2026-09-04 DB 스냅샷)**

| 지표 | 값 |
|------|-----|
| 총 풀이 수 | **64** (전체 1,407 → 파일럿분 64) |
| 전체 정답률 | **31%** |
| 서비스별 | 선택형(과목별) 32 · 선택형(회차순) 28 · 통합오답 4 |
| 일별 추이 | 2026-09-03: 64 (개시 첫날) |
| 풀이 기록 있는 참가자 | 14명 중 6명 |
| 활성 사용자(최근 3일) | 13 / 14 |

---

## 5. 검증

| 체크 | 결과 |
|------|------|
| `npm run build` | ✅ 성공 (165 modules, 에러 0) |
| 관리자 `/admin/dashboard` 렌더 | ✅ 렌더 정상 (단, attempts 데이터는 RLS로 비어 있음 — 4장) |
| 일반 계정 `/admin/dashboard` | ✅ `if (!isAdmin)` → "운영자 권한 필요" 화면 |
| 풀이 0건 사용자 카드 | ✅ "아직 풀이 없음" 표시 |
| 콘솔 에러 | ✅ 0건 (RLS는 에러가 아니라 빈 결과) |

---

## 6. 배포

```
git add src/pages/AdminDashboard.jsx src/App.jsx \
        docs/GEPv30-157-DEV-고팀장_대시보드_개발지시서.md \
        docs/GEPv30-157-DEV-고팀장_대시보드_구현결과보고서.md
git commit -m "feat: GEPv30-157 AdminDashboard 구현"
git push origin main
```
→ Vercel 자동 배포. **선택지 A/B 결정 전까지 대시보드 수치는 미표시 상태.**

---

*GEPv30-157 | 담당: 노팀장(기획) / 고팀장(개발) | 선행: GEPv30-156*
