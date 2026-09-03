# GEPv30-157 관리자 대시보드 개발 지시서

**작성일**: 2026-09-03 22:48 KST
**작성자**: 노팀장 (Claude Cowork)
**수신**: 고팀장 (Claude Code)
**선행**: GEPv30-156 D-1 완료 (attempts.device_type 컬럼 추가, 커밋 c117ce9)
**배포 위치**: `/admin/dashboard` (기존 라우트 존재, is_admin 가드 적용됨)
**상태**: 🟡 개발 지시 — 조대표 착수 승인 (2026-09-03 오리엔테이션 당일)

---

## 배경

파일럿 오리엔테이션 완료(2026-09-03), 참가자 12명이 사용을 시작했습니다.
로우 데이터가 적어도 대시보드를 선행 구축하여 실시간 모니터링 체계를 갖춥니다.

---

## 1. 구현 위치

| 항목 | 값 |
|------|-----|
| 파일 | `src/pages/AdminDashboard.jsx` (기존 파일 — 내용 확인 후 리뉴얼) |
| 라우트 | `/admin/dashboard` (App.jsx에 이미 존재, is_admin 가드 적용) |
| 접근 권한 | `isAdmin === true` 인 경우만 (기존 RequireLogin 로직 그대로) |

---

## 2. 화면 구성

### 2-1. 헤더
- "📊 파일럿 학습 현황 대시보드" 제목
- 마지막 새로고침 시각 + 새로고침 버튼

### 2-2. 전체 현황 패널 (4개 숫자 카드)

| 지표 | 쿼리 |
|------|------|
| 총 풀이 수 | `SELECT COUNT(*) FROM attempts` |
| 전체 정답률 | `SELECT AVG(is_correct::int) FROM attempts` |
| 오늘 풀이 수 | `WHERE created_at >= today` |
| 활성 사용자 수 | `users WHERE last_access_at >= 3일 이내` |

### 2-3. 일별 풀이 추이 그래프
- X축: 날짜 (파일럿 시작일 2026-09-03~)
- Y축: 풀이 수
- `SELECT DATE(created_at), COUNT(*) FROM attempts GROUP BY DATE(created_at) ORDER BY 1`
- 데이터 없는 날은 0으로 표시

### 2-4. 서비스별 이용 비중 (가로 바 또는 리스트)
- `SELECT study_mode, COUNT(*) FROM attempts GROUP BY study_mode`
- study_mode → 한글 라벨 매핑 필요 (아래 참조)

```js
const MODE_LABEL = {
  'service_a': '선택형(회차순)',
  'service_b': '선택형(과목별)',
  'ox': '진위형 OX',
  'unified_wrong': '통합오답',
  'mock_exam': '모의고사',
  'custom_mock': '맞춤형 모의고사',
  'mini_mock': '간이 모의고사',
}
```

### 2-5. 기기 분포 (mobile vs desktop)
- `SELECT device_type, COUNT(*) FROM attempts WHERE device_type IS NOT NULL GROUP BY device_type`

### 2-6. 참가자별 카드 (12명)

각 카드에 표시:
| 항목 | 데이터 소스 |
|------|------------|
| 이름 | `public.users.real_name` |
| 마지막 접속 | `public.users.last_access_at` |
| 누적 풀이 수 | `COUNT(attempts) per user_id` |
| 정답률 | `AVG(is_correct) per user_id` |
| 주 이용 서비스 | `study_mode 최다 빈도 per user_id` |
| 기기 | `device_type 최다 빈도 per user_id` |

데이터 없는 사용자: "아직 풀이 없음" 표시 (카드 자체는 표시)

---

## 3. Supabase 쿼리 방식

기존 `supabase.js` import 사용. RPC 없이 직접 쿼리.

```js
// 전체 현황
const { data: totalData } = await supabase
  .from('attempts')
  .select('id, is_correct, created_at, study_mode, device_type, user_id')

// 사용자 목록
const { data: users } = await supabase
  .from('users')
  .select('user_id, real_name, last_access_at, last_device')
  .eq('status', 'active')
  .eq('is_admin', false)
  .order('real_name')
```

> attempts 전체를 한 번에 가져와 JS에서 집계하는 방식 사용 (파일럿 12명 수준이므로 데이터량 적음)

---

## 4. 스타일 가이드

- 기존 Tailwind 클래스 스타일 그대로 사용
- 카드: `bg-white rounded-xl shadow-sm border border-gray-100 p-4`
- 정답률 색상: 70% 이상 green, 50~70% yellow, 50% 미만 red
- 그래프: 별도 라이브러리 없이 CSS 바 차트로 구현 (의존성 추가 금지)

---

## 5. 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] 관리자 계정으로 `/admin/dashboard` 접근 → 정상 렌더
- [ ] 일반 계정으로 `/admin/dashboard` 직접 접근 → 차단 확인
- [ ] 풀이 0건 사용자 카드 → "아직 풀이 없음" 정상 표시
- [ ] 콘솔 에러 0건

---

## 6. 결과보고서

완료 후 `GEPv30-157-DEV-고팀장_대시보드_구현결과보고서.md` 작성하여 DOCS에 저장.

---

*GEPv30-157 | 담당: 노팀장(기획) / 고팀장(개발) | 선행: GEPv30-156 D-1*
