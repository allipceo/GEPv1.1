# GEPv30-121 DEV 고팀장 구현결과보고서
## 서비스 순차 가동 구현 + 풀서비스 롤백 방안 — 구현 완료 보고

**문서 번호:** GEPv30-121
**작성일:** 2026-08-16
**작성자:** 고팀장 (Claude Code)
**지시 문서:** GEPv30-120 v1.2
**수신:** 노팀장 → 조대표
**작업 브랜치:** `gepv30-120-service-flags` (main 미병합, 병합 대기)

---

## 1. 작업 요약

GEPv30-120 v1.2 지시서의 [지시①]~[지시④] 코드 구현을 전부 완료했다. [지시⑤](카운팅 가드 검증)은 별도 문서 [GEPv30-122](GEPv30-122-카운팅가드_검증보고서.md)로 분리 보고한다.

---

## 2. STEP 0 — 안전망 구축 결과

| 항목 | 결과 |
|------|------|
| `v3.0-full-service` 태그 | ✅ 생성 및 `origin`에 push 완료 |
| `gepv30-120-service-flags` 브랜치 | ✅ 생성, main에서 분기 |
| `EMERGENCY_FULL_OPEN` 스위치 | ✅ `src/config/featureFlags.js` 최상단에 추가, 기본값 `false` |

---

## 3. 구현 내역

### [지시①] `src/config/featureFlags.js` — SERVICE_FLAGS 신설

지시서 원문 그대로 `SERVICE_FLAGS` 객체와 `isServiceEnabled()` 함수를 추가했다. `EMERGENCY_FULL_OPEN`을 파일 최상단에 배치해 다른 export보다 먼저 평가되도록 했다.

### [지시②] `src/App.jsx` — protectedPage() + serviceKey 라우트 배선

지시서의 옵션 객체 패턴을 그대로 적용했다:

```javascript
function protectedPage(element, options = {}) {
  const { serviceKey, ...restOptions } = options
  return (
    <RequireLogin {...restOptions} serviceKey={serviceKey}>
      {element}
    </RequireLogin>
  )
}
```

`/admin/users`는 지시서대로 변경 없음(`{ requireApproval: false }` 그대로 유지, serviceKey 미부여) — 기존 pending 사용자 접근 동작 보존.

**서비스별 serviceKey 배선 결과 (v1.2 지시 + 자체 판단 1건 반영):**

| 서비스 | serviceKey | 적용 라우트 수 |
|---|---|---|
| SERVICE_A | `SERVICE_A` | `/service-a` (1개) |
| SERVICE_B | `SERVICE_B` | `/service-b` (1개, v1.2 추가분) |
| OX | `OX` | 5개 (`/ox`, `/ox/stats`, `/ox/:subjectKey`, `/ox/:subjectKey/:subSubject`, `/ox/.../review`) |
| MOCK_EXAM | `MOCK_EXAM` | 6개 |
| CUSTOM_MOCK | `CUSTOM_MOCK` | 5개 |
| MINI_MOCK | `MINI_MOCK` | 3개 |
| UNIFIED_WRONG | `UNIFIED_WRONG` | 4개 (v1.2 추가분) |
| (없음) | — | `/`, `/admin/users`, `/stats-dashboard`, `/settings`, `/question`, `/result`, `/wrong-review` |

> **⚠️ 지시서에 없던 판단 1건 — `/question`·`/result`·`/wrong-review`는 serviceKey 미부여**
>
> 이 세 라우트는 서비스 A(`/service-a`)와 서비스 B(`/service-b`) 양쪽에서 공유하는 화면이다. `Question.jsx`는 URL이 아니라 `examStore.studyMode`(서비스 A/B 진입 시 각 Home에서 `startServiceA()`/`startServiceB()`로 store에 세팅됨)로 어떤 서비스인지 분기한다. 지시서②는 이 세 라우트를 "서비스 A 그룹"으로 분류했지만, 그대로 `serviceKey: 'SERVICE_A'`를 물리면 **SERVICE_A가 꺼져 있어도 SERVICE_B가 켜져 있는 현재(1단계) 상태에서 서비스 B 사용자가 `/question`에 진입하는 순간 ServiceLockedDialog에 막히는 회귀 버그**가 발생한다.
>
> → 세 라우트는 serviceKey를 부여하지 않고 기존 로그인·승인 게이트만 유지했다. 대신 진입점(`/service-a`, `/service-b`)에서 확실히 막히므로, 일반적인 사용 흐름(홈 메뉴 → 진입점 → 문제풀이)에서는 잠금이 정상 작동한다. 다만 **URL을 직접 알고 있는 사용자가 `/question`으로 바로 진입하면, 서비스 A/B 둘 다 잠긴 상태에서도 examStore에 남아있는 이전 세션 상태(또는 빈 상태)로 화면이 뜰 수 있다** — 완전한 우회 차단은 아니다. 실사용자 20~30명 규모 파일럿에서 실질 위험은 낮다고 판단했으나, 조대표 검토가 필요한 지점이라 표로 남긴다.

### [지시③] `RequireLogin.jsx` + `ServiceLockedDialog.jsx`

지시서 v1.2의 before/after 코드를 그대로 반영했다. 함수 시그니처를 `{ children, requireApproval = true, serviceKey }`로 확장하고, 로그인·승인 통과 분기 내부에 관리자 바이패스 포함 잠금 체크를 삽입했다:

```javascript
if (isAdmin || (approvalStatus === 'approved' && status === 'active' && !isPaused)) {
  if (serviceKey && !isAdmin && !isServiceEnabled(serviceKey)) {
    return <ServiceLockedDialog />
  }
  return children
}
```

기존 파일의 `useAuthStore((s) => s.isAdmin)` 셀렉터 방식을 그대로 재사용해 스타일 일관성을 유지했다(신규로 `useAuthStore()` 전체구독을 추가하지 않음). `ServiceLockedDialog.jsx`는 지시서 원문 그대로 신규 생성했다.

### [지시④] `Home.jsx` — 잠금 UI + E-2 메뉴

- **E-2 메뉴 신설:** 간이모의고사 버튼 바로 아래에 "맞춤형 모의고사"(🎯, fuchsia 테마, `L2-E2` 배지) 버튼을 기존 버튼들과 동일한 마크업 패턴으로 추가했다. 지시서 예시의 범용 `ServiceButton` 컴포넌트로 리팩터링하지는 않았다 — 기존 8개 버튼이 이미 색상·배지·설명 문구가 제각각인 커스텀 마크업이라, 공용 컴포넌트로 묶으면 이번 작업 범위를 넘는 시각적 리팩터링이 되기 때문이다. 대신 각 버튼에 `isLocked(serviceKey)` 헬퍼로 동일한 잠금 로직(불투명도 50% + 🔒 배지 + onClick 비활성화)만 개별 적용했다. 결과적으로 잠금 상태 표현은 지시서 의도(opacity dimmed + 🔒, 관리자는 정상 표시)와 동일하다.
- **잠금 대상:** L2-A(서비스A) / L2-C(OX) / L2-E(모의고사) / 간이모의고사 / E-2(맞춤모의) — SERVICE_FLAGS 초기값 기준 현재 전부 잠금 표시.
- **잠금 제외:** L2-B(서비스B), L2-D(틀린문제 — 기존 `canUseCounting` 조건 그대로 유지), L2-F(통합오답), 학습분석 — 항상 표시.
- **관리자 바이패스:** `isLocked = (key) => !isAdmin && !isServiceEnabled(key)` — `isAdmin`이면 항상 `false`(잠금 없음).

**개별 레벨체크 제거 (4개 파일, 파일별 재사용 범위 확인 후 처리):**

| 파일 | 처리 내용 |
|---|---|
| `OXHome.jsx` | 인라인 `if (serviceLevel < FEATURE_FLAGS.OX_MIN_LEVEL)` 블록 제거. `serviceLevel` 변수·`FEATURE_FLAGS` import도 다른 사용처 없어 함께 제거 |
| `MiniMockHome.jsx` | `canMiniMock` 변수·게이트 블록 제거. 재사용처 없음 확인 후 `useAuthStore`/`FEATURE_FLAGS` import까지 정리 |
| `MockExamHome.jsx` | `canMockExam`이 데이터로드 `useEffect`(184행)에도 쓰이고 있어, **게이트 반환문만 제거하고 effect는 무조건 실행되도록 변경**(의존성 배열에서 `canMockExam` 제거). 라우트 레벨에서 이미 걸러지므로 이 컴포넌트에 도달한 시점엔 항상 "활성" 상태로 취급하는 것이 맞다는 판단 |
| `CustomMockHome.jsx` | 동일 패턴. `canCustomMock` 제거 + effect 무조건 실행 + 이제 아무도 안 쓰는 `LockScreen` 컴포넌트 통째로 삭제 |

---

## 4. 빌드 검증

```
npm run build
✓ 157 modules transformed
✓ built in 7.12s
```

에러 없음. (기존부터 있던 "청크 500kB 초과" 경고는 이번 변경과 무관한 기존 이슈로, 별도 조치하지 않음)

개발서버(`npm run dev`) 기동 후 게스트 화면 콘솔 에러 0건, 네트워크 요청 전부 200 OK(신규 `ServiceLockedDialog.jsx` 모듈 로드 포함) 확인.

---

## 5. 완료 기준 체크리스트 — 실행 결과

```
☑ v3.0-full-service 태그 생성 및 push 확인
☑ gepv30-120-service-flags 브랜치 생성 확인
☑ EMERGENCY_FULL_OPEN = false 상태로 빌드 성공, 에러 없음
☐ /admin/users — pending 사용자 접근 정상 (기존 동작 유지)          ⚠️ 코드 추적으로 확인, 실계정 미검증
☐ 잠금 서비스 홈 버튼 🔒 표시 확인                                    ⚠️ 코드 확인 완료, 실계정 미검증
☐ 잠금 서비스 클릭 시 ServiceLockedDialog 표시 확인                   ⚠️ 코드 확인 완료, 실계정 미검증
☐ 잠금 서비스 URL 직접 입력 시 ServiceLockedDialog 표시 확인          ⚠️ 코드 확인 완료, 실계정 미검증
☐ 관리자 계정(조대표)으로 잠긴 서비스 정상 접근 확인 (바이패스)        ⚠️ 코드 확인 완료, 실계정 미검증
☐ B(과목별), F(틀린문제), G(통계), H(설정) 정상 작동 확인             ⚠️ 코드 확인 완료, 실계정 미검증
☐ B·F serviceKey 배선 후에도 현재와 동일하게 정상 접근 확인           ⚠️ 코드 확인 완료, 실계정 미검증
☑ E-2 맞춤형 모의고사 홈 메뉴 노출 확인 (코드/게스트 화면 기준)
☐ EMERGENCY_FULL_OPEN = true 시 모든 서비스 전체 개방 확인            ⚠️ 코드 확인 완료, 실계정 미검증
☐ EMERGENCY_FULL_OPEN = false 복원 후 잠금 상태 복귀 확인             ⚠️ 코드 확인 완료, 실계정 미검증
☑ 카운팅 가드 검증 시나리오 테스트 결과 보고서 작성 → GEPv30-122
```

> **⚠️ 중요 — 실계정 라이브 테스트 미완료:** 이 환경에는 승인된 실사용자·관리자 Supabase 로그인 자격증명이 없어, 로그인이 필요한 항목(승인/잠금/관리자 바이패스/EMERGENCY 스위치 동작)은 **소스 코드 추적으로 로직을 확인했을 뿐 브라우저상 실동작 검증은 못했다.** main 병합 전에 조대표 또는 실계정 보유자가 위 ⚠️ 표시 8개 항목을 한 번은 직접 클릭해서 확인해 주셔야 한다. 특히 "잠금 서비스 URL 직접 입력 시 차단" 항목은 3절에서 언급한 `/question` 공유 라우트 우회 가능성과 맞물려 있어 우선 확인을 권한다.

---

## 6. 산출물

| 산출물 | 상태 |
|---|---|
| 작업 브랜치 `gepv30-120-service-flags` | 로컬 커밋 완료, origin push 예정(본 보고서 커밋에 포함) |
| Git 태그 `v3.0-full-service` | origin push 완료 |
| 본 구현결과보고서 | `DOCS/GEPv30-121-DEV-고팀장_서비스순차가동_구현결과보고서.md` |
| 카운팅 가드 검증 보고서 | `DOCS/GEPv30-122-카운팅가드_검증보고서.md` |

---

## 7. 노팀장·조대표께 요청

1. `/question`·`/result`·`/wrong-review` serviceKey 미부여 판단(3절 표 참조) 승인 여부
2. ⚠️ 표시된 8개 체크리스트 항목 — 실계정으로 라이브 확인 후 결과 회신
3. 위 확인 완료 시 `gepv30-120-service-flags` → `main` 병합 승인

---

*문서 끝 — GEPv30-121 (2026-08-16, 고팀장 작성)*
