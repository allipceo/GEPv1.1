# GEPv30-154 파일럿 순차기능개방 — 고팀장 코딩 지시서

**작성일**: 2026-09-02  
**승인**: 조대표  
**목적**: 파일럿 1주차 — L2-A(선택형 회차순) + L2-B(선택형 과목별) 2개 메뉴만 개방, 나머지 전체 잠금

---

## 코드 분석 결과 (현황)

| 항목 | 현재값 | 문제점 |
|------|--------|--------|
| `EMERGENCY_FULL_OPEN` | `true` | 플래그 전체 무시 → 모든 서비스 개방 중 |
| L2-B 버튼 | 잠금 체크 없음 | `isLocked()` 미적용 |
| L2-D 버튼 | 잠금 체크 없음 | `isLocked()` 미적용 |
| L2-F 버튼 | 잠금 체크 없음 | `isLocked()` 미적용 |
| 학습분석 버튼 | 잠금 체크 없음 | `isLocked()` 미적용 |
| 잠금 버튼 onClick | navigate() 그대로 실행 | 🔒 표시만 있고 실제 진입 차단 안 됨 |

---

## 변경 파일 2개

### 파일 1: `src/config/featureFlags.js`

**변경 사항 3곳:**

```js
// ❌ 기존
export const EMERGENCY_FULL_OPEN = true;

// ✅ 변경
export const EMERGENCY_FULL_OPEN = false;
```

```js
// ❌ 기존 SERVICE_FLAGS
export const SERVICE_FLAGS = {
  SERVICE_B: true,
  UNIFIED_WRONG: true,
  OX: false,
  SERVICE_A: false,
  MINI_MOCK: false,
  MOCK_EXAM: false,
  CUSTOM_MOCK: false,
};

// ✅ 변경 SERVICE_FLAGS (파일럿 1주차)
export const SERVICE_FLAGS = {
  SERVICE_A: true,        // ✅ 1주차 개방: 선택형 회차순
  SERVICE_B: true,        // ✅ 1주차 개방: 선택형 과목별
  UNIFIED_WRONG: false,   // 🔒 잠금 (false로 변경)
  OX: false,              // 🔒 잠금
  MINI_MOCK: false,       // 🔒 잠금
  MOCK_EXAM: false,       // 🔒 잠금
  CUSTOM_MOCK: false,     // 🔒 잠금
  STATS: false,           // 🔒 잠금 (신규 키 추가)
};
```

---

### 파일 2: `src/pages/Home.jsx`

#### 변경 1 — Toast 상태 추가 (36번 라인 export default function Home() 바로 안쪽)

```jsx
// 기존 상태들 아래에 추가
const [lockedToast, setLockedToast] = useState(false)

const handleLockedClick = () => {
  setLockedToast(true)
  setTimeout(() => setLockedToast(false), 2500)
}
```

#### 변경 2 — Toast UI 추가 (return 문 최상단 div 안, 기기전환 배너 아래)

```jsx
{/* 순차개방 안내 토스트 */}
{lockedToast && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-3 rounded-full shadow-lg">
    🔒 순차적으로 오픈 예정입니다
  </div>
)}
```

#### 변경 3 — L2-A 버튼 onClick 수정 (현재 navigate 그냥 실행됨)

```jsx
// ❌ 기존
onClick={() => navigate('/service-a')}

// ✅ 변경
onClick={() => isLocked('SERVICE_A') ? handleLockedClick() : navigate('/service-a')}
```

#### 변경 4 — L2-B 버튼: isLocked 추가 + onClick 수정

```jsx
// ❌ 기존 (잠금 체크 전혀 없음)
<button
  type="button"
  onClick={() => navigate('/service-b')}
  className="w-full flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3.5 text-left active:bg-green-100"
>
  ...
  <span className="text-xs font-bold text-green-300 bg-green-100 px-1.5 py-0.5 rounded-full">L2-B</span>
  <span className="text-gray-300 text-lg">›</span>
</button>

// ✅ 변경
<button
  type="button"
  onClick={() => isLocked('SERVICE_B') ? handleLockedClick() : navigate('/service-b')}
  className={`w-full flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3.5 text-left active:bg-green-100 ${isLocked('SERVICE_B') ? 'opacity-50 cursor-default active:bg-green-50' : ''}`}
>
  ...
  {isLocked('SERVICE_B')
    ? <span className="text-gray-400 text-lg">🔒</span>
    : <span className="text-xs font-bold text-green-300 bg-green-100 px-1.5 py-0.5 rounded-full">L2-B</span>}
  <span className="text-gray-300 text-lg">›</span>
</button>
```

#### 변경 5 — L2-C 버튼 onClick 수정

```jsx
// ❌ 기존
onClick={() => navigate('/ox')}

// ✅ 변경
onClick={() => isLocked('OX') ? handleLockedClick() : navigate('/ox')}
```

#### 변경 6 — L2-D 버튼: isLocked 추가 + onClick 수정

> **조대표 결정 (2026-09-02)**: 교육 목적상 1주차는 잠금 표시로 보여주고, 2주차에 활성화하여 파일럿 참여자들이 1주일간 자신이 틀린 문제를 확인하게 함. `canUseCounting` 조건부 렌더링 제거 → 항상 표시, 잠금으로 제어.

```jsx
// ❌ 기존 (canUseCounting 조건만 있고 잠금 없음)
{canUseCounting && (
  <button
    type="button"
    onClick={() => navigate('/wrong-review/subjects')}
    className="w-full flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3.5 text-left active:bg-orange-100"
  >
    ...
    <span className="text-xs font-bold text-orange-300 bg-orange-100 px-1.5 py-0.5 rounded-full">L2-D</span>
    <span className="text-gray-300 text-lg">›</span>
  </button>
)}

// ✅ 변경 (canUseCounting 조건 제거 → 항상 표시, 잠금으로 제어)
<button
  type="button"
  onClick={() => isLocked('UNIFIED_WRONG') ? handleLockedClick() : navigate('/wrong-review/subjects')}
  className={`w-full flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3.5 text-left active:bg-orange-100 ${isLocked('UNIFIED_WRONG') ? 'opacity-50 cursor-default active:bg-orange-50' : ''}`}
>
  <span className="text-2xl">✏️</span>
  <div className="flex-1">
    <p className="text-sm font-bold text-orange-800">틀린 문제 풀기</p>
    <p className="text-xs text-orange-400 mt-0.5">세부과목·유형·횟수별 정밀 복습</p>
  </div>
  {isLocked('UNIFIED_WRONG')
    ? <span className="text-gray-400 text-lg">🔒</span>
    : <span className="text-xs font-bold text-orange-300 bg-orange-100 px-1.5 py-0.5 rounded-full">L2-D</span>}
  <span className="text-gray-300 text-lg">›</span>
</button>
```

#### 변경 7 — L2-E 버튼 onClick 수정

```jsx
// ❌ 기존
onClick={() => navigate('/mock')}

// ✅ 변경
onClick={() => isLocked('MOCK_EXAM') ? handleLockedClick() : navigate('/mock')}
```

#### 변경 8 — 간이모의고사 버튼 onClick 수정

```jsx
// ❌ 기존
onClick={() => navigate('/mini-mock')}

// ✅ 변경
onClick={() => isLocked('MINI_MOCK') ? handleLockedClick() : navigate('/mini-mock')}
```

#### 변경 9 — 맞춤형모의고사 버튼 onClick 수정

```jsx
// ❌ 기존
onClick={() => navigate('/custom-mock')}

// ✅ 변경
onClick={() => isLocked('CUSTOM_MOCK') ? handleLockedClick() : navigate('/custom-mock')}
```

#### 변경 10 — L2-F 통합오답 버튼: isLocked 추가

```jsx
// ❌ 기존 (잠금 체크 없음)
<button
  type="button"
  onClick={() => navigate('/unified-wrong')}
  className="w-full flex items-center gap-3 rounded-2xl bg-pink-50 px-4 py-3.5 text-left active:bg-pink-100"
>
  ...
  <span className="text-xs font-bold text-pink-300 bg-pink-100 px-1.5 py-0.5 rounded-full">L2-F</span>
  <span className="text-gray-300 text-lg">›</span>
</button>

// ✅ 변경
<button
  type="button"
  onClick={() => isLocked('UNIFIED_WRONG') ? handleLockedClick() : navigate('/unified-wrong')}
  className={`w-full flex items-center gap-3 rounded-2xl bg-pink-50 px-4 py-3.5 text-left active:bg-pink-100 ${isLocked('UNIFIED_WRONG') ? 'opacity-50 cursor-default active:bg-pink-50' : ''}`}
>
  ...
  {isLocked('UNIFIED_WRONG')
    ? <span className="text-gray-400 text-lg">🔒</span>
    : <span className="text-xs font-bold text-pink-300 bg-pink-100 px-1.5 py-0.5 rounded-full">L2-F</span>}
  <span className="text-gray-300 text-lg">›</span>
</button>
```

#### 변경 11 — 학습분석 버튼: isLocked 추가

```jsx
// ❌ 기존 (잠금 체크 없음)
<button
  type="button"
  onClick={() => navigate('/stats-dashboard')}
  className="w-full flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3.5 text-left active:bg-indigo-100"
>
  ...
  <span className="text-gray-300 text-lg">›</span>
</button>

// ✅ 변경
<button
  type="button"
  onClick={() => isLocked('STATS') ? handleLockedClick() : navigate('/stats-dashboard')}
  className={`w-full flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3.5 text-left active:bg-indigo-100 ${isLocked('STATS') ? 'opacity-50 cursor-default active:bg-indigo-50' : ''}`}
>
  <span className="text-2xl">📊</span>
  <div className="flex-1">
    <p className="text-sm font-bold text-indigo-800">내 학습 분석</p>
    <p className="text-xs text-indigo-400 mt-0.5">취약점 · 반복오답 · 합격확률</p>
  </div>
  {isLocked('STATS') && <span className="text-gray-400 text-lg">🔒</span>}
  <span className="text-gray-300 text-lg">›</span>
</button>
```

---

## 라우트 가드 (App.jsx 확인 필요)

> 고팀장: `src/App.jsx`에서 아래 경로들에 대해 `isServiceEnabled()` 체크 후 홈으로 리다이렉트하는 가드 추가 필요.

```
/service-a  → SERVICE_A
/ox         → OX
/wrong-review/* → UNIFIED_WRONG
/mock       → MOCK_EXAM
/mini-mock  → MINI_MOCK
/custom-mock → CUSTOM_MOCK
/stats-dashboard → STATS
```

패턴 (각 라우트 컴포넌트 최상단에):
```jsx
import { isServiceEnabled } from '../config/featureFlags'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

// 컴포넌트 내부
const navigate = useNavigate()
const isAdmin = useAuthStore((s) => s.isAdmin)
useEffect(() => {
  if (!isAdmin && !isServiceEnabled('SERVICE_KEY')) navigate('/', { replace: true })
}, [])
```

> ⚠️ 관리자(`isAdmin`)는 라우트 가드 적용 제외 (QA 목적)

---

## 검증 체크리스트

- [ ] L2-A 클릭 → 정상 진입
- [ ] L2-B 클릭 → 정상 진입
- [ ] L2-C 클릭 → 토스트 "🔒 순차적으로 오픈 예정입니다" 표시
- [ ] L2-D 클릭 → 토스트 표시
- [ ] L2-E 클릭 → 토스트 표시
- [ ] 간이모의고사 클릭 → 토스트 표시
- [ ] 맞춤형모의고사 클릭 → 토스트 표시
- [ ] L2-F 클릭 → 토스트 표시
- [ ] 학습분석 클릭 → 토스트 표시
- [ ] URL 직접 접근 (예: /mock) → 홈 리다이렉트
- [ ] 관리자 계정 → 잠금 없이 전체 접근 가능
- [ ] 토스트 2.5초 후 자동 소멸

---

## 순차 개방 로드맵 (참고)

| 주차 | 개방 서비스 | featureFlags.js 변경 | 교육 목적 |
|------|------------|----------------------|-----------|
| 1주차 (파일럿 시작) | L2-A 회차순, L2-B 과목별 | SERVICE_A/B: true | 기출문제 회차·과목별 풀기 습관 형성 |
| 2주차 | + L2-D 틀린문제 풀기 | UNIFIED_WRONG: true | 1주차에 틀린 문제 확인 및 복습 |
| 3주차 | + L2-C 진위형 | OX: true | OX형 문제 유형 적응 |
| 4주차 | + L2-F 통합오답, 학습분석 | STATS: true | 통합 복습 + 취약점 파악 |
| 5주차 | + 모의고사, 맞춤형 모의고사 | MOCK_EXAM/CUSTOM_MOCK: true | 실전 타이머 훈련 |
| 전체오픈 | 긴급 전체 개방 | EMERGENCY_FULL_OPEN: true | — |

> 각 단계 개방 시 `featureFlags.js` 해당 키만 `true`로 변경 → 배포 (코드 수정 없이 1줄 변경으로 즉시 반영)

---

*GEPv30-154 | 담당: 고팀장(코딩) / 노팀장(문서) | 조대표 승인: 2026-09-02*
