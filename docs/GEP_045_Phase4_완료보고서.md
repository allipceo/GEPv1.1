# GEP_045 Phase 4 완료 보고서

**작업일시:** 2026.02.28
**작업자:** 고팀장 (Claude Code)
**승인:** 조대표님 → 노팀장 검증 → Phase 4 확정

---

## 1. 개발 완료 항목 (STEP 1~6)

| STEP | 내용 | 상태 |
|------|------|------|
| STEP 1 | Notion OX SSOT DB 추출 → JSON 3파일 생성 | ✅ |
| STEP 2 | oxSubjects.js / oxStore.js / oxService.js 생성 | ✅ |
| STEP 3 | OXHome.jsx / OXSubject.jsx / 라우터 연결 | ✅ |
| STEP 3.5 | JSON → public/data/ 이전, oxStore fetch() 전환 | ✅ |
| STEP 4 | OXQuiz.jsx / OXReview.jsx / 라우터 연결 | ✅ |
| STEP 5 | oxService.js Supabase 실제 연동 | ✅ |
| STEP 6 | 통합 검증 + 버그 수정 2건 + 배포 | ✅ |

---

## 2. 탑재 문항 현황

| 과목 | 파일 | 문항 수 |
|------|------|---------|
| 법령 | public/data/ox_law.json | 1,274건 |
| 손보1부 | public/data/ox_p1.json | 1,220건 |
| 손보2부 | public/data/ox_p2.json | 1,330건 |
| **합계** | | **3,824건** |

- 추출 조건: Notion OX SSOT DB, `조대표_선택=YES`
- 스키마: `ox_id`, `source_ibex_id`, `statement_display`, `ox_result`, `subject`, `round`, `choice_no`

---

## 3. 구현된 시나리오 (S1~S8)

| 시나리오 | 내용 | 구현 위치 | 검증 |
|----------|------|-----------|------|
| S1 | 홈 → OX 학습 → 레벨 3 게이트 | OXHome.jsx:51 (`serviceLevel < 3`) | ✅ |
| S2 | 과목 선택 → 세부과목 선택 → 문제 진입 | OXSubject.jsx handleCardClick | ✅ |
| S3 | O/X 선택 → 정답/오답 피드백 | OXQuiz.jsx getOXStyle / getOXLabel | ✅ |
| S4 | 이전 버튼 → localSelected 초기화, 기록 유지 | oxStore.js goPrev | ✅ |
| S5 | 건너뛰기 → answeredSet 미반영 | oxStore.js skipQuestion | ✅ |
| S6 | 3축 카운터 정확성 | oxStore.js selectAnswer | ✅ |
| S7 | 마지막 문항 완료 → OXReview 자동 이동 | OXQuiz.jsx handleNext (Bug 1 수정) | ✅ |
| S8 | 모아풀기 필터 카운트 | OXReview.jsx wrongCounts useMemo | ✅ |

---

## 4. 파일 구조 변경 내역

### 신규 파일
```
src/
  config/
    oxSubjects.js         — 3과목 Config (key, label, file, subs)
  stores/
    oxStore.js            — Zustand OX 전용 스토어 (3축 카운터)
  services/
    oxService.js          — Supabase 연동 (attempts + question_stats + progress)
  pages/
    OXHome.jsx            — /ox (레벨 3 게이트 + 과목 카드)
    OXSubject.jsx         — /ox/:subjectKey (세부과목 선택)
    OXQuiz.jsx            — /ox/:subjectKey/:subSubject (문제 풀기)
    OXReview.jsx          — /ox/:subjectKey/:subSubject/review (라운드 완료)

public/
  data/
    ox_law.json           — 법령 1,274건
    ox_p1.json            — 손보1부 1,220건
    ox_p2.json            — 손보2부 1,330건
```

### 수정 파일
```
src/App.jsx               — OX 라우트 4개 추가
```

### 라우트 구조
```
/ox                                  OXHome
/ox/:subjectKey                      OXSubject
/ox/:subjectKey/:subSubject          OXQuiz
/ox/:subjectKey/:subSubject/review   OXReview
```

---

## 5. 버그 수정 (STEP 6)

### Bug 1 — OXQuiz.jsx handleNext: 마지막 문항 미응답 건너뛰기 시 /review 미이동
- **원인**: `!showResult` 분기에서 `skipQuestion()` 호출 → `goNext()` → `completeRound()` 순으로 answeredSet은 리셋되지만 navigate 없음
- **증상**: 사용자가 마지막 문항을 건너뛰면 Round가 올라간 채 첫 문항으로 돌아감 (리뷰 화면 진입 불가)
- **수정**: `isLastQuestion` 체크를 `!showResult` 보다 먼저 실행. 마지막 문항은 응답/미응답 관계없이 항상 /review 이동
- **추가**: 마지막 문항 버튼 레이블 `'건너뛰기'` → `'완료'`로 통일

### Bug 2 — oxStore.js completeRound: isReviewMode 미초기화
- **원인**: `completeRound()` 가 `isReviewMode`, `reviewQuestions` 를 리셋하지 않음
- **증상**: 모아풀기 완주 후 "이어서 풀기" 클릭 시 `selectCurrentQuestions`가 `reviewQuestions`를 반환해 동일 모아풀기 문제로 재진입
- **수정**: `completeRound()` set에 `isReviewMode: false, reviewQuestions: []` 추가

---

## 6. Supabase 연동 설계

| 메서드 | 테이블 | 비고 |
|--------|--------|------|
| `recordAttempt` | `attempts` INSERT | O→1 / X→2 매핑, `study_mode='ox'` |
| `recordAttempt` | `question_stats` RPC | `upsert_question_stat` 동시 호출 |
| `saveProgress` | `progress` UPSERT | `filter_key='ox:{subject}:{subSubject}'`, `current_index=roundNo` |
| `loadProgress` | `progress` SELECT | 구현 완료, oxStore 호출 연결은 이월 |

- 게스트(`userId=null`): 모든 DB 호출 스킵, 클라이언트 메모리만 사용
- DB 스키마 변경 없음 (기존 `supabase/schema.sql` 재사용)

---

## 7. 알려진 제한사항 (Limitations)

| 항목 | 내용 |
|------|------|
| 세션 통계 근사치 | `sessionWrong`은 `answeredSet ∩ wrongMap` 로 계산 — 이전 라운드 오답이 이번 라운드 정답 처리여도 wrongMap에 남아있어 이번 세션 오답으로 집계될 수 있음 |
| 브라우저 새로고침 | oxStore 비영속화 (persist 미적용) — 새로고침 시 진행 상태 초기화, EmptyView로 안전 처리 |
| `loadProgress` 미호출 | 서버 저장된 라운드 번호를 앱 재진입 시 복구하는 로직 미연결 |
| 세부과목 필터 | JSON에 `sub_subject` 필드 없어 현재 subSubject 선택과 무관하게 과목 전체 문제 반환 |
| 과목별 Round/누적 표시 | 현재 대분류 기준 단일 스토어 — 세부과목별 Round/누적 별도 표시 불가 |
| selected_answer 의미 | `attempts` 테이블의 `selected_answer`(1~4)에 O=1 / X=2 매핑 저장. 조회 시 study_mode='ox' 필터 필요 |

---

## 8. 다음 버전 이월 항목

| 항목 | 비고 |
|------|------|
| oxStore persist 연동 | Zustand persist + loadProgress 호출로 새로고침 복구 |
| 세부과목별 sub_subject 필터 | JSON 스키마 확장 후 활성화 (oxStore:73 주석 참조) |
| 세부과목별 Round/누적 분리 표시 | 스토어 구조 변경 필요 |
| 스와이프 네비게이션 | 모바일 제스처 이전/다음 |
| 오프라인 싱크 | Service Worker + IndexedDB 연동 |
| wrongMap 다음 라운드 초기화 옵션 | 현재 절대 유지 원칙, UI 옵션 추가 예정 |

---

## 9. 빌드 결과

```
vite v7.3.1  ✓ 109 modules transformed   경고 0건
dist/assets/index-*.js   454.73 kB │ gzip: 133.47 kB
✓ built in 9.98s
```

배포 URL: https://gepv11.vercel.app
