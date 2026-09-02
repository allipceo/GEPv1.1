# GEPv30-155 파일럿 순차기능개방 — 구현 결과보고서

**작성일**: 2026-09-03
**작성자**: 고팀장 (Claude Code)
**지시서**: [GEPv30-154](GEPv30-154-DEV-고팀장_파일럿순차개방_지시서.md) (조대표 승인 2026-09-02)
**목적**: 파일럿 1주차 — 선택형 A(회차순) + B(과목별) 2개만 개방, 나머지 전체 잠금

---

## 1. 작업 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **3개** (`featureFlags.js`, `Home.jsx`, `App.jsx`) |
| 변경 포인트 | featureFlags 2곳 + Home.jsx 11곳 + App.jsx 1곳 |
| 빌드 | ✅ 성공 (`vite build`, 164 modules, 에러 0건, 20.9s) |
| 로컬 구동 | ✅ dev 서버 정상 부팅, 로그인 화면 렌더, 콘솔 에러 0건 |
| 배포 | ⏸️ **미실행 — 노팀장 1차 검증 → 조대표 배포 승인 대기** |

> 지시서는 "변경 파일 2개"로 기재됐으나, 지시서 §"라우트 가드 (App.jsx 확인 필요)" 항목 이행을 위해 `App.jsx` 1줄을 추가 수정함(아래 3-3 참조). 나머지 라우트 6종(`SERVICE_A/B`, `OX`, `MOCK_EXAM`, `CUSTOM_MOCK`, `UNIFIED_WRONG`, `MINI_MOCK`)은 GEPv30-120에서 이미 `serviceKey` 배선 완료 상태였고, `/stats-dashboard`만 `serviceKey` 누락이라 이번에 배선함.

---

## 2. featureFlags.js 변경

### 2-1. 긴급 스위치 해제

```js
// 변경 전
export const EMERGENCY_FULL_OPEN = true;
// 변경 후
export const EMERGENCY_FULL_OPEN = false;
```
→ `SERVICE_FLAGS` 값이 실제로 게이트를 제어하기 시작함.

### 2-2. SERVICE_FLAGS 재편 (주차별 로드맵 반영)

```js
export const SERVICE_FLAGS = {
  // GEPv30-154 파일럿 1주차 — A(회차순)+B(과목별) 선택형만 개방, 나머지 전체 잠금
  SERVICE_A: true,        // 1주차 개방: 선택형 회차순   (기존 false → true)
  SERVICE_B: true,        // 1주차 개방: 선택형 과목별   (유지)
  UNIFIED_WRONG: false,   // 2주차 개방: 틀린문제·통합오답 (기존 true → false)
  OX: false,              // 3주차 개방: 진위형          (유지)
  STATS: false,           // 4주차 개방: 학습분석        (신규 키 추가)
  MINI_MOCK: false,       // 5주차 개방: 간이모의고사     (유지)
  MOCK_EXAM: false,       // 5주차 개방: 모의고사        (유지)
  CUSTOM_MOCK: false,     // 5주차 개방: 맞춤형 모의고사   (유지)
};
```

- `isServiceEnabled(key)` = `SERVICE_FLAGS[key] ?? true` 이므로, **키가 없으면 개방**으로 처리됨 → `STATS`를 명시적으로 `false`로 추가해야 학습분석이 잠김. (누락 시 URL 우회 가능했음)

---

## 3. Home.jsx 변경 (11곳)

### 3-1. 잠금 안내 토스트 (신규)

| # | 위치 | 내용 |
|---|------|------|
| 1 | 상태/핸들러 | `const [lockedToast, setLockedToast] = useState(false)` + `handleLockedClick()` (2.5초 자동 소멸) |
| 2 | 토스트 UI | 기기전환 배너 아래, `fixed bottom-6 left-1/2` — **"🔒 순차적으로 오픈 예정입니다"** |

### 3-2. 메뉴 버튼 onClick / 잠금 표시 (9곳)

모든 잠금 대상 버튼의 `onClick`을 `navigate(...)` → `isLocked(KEY) ? handleLockedClick() : navigate(...)` 로 전환.

| # | 버튼 | serviceKey | 추가 조치 |
|---|------|-----------|-----------|
| 3 | L2-A 선택형 회차순 | `SERVICE_A` | onClick 가드 (className·🔒는 기존 유지) |
| 4 | L2-B 선택형 과목별 | `SERVICE_B` | onClick 가드 + `isLocked` className + 🔒/L2-B 뱃지 분기 **(기존 잠금체크 없음)** |
| 5 | L2-C 진위형 | `OX` | onClick 가드 |
| 6 | L2-D 틀린문제 풀기 | `UNIFIED_WRONG` | **`canUseCounting &&` 조건부 렌더링 제거 → 항상 표시, 잠금으로 제어** + onClick 가드 + className + 🔒/L2-D 뱃지 분기 |
| 7 | L2-E 모의고사 | `MOCK_EXAM` | onClick 가드 |
| 8 | 간이 모의고사 | `MINI_MOCK` | onClick 가드 |
| 9 | 맞춤형 모의고사 | `CUSTOM_MOCK` | onClick 가드 |
| 10 | L2-F 통합오답 복습 | `UNIFIED_WRONG` | onClick 가드 + `isLocked` className + 🔒/L2-F 뱃지 분기 **(기존 잠금체크 없음)** |
| 11 | 내 학습 분석 | `STATS` | onClick 가드 + `isLocked` className + 🔒 아이콘 추가 **(기존 잠금체크 없음)** |

### 3-3. 부수 정리 (L2-D 조건 제거에 따른 죽은 코드 제거)

`canUseCounting` 소비처가 L2-D 하나뿐이었고 §3-2 #6에서 제거됨에 따라, 소비처 없는 선언·import를 함께 제거:

- `import { canCountAttempts } from '../services/countingEligibility'` 삭제
- `const canUseCounting = canCountAttempts({ ... })` 블록 삭제
- 위 호출에만 쓰이던 store 셀렉터 4개 삭제: `serviceLevel`, `approvalStatus`, `status`, `isPaused`

> 기능 영향 없음 — 로그인/승인 게이트는 라우트단 `RequireLogin`이 담당하며, Home은 항상 표시 + 잠금 제어 방식으로 전환됨.

---

## 4. App.jsx 변경 (1곳)

```jsx
// 변경 전
<Route path="/stats-dashboard" element={protectedPage(<StatsDashboard />)} />
// 변경 후
<Route path="/stats-dashboard" element={protectedPage(<StatsDashboard />, { serviceKey: 'STATS' })} />
```

- `RequireLogin`은 `serviceKey && !isAdmin && !isServiceEnabled(serviceKey)` 시 `<ServiceLockedDialog />` 반환 → URL 직접 접근(`/stats-dashboard`) 차단.
- 관리자(`isAdmin`)는 우회 — 기존 로직 그대로.

---

## 5. 검증

### 5-1. 자동 검증 (완료)

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ 성공 (164 modules, 에러 0) |
| dev 서버 부팅 | ✅ `http://localhost:5173` 정상 |
| 로그인 화면 렌더 | ✅ 정상 (사번/비밀번호 폼) |
| 콘솔 에러 | ✅ 0건 |
| JSX 구조 | ✅ L2-D 언랩 후 태그 균형 정상 (빌드 통과로 확인) |

### 5-2. 로직 정합성 (코드 정적 확인)

- `isLocked = !isAdmin && !isServiceEnabled(key)` → 관리자 잠금 없음, 일반 사용자 1주차엔 A/B만 통과
- `isServiceEnabled('STATS')` → `SERVICE_FLAGS.STATS(false) ?? true` = `false` → 잠김 ✔
- 라우트 가드: `/service-a`·`/service-b` 통과, 그 외 7종(`/ox*`,`/mock*`,`/custom-mock*`,`/unified-wrong*`,`/wrong-review/*`,`/mini-mock*`,`/stats-dashboard`) 차단 ✔

### 5-3. 실계정 라이브 테스트 (조대표 — 배포 후)

지시서 체크리스트 12항 — **로그인 권한이 필요해 고팀장이 직접 수행 불가**. 배포 후 조대표 실계정으로 확인 요청:

- [ ] L2-A / L2-B 클릭 → 정상 진입
- [ ] L2-C·D·E·간이·맞춤·L2-F·학습분석 클릭 → 토스트 "🔒 순차적으로 오픈 예정입니다" (2.5초 소멸)
- [ ] URL 직접 접근(`/mock`, `/ox`, `/stats-dashboard` 등) → 잠금 다이얼로그 차단
- [ ] 관리자 계정 → 잠금 없이 전체 접근
- [ ] 잠금 버튼 🔒 아이콘 + dimmed(opacity-50) 표시

---

## 6. 변경 파일 목록

```
src/config/featureFlags.js  (+9 / -9)
src/pages/Home.jsx          (+49 / -37)
src/App.jsx                 (+1 / -1)
```

## 7. 배포 절차 (승인 후)

```bash
git add src/config/featureFlags.js src/pages/Home.jsx src/App.jsx \
        docs/GEPv30-154-DEV-고팀장_파일럿순차개방_지시서.md \
        docs/GEPv30-155-DEV-고팀장_파일럿순차개방_구현결과보고서.md
git commit -m "feat: GEPv30-154 파일럿 1주차 순차개방 — A/B만 개방, 나머지 잠금"
git push origin main   # → Vercel 자동 배포 (2~3분)
```

> ⚠️ 현재 **push 미실행**. 노팀장 1차 검증 → 조대표 배포 승인 후 진행.

## 8. 롤백

| 레벨 | 방법 | 시간 |
|------|------|------|
| L1 긴급 | `EMERGENCY_FULL_OPEN = true` → push | 2~3분 |
| L2 배포이력 | Vercel 이전 배포 Redeploy | 2~3분 |
| L3 코드원복 | 직전 커밋 `git revert` | 5분 |

---

*GEPv30-155 | 담당: 고팀장(코딩) / 노팀장(문서) | 선행: GEPv30-154*
