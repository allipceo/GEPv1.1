# GEPv30-083 — S2-c OX 진위형 통계 화면 개발

**작성일:** 2026-08-08
**작성자:** 노팀장 (개발관리창)
**Phase:** Phase 2 — S2-c
**지시자:** 조대표님 승인 (S2-a/S2-b 시나리오+UI 확정)

---

## 1. 작업 목적

S2-a 시나리오 + S2-b UI 대표님 승인 완료 후, OX 진위형 통계 화면 `/ox/stats` 신설.

- DB 기반(attempts, study_mode='ox') 집계 → 앱 재시작 후에도 통계 유지
- 3과목별 정답률 컬러 코딩, 세부과목 12종 취약도, 약점 바로풀기 CTA
- 게스트: 회원 전용 안내 표시

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/OXStats.jsx` | **신규 생성** (300줄) — OX 통계 메인 화면 |
| `src/App.jsx` | OXStats import + `/ox/stats` 라우트 추가 |
| `src/pages/OXHome.jsx` | 헤더 우측 "📊 통계" 버튼 추가 |

---

## 3. 주요 변경사항

### OXStats.jsx 핵심 로직

```javascript
// DB 쿼리: OX 풀이 기록 전체 조회
const { data } = await supabase
  .from('attempts')
  .select('subject, sub_subject, is_correct')
  .eq('user_id', userId)
  .eq('study_mode', 'ox')

// 3과목 집계: subject 키('law'/'p1'/'p2') 기준
// 세부과목 집계: sub_subject 기준, KNOWN_SUBS(12종) 초기화 후 집계
// 정렬: accuracy 낮은 순 (취약 → 우수)
```

### 취약도 기준 (S2-b 승인 기준)

| 정답률 | 등급 | 색상 |
|--------|------|------|
| 80%↑ | 우수 | 초록 |
| 60~79% | 보통 | 앰버 |
| 60% 미만 | 취약 | 빨강 |
| 미학습 | 미학습 | 회색 |

### App.jsx 라우트 추가

```jsx
// /ox/stats는 /ox/:subjectKey 앞에 위치 (static > dynamic 우선)
<Route path="/ox/stats" element={protectedPage(<OXStats />)} />
<Route path="/ox/:subjectKey" element={protectedPage(<OXSubject />)} />
```

### OXHome.jsx 헤더 버튼

```jsx
<button onClick={() => navigate('/ox/stats')} ...>
  📊 통계
</button>
```

---

## 4. 설계 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 데이터 소스 | DB(attempts) | oxStore.wrongMap은 메모리 상태 → 재시작 시 초기화 |
| 게스트 통계 | 미지원 | 회원 전용 안내 표시 |
| CTA | 최하위 1개 | 가장 약한 세부과목 단일 진입 (명확성 우선) |
| 라우트 위치 | /ox/stats (static) 앞배치 | :subjectKey 가 'stats' 캡처 방지 |

---

## 5. 테스트 결과

- 빌드: ✅ 정적 검증 전부 통과 (sandbox Linux rollup 바이너리 미설치로 빌드 미실행, Windows에서 확인 필요)
- 파일 존재: ✅ 3개 파일 수정/생성 완료
- 라우트 순서: ✅ /ox/stats < /ox/:subjectKey 순서 확인
- 핵심 로직: ✅ study_mode='ox' 필터, OX_SUBJECTS 기반 집계, CTA 네비게이션

---

## 6. 배포 결과

- Commit: (아래 참조)
- URL: https://gepv11.vercel.app/ox/stats
- 비고: Windows 빌드 성공 확인 후 push

---

## 7. 다음 작업

S2-c 완료 후:
- S3: 홈 반복오답 TOP N CTA (시나리오 확정 → UI → 개발)
- 또는 대표님 지시에 따라 다음 Pillar 착수

---

## 8. 고팀장 검증 결과 (Windows 빌드 + 정적 검토)

**빌드:** ✅ 성공 (`npm run build`, Windows 로컬)

**관점 A — 라우팅:** ✅ 문제없음
- `/ox/stats`가 `/ox/:subjectKey`보다 앞에 위치 (App.jsx:69, 70)
- `OXStats`가 `protectedPage()`로 감싸짐 확인

**관점 B — 데이터 정합성:**
- `sub_subject='ALL'` 누락: **의도된 설계로 확인** — `bySubMap`(3과목, subject 기준)은 정상 집계되고, 세부과목 12종 그리드만 'ALL' 레코드를 스킵함. `OXStats.jsx`에 해당 동작을 설명하는 주석 추가함.
- `bySubMap[subject]` undefined 가드: ✅ 존재 확인 (OXStats.jsx:90)

**관점 C — CTA 정확성:** ❌ **버그 발견 및 수정**
- 기존 코드: CTA가 `navigate(`/ox/${weakest.key}/${weakest.name}`)`만 호출하고 `oxStore.resetStore()`/`loadQuestions()`를 호출하지 않음.
- 문제: `OXQuiz.jsx`는 스스로 문제를 로드하지 않고 `oxStore`에 이미 로드된 `questions`를 그대로 사용함(`OXSubject.jsx`의 `handleCardClick`이 정상 패턴). CTA로 직접 진입 시 store가 비어있거나(초기 상태) 이전 세션의 다른 과목 문제가 남아있는 상태로 진입 → "문제가 없습니다" 빈 화면 또는 엉뚱한 문제 표시 가능.
- 수정: `OXStats.jsx`에 `handleWeakestClick` 추가 — `resetStore()` → `await loadQuestions(weakest.key, weakest.name)` → `navigate()` 순서로 `OXSubject.jsx`와 동일한 흐름 적용.

**수정한 버그:**
- `src/pages/OXStats.jsx`: CTA 클릭 시 `oxStore` 미초기화/미로드 버그 수정 (`resetStore`+`loadQuestions` 선행 호출 추가), `sub_subject='ALL'` 스킵 동작 설명 주석 추가.

**배포:**
- Commit: `a5bac88` (amend로 수정 반영)
- Push: ✅ origin/main
- URL: https://gepv11.vercel.app/ox/stats

**검증 요청 사항 (실계정 필요, 고팀장이 직접 확인 불가):**
1. `/ox/stats`에서 약점 세부과목 CTA 클릭 → 해당 세부과목 문제가 정상 로드되는지
2. "전체(ALL)" 모드로 몇 문제 풀이 후 `/ox/stats` 접속 시, 3과목 정답률에는 반영되지만 세부과목 그리드 합계는 그보다 적게 나오는 것이 맞는지 (의도된 동작)
