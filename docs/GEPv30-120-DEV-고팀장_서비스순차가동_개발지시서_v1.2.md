# GEPv30-120 DEV 고팀장 개발지시서 (v1.2)
## 서비스 순차 가동 구현 + 풀서비스 롤백 방안

**문서 번호:** GEPv30-120  
**초안:** 2026-08-16 (v1.0 — 노팀장)  
**수정:** 2026-08-16 (v1.1 — 고팀장 1차 코드 대조 의견 반영)  
**수정:** 2026-08-16 (v1.2 — 고팀장 2차 코드 대조 의견 반영)  
**수신:** 고팀장  
**참조 문서:** GEPv30-119 v1.1  
**승인:** 조대표

---

## v1.1 → v1.2 변경 사항

| 항목 | v1.1 오류/미비 | v1.2 수정 |
|------|--------------|----------|
| [지시④-3] OXHome grep 대상 오류 | `canOX` 변수로 grep 지시 → 실제로는 해당 변수 없음(0건) | 인라인 조건문 `serviceLevel < FEATURE_FLAGS.OX_MIN_LEVEL`로 정정 |
| [지시③] RequireLogin 시그니처 미명시 | "내부에 추가" 설명만 있고 before/after 코드 없음 | 함수 전체 before/after 코드 추가 |
| [지시②] SERVICE_B·UNIFIED_WRONG serviceKey 미배선 | "변경 없음" — 플래그 값 변경해도 효과 없는 죽은 설정값 재발 위험 | B·F 라우트에도 serviceKey 추가 |
| [3절] 단계 오픈 절차 빌드 체크 미명시 | "1줄 변경이면 브랜치 불필요" — 오타 한 글자로도 빌드 깨짐 | push 전 로컬 `npm run build` 확인 의무 명시 |

---

## v1.0 → v1.1 변경 사항 (참고)

| 항목 | v1.0 오류 | v1.1 수정 |
|------|----------|----------|
| [지시②] protectedPage 시그니처 | 포지셔널 인자 방식 → /admin/users 버그 유발 | 기존 옵션 객체 패턴 유지, serviceKey를 options에 추가 |
| [지시④-3] Home 레벨체크 제거 | 일괄 제거 지시 → MockExamHome·CustomMockHome useEffect 부작용 위험 | 파일별 사용처 확인 후 제거 지침 추가 |
| [지시③] 관리자 바이패스 | 미정의 → 관리자도 잠긴 서비스 접근 불가 | isAdmin이면 잠금 우회, QA 가능하도록 명시 |
| 단계 오픈 절차 | "main 직접 push 금지" 범위 불명확 | 구축 작업 vs 이후 단계 오픈 절차 분리 명시 |

---

## 0. 현재 상태 확인

현재 `main` 브랜치는 **FULL SERVICE v3.0 완전 작동 상태**입니다.  
이 작업은 현재 상태를 기반으로 순차 가동 레이어를 **추가**하는 것이며,  
언제든 FULL SERVICE 상태로 즉시 복구할 수 있어야 합니다.

---

## 1. 작업 착수 전 필수 — 안전망 구축 (STEP 0)

> ⚠️ **이 단계를 반드시 먼저 실행할 것. 건너뛰면 안 됨.**

### 1-1. Git 태그 생성 (영구 복구 포인트)

```bash
git tag v3.0-full-service
git push origin v3.0-full-service
```

### 1-2. 작업 브랜치 생성

```bash
git checkout -b gepv30-120-service-flags
```

main은 건드리지 않음. 검증 완료 후 조대표 승인 시 main 병합.

### 1-3. 긴급 복구 스위치 추가

`src/config/featureFlags.js` 최상단:

```javascript
// 🚨 긴급 롤백 스위치 — true로 바꾸면 SERVICE_FLAGS 무시하고 즉시 FULL SERVICE 복귀
export const EMERGENCY_FULL_OPEN = false;
```

### 롤백 3중 안전망

| 레벨 | 방법 | 소요 시간 | 담당 |
|------|------|---------|------|
| L1 긴급 | `EMERGENCY_FULL_OPEN = true` → push | 2~3분 | 노팀장 지시 → 고팀장 push |
| L2 배포 이력 | Vercel 대시보드 → 이전 배포 Redeploy | 2~3분 | 고팀장 |
| L3 코드 원복 | `git checkout v3.0-full-service` 기준 복구 | 10분 내 | 고팀장 |

---

## 2. 구현 지시 — 총 5개 항목

### [지시 ①] featureFlags.js — SERVICE_FLAGS 신설

**파일:** `src/config/featureFlags.js`

기존 내용 유지하고 아래 블록 추가:

```javascript
// ============================================================
// 서비스 순차 가동 스위치 (GEPv30-119 v1.1)
// 조대표 지시 → 노팀장이 해당 값 false → true로 변경
// ============================================================
export const SERVICE_FLAGS = {
  SERVICE_B: true,        // 1단계: 파일럿 시작 즉시 활성
  UNIFIED_WRONG: true,    // 1단계: 파일럿 시작 즉시 활성
  OX: false,              // 2단계: 조대표 지시 시 true
  SERVICE_A: false,       // 3단계: 조대표 지시 시 true
  MINI_MOCK: false,       // 4단계: 조대표 지시 시 true
  MOCK_EXAM: false,       // 5단계: 조대표 지시 시 true
  CUSTOM_MOCK: false,     // 5단계: 조대표 지시 시 true
};

// 서비스 활성 여부 판단 함수 (매 호출마다 config 직접 계산 — persist 캐시 금지)
export const isServiceEnabled = (serviceKey) => {
  if (EMERGENCY_FULL_OPEN) return true;
  return SERVICE_FLAGS[serviceKey] ?? true;
};
```

---

### [지시 ②] App.jsx — protectedPage()에 serviceKey 추가 ⚠️ v1.1 수정 + v1.2 추가

**파일:** `src/App.jsx`

> ⚠️ **주의:** 실제 App.jsx(43행)의 protectedPage는 **옵션 객체 방식**입니다.
> 포지셔널 인자로 바꾸면 `/admin/users` 호출부(`{ requireApproval: false }` 객체)가
> 항상 truthy로 평가되어 pending 사용자의 승인 상태 확인이 차단되는 버그 발생.
> **반드시 기존 옵션 객체 패턴을 유지할 것.**

**변경 전 (App.jsx:43 현재 코드):**
```javascript
function protectedPage(element, options = {}) {
  return <RequireLogin {...options}>{element}</RequireLogin>
}
```

**변경 후:**
```javascript
import { isServiceEnabled } from './config/featureFlags';

function protectedPage(element, options = {}) {
  const { serviceKey, ...restOptions } = options;
  return (
    <RequireLogin {...restOptions} serviceKey={serviceKey}>
      {element}
    </RequireLogin>
  );
}
```

**라우트 적용 방식 (아래는 의미 예시 — 실제 작성은 기존 App.jsx의 JSX `<Route>` 문법 그대로 따를 것):**

```
서비스 B (과목별 선택형) — 1단계: ⬅️ v1.2 추가
  /service-b 및 하위 라우트 전체
  → options에 { serviceKey: 'SERVICE_B' } 추가
  (현재 true로 설정 — 즉시 활성. 나중에 "B 잠깐 꺼줘" 요청 시 플래그로 제어 가능)

서비스 F (틀린문제) — 1단계: ⬅️ v1.2 추가
  /unified-wrong 및 하위 라우트 전체
  → options에 { serviceKey: 'UNIFIED_WRONG' } 추가
  (현재 true로 설정 — 즉시 활성. 플래그 제어 가능)

서비스 C (OX 진위형) — 2단계:
  /ox, /ox/stats, /ox/:subjectKey, /ox/:subjectKey/:subSubject, /ox/.../review
  → options에 { serviceKey: 'OX' } 추가

서비스 A (기출회차) — 3단계:
  /service-a, /question, /result, /wrong-review
  → options에 { serviceKey: 'SERVICE_A' } 추가

서비스 E (간이모의고사) — 4단계:
  /mini-mock, /mini-mock/:setId, /mini-mock/:setId/result
  → options에 { serviceKey: 'MINI_MOCK' } 추가

서비스 D (기출모의고사) — 5단계:
  /mock 및 하위 라우트 전체
  → options에 { serviceKey: 'MOCK_EXAM' } 추가

서비스 E-2 (맞춤형 모의고사) — 5단계:
  /custom-mock 및 하위 라우트 전체
  → options에 { serviceKey: 'CUSTOM_MOCK' } 추가

/admin/users — 변경 없음:
  protectedPage(<AdminUsers />, { requireApproval: false })
  → serviceKey 추가 안 함 (기존 동작 유지)

G(통계), H(설정) — 변경 없음:
  SERVICE_FLAGS에 항목 자체가 없으므로 serviceKey 추가 불필요
  (isServiceEnabled에서 ?? true로 처리됨)
```

---

### [지시 ③] RequireLogin.jsx + ServiceLockedDialog — 관리자 바이패스 포함 ⚠️ v1.2 시그니처 추가

**파일:** `src/components/RequireLogin.jsx`

**변경 전 — 현재 함수 시그니처:**
```javascript
// 현재 RequireLogin 함수 선언 (정확한 형태는 파일 열어 확인 후 이 패턴 기준으로 수정)
function RequireLogin({ children, requireApproval = true }) {
  // ... 로그인 체크, 승인 체크 로직
}
```

**변경 후 — serviceKey 매개변수 추가 + 잠금 체크 삽입:**
```javascript
import { isServiceEnabled } from '../config/featureFlags';
import ServiceLockedDialog from './ServiceLockedDialog';

function RequireLogin({ children, requireApproval = true, serviceKey }) {
  // ① 기존 로그인 체크 (변경 없음)
  // ② 기존 승인 체크 (변경 없음)
  // ③ 서비스 잠금 체크 — 로그인·승인 통과 후 이 위치에 삽입:
  const isAdmin = useAuthStore((s) => s.isAdmin);  // 기존 파일의 셀렉터 방식 유지
  if (serviceKey && !isAdmin && !isServiceEnabled(serviceKey)) {
    return <ServiceLockedDialog />;
  }
  // ④ 기존 children 렌더링 (변경 없음)
  return children;
}
```

> 📌 **스타일 주의:** 기존 파일의 `useAuthStore` 호출이 `useAuthStore((s) => s.필드명)` 셀렉터 방식이면
> `const isAdmin = useAuthStore((s) => s.isAdmin);` 로 동일하게 작성할 것.
> (동작엔 문제없지만 파일 내 일관성 유지)

**ServiceLockedDialog 신규 컴포넌트** (`src/components/ServiceLockedDialog.jsx`):

```jsx
import { useNavigate } from 'react-router-dom';

export default function ServiceLockedDialog() {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-xl">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">준비 중입니다</h2>
        <p className="text-gray-500 text-sm mb-6">
          이 서비스는 곧 오픈될 예정입니다.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
```

---

### [지시 ④] Home.jsx — 잠금 UI + E-2 메뉴 신설

**파일:** `src/pages/Home.jsx`

**4-1. E-2 맞춤형 모의고사 메뉴 추가**

현재 Home.jsx에 `/custom-mock` 메뉴 항목 없음. 기존 메뉴 버튼들과 동일한 UI 패턴으로 추가.

**4-2. 홈화면 잠금 표시**

각 메뉴 버튼에서 `isServiceEnabled(serviceKey)`를 확인하여:
- 비활성: 🔒 아이콘 표시 + opacity dimmed (버튼 클릭 시 App.jsx 라우트에서 ServiceLockedDialog 처리)
- 관리자: 잠금 표시 없음 (정상 표시)

**4-3. 기존 Home 개별 레벨체크 제거 — ⚠️ 파일별 확인 필수 (v1.2: grep 대상 정정)**

> ⚠️ **일괄 제거 금지.** 파일마다 레벨 변수의 재사용 범위가 다릅니다.
> 각 파일의 실제 코드를 열어 **모든 사용처를 먼저 확인**한 뒤 제거 범위를 판단할 것.

| 파일 | 실제 게이트 코드 (grep 대상) | 확인 포인트 |
|------|--------------------------|-----------|
| `OXHome.jsx` | `serviceLevel < FEATURE_FLAGS.OX_MIN_LEVEL` 인라인 조건문 — `canOX` 변수 없음 ⬅️ v1.2 정정 | 해당 `if` 블록 전체 제거 |
| `MiniMockHome.jsx` | `serviceLevel < FEATURE_FLAGS.MINIMOCK_MIN_LEVEL` 인라인 조건문으로 추정 — 실제 코드 확인 | 해당 `if` 블록 전체 제거 |
| `MockExamHome.jsx` | `canMockExam` 변수 — **useEffect 의존성·조건문에도 사용됨 (184, 208행)** | 레벨 분기만 제거, 변수 유지 여부 별도 판단 |
| `CustomMockHome.jsx` | `canCustomMock` 변수 — **useEffect 의존성·조건문에도 사용됨 (213, 230행)** | 레벨 분기만 제거, 변수 유지 여부 별도 판단 |

> 📌 **OXHome·MiniMockHome**: 변수명이 아닌 인라인 조건문이므로 `canOX` 등으로 grep해도 0건.
> `FEATURE_FLAGS.OX_MIN_LEVEL` 또는 `OX_MIN_LEVEL`로 grep하여 해당 `if` 블록을 찾을 것.

제거 후 빌드 에러가 없는지 반드시 확인. 의심스러우면 레벨 분기만 제거하고 변수는 남겨도 무방.

---

### [지시 ⑤] 카운팅 가드 동작 검증 보고 (코딩 아님)

**시나리오 — 직접 테스트 후 결과 보고:**

> 서비스 B에서 세부과목 문제 풀기 중  
> 10번 문제 제출(오답) → 이전 버튼으로 9번 이동 → 9번 제출 → 다시 10번 이동 → 10번 재제출  
> **→ Supabase attempts 테이블에 10번 문제가 2개 row로 기록되는가?**

- `recordedSet` 가드(Question.jsx)가 이 케이스를 차단하는지 직접 DB 조회로 확인
- 결과를 GEPv30-122 검증 보고서에 작성하여 노팀장·조대표께 보고
- GEPv30-012 카운팅 계약 개정 여부는 보고 후 조대표 결정

---

## 3. 단계 오픈 절차 (구축 완료 후) ⚠️ v1.2: 빌드 체크 의무 추가

| 상황 | 절차 | main push 방식 |
|------|------|--------------|
| **이번 구축 작업** (GEPv30-120) | gepv30-120-service-flags 브랜치 → 검증 → 조대표 승인 → main 병합 | 브랜치 경유 필수 |
| **이후 단계 오픈** (예: 2단계 OX 활성화) | 조대표 지시 → 노팀장이 `OX: false → true` 수정 → 고팀장 main 직접 커밋 + push | **main 직접 커밋 허용** |

> ⚠️ **플래그 변경 후 push 전 반드시 로컬 `npm run build` 성공 확인.**
> "1줄 변경"이라도 키 오타(`OX` → `0X` 등) 하나로 빌드가 깨집니다.
> 빌드 성공 확인 없이 push 금지.

> 커밋 메시지에 "ACT-0X: [서비스명] 활성화" 명시하여 git 이력으로 추적 가능하게 할 것.

---

## 4. 작업 금지 사항

| 항목 | 이유 |
|------|------|
| `public/data/exams.json` 수정 | 문제·정답 원천 데이터 |
| `src/services/statsService.js` 구조 변경 | 전체 카운팅 체인 진입점 |
| `SERVICE_FLAGS` 초기값 임의 변경 | 조대표 지시 없이 서비스 오픈 금지 |
| persist 캐시값으로 서비스 게이트 판단 | 즉시 반영 안 되는 버그 전례 있음 (구 GEP_120 교훈) |
| 빌드 확인 없이 main push | 오타 1자로 전체 서비스 다운 위험 |

---

## 5. 완료 기준 체크리스트

```
□ v3.0-full-service 태그 생성 및 push 확인
□ gepv30-120-service-flags 브랜치 생성 확인
□ EMERGENCY_FULL_OPEN = false 상태로 빌드 성공, 에러 없음
□ /admin/users — pending 사용자 접근 정상 (기존 동작 유지)
□ 잠금 서비스 홈 버튼 🔒 표시 확인
□ 잠금 서비스 클릭 시 ServiceLockedDialog 표시 확인
□ 잠금 서비스 URL 직접 입력 시 ServiceLockedDialog 표시 확인 (우회 차단)
□ 관리자 계정(조대표)으로 잠긴 서비스 정상 접근 확인 (바이패스 동작)
□ B(과목별), F(틀린문제), G(통계), H(설정) 정상 작동 확인
□ B·F serviceKey 배선 후에도 현재와 동일하게 정상 접근 확인
□ E-2 맞춤형 모의고사 홈 메뉴 노출 확인
□ EMERGENCY_FULL_OPEN = true 시 모든 서비스 전체 개방 확인
□ EMERGENCY_FULL_OPEN = false 복원 후 잠금 상태 복귀 확인
□ 카운팅 가드 검증 시나리오 테스트 결과 보고서 작성
```

---

## 6. 산출물

| 산출물 | 위치 |
|--------|------|
| 작업 브랜치 | `gepv30-120-service-flags` |
| Git 태그 | `v3.0-full-service` |
| 구현 결과 보고서 | `GEPv30-121-DEV-고팀장_서비스순차가동_구현결과보고서.md` |
| 카운팅 가드 검증 보고서 | `GEPv30-122-카운팅가드_검증보고서.md` |

---

*문서 끝 — GEPv30-120 v1.2 (2026-08-16, 조대표 승인 후 고팀장 실행)*
