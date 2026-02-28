# GEP_046 Phase 4 재활용 가능 프로세스 목록

**작성일시:** 2026.02.28
**작성자:** 고팀장 (Claude Code)
**조사 범위:** scripts/, src/stores/, src/services/, src/config/, src/pages/OX*.jsx, public/data/

---

## 1. 데이터 레이어

### 1-1. `scripts/gep040_step1_extract.cjs`
**주요 기능**
- Notion DB를 페이지네이션(100건/page)으로 전량 조회 후 과목별 JSON 3파일 출력
- 외부 마스터 JSON과 SOURCE_IBEX_ID 기준으로 조인 → 회차·과목·세부과목 보강
- 스키마 검증(필수 7개 필드) + OK 비율 리포트 자동 출력

**재활용 가능 범위:** `타 시험 확장`
- 어떤 시험이든 Notion OX SSOT DB + 마스터 JSON이 있으면 동일 패턴 적용 가능
- `@notionhq/client` 미사용 — 순수 Node.js `https` 모듈만 사용 (의존성 zero)

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| `OX_SSOT_DB_ID` | 대상 Notion DB ID |
| `MASTER_JSON` | 마스터 lookup 파일 경로 |
| `SUBJECT_NORM` | 과목 약어 → 정식명 매핑 |
| `FILE_MAP` | 과목 → 출력 파일명 매핑 |
| `SS_ORDER` | 세부과목 정렬 순서 |
| 추출 조건 (`isYes` 판정) | 조대표_선택 컬럼명/값 |

**의존성**
- 입력: `.env`(NOTION_TOKEN), `OX3_003_ExamBank_Master_V1.3.json`
- 출력: `public/data/ox_law.json`, `ox_p1.json`, `ox_p2.json`
- 외부 패키지: 없음 (Node.js 내장 `https`, `fs`, `path`만 사용)

---

### 1-2. `scripts/export_notion_to_json.js`
**주요 기능**
- Notion 2-step 방식(databases.retrieve → dataSources.query)으로 MCQ 문제 전체 조회
- rich_text → plain_text 변환 + CRLF 정규화 + BOM 제거
- 회차 오름차순 정렬 + 메타데이터(rounds, subjects, subSubjects) 자동 추출

**재활용 가능 범위:** `타 시험 확장`
- 4지선다형(MCQ) Notion DB가 있으면 `OUTPUT_PATH`, `EXPECTED_TOTAL`, 필드명만 변경

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| `OUTPUT_PATH` | 출력 JSON 경로 |
| `EXPECTED_TOTAL` | 예상 총 문항 수 |
| property 필드명 매핑 | Notion DB 컬럼명에 맞게 수정 |

**의존성**
- 입력: `.env`(NOTION_TOKEN, NOTION_DB_ID)
- 출력: `public/data/exams.json`
- 외부 패키지: `@notionhq/client`, `dotenv`

---

### 1-3. `scripts/fix-subject-by-part-number.js`
**주요 기능**
- Notion DB 전체 레코드를 조회하여 `부별문항번호` 기준 과목 select 필드 일괄 교정
- 변경이 필요한 레코드만 PATCH (skip 최적화), 200ms 딜레이로 rate limit 대응
- 완료 보고: scanned / updated / skipped / errors 카운트

**재활용 가능 범위:** `범용`
- "숫자 범위 → 카테고리 일괄 업데이트" 패턴은 어떤 Notion DB에도 적용 가능

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| `getSubject()` 범위 | 범위 → 카테고리 매핑 |
| Notion 필드명 | `부별문항번호`, `과목` |
| `delay(ms)` 값 | 서버 부하에 따라 조정 |

**의존성**
- 입력: `.env`(NOTION_TOKEN, NOTION_DB_ID)
- 외부 패키지: `@notionhq/client`, `dotenv`

---

### 1-4. `public/data/ox_law.json` / `ox_p1.json` / `ox_p2.json`
**주요 기능**
- 총 3,824건 OX 문항 (법령 1,274 / 손보1부 1,220 / 손보2부 1,330)
- `조대표_선택=YES` 필터 적용, 23~31회차 범위
- 7개 필드 고정 스키마: `ox_id`, `source_ibex_id`, `statement_display`, `ox_result`, `subject`, `round`, `choice_no`

**재활용 가능 범위:** `GEP 내부`
- 현재 버전은 GEP 전용 (보험중개사 시험 데이터)
- 스키마 구조는 타 시험 OX 데이터 변환 템플릿으로 활용 가능

**재활용 시 변경 필요 항목**
- 전체 데이터 교체 (스크립트 재실행)
- 필드명은 oxStore.js의 `selectAnswer` → `question.ox_result`, `question.round` 참조와 일치 유지 필수

**의존성**
- 참조: `src/stores/oxStore.js`, `src/config/oxSubjects.js`(file 필드로 경로 관리)

---

## 2. 상태관리 레이어

### 2-1. `src/stores/oxStore.js`
**주요 기능**
- 3축 카운터 설계: `answeredSet`(라운드 완주 리셋) / `wrongMap`(절대 유지) / `totalCumulative`(절대 유지)
- 7개 액션: `loadQuestions`, `selectAnswer`, `goNext`, `goPrev`, `skipQuestion`, `completeRound`, `startReview`, `resetStore`
- 모아풀기 모드: `isReviewMode` 플래그 + `reviewQuestions` 분리, `selectCurrentQuestions` selector로 투명하게 전환

**재활용 가능 범위:** `타 시험 확장`
- OX 형식 문제(O/X 2지선다)라면 과목 config만 교체해 그대로 사용 가능
- 3축 카운터 설계 패턴은 MCQ 진도관리에도 이식 가능

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| `OX_SUBJECTS` import | 새 과목 config로 교체 |
| `loadQuestions` fetch URL | `/data/${subjectInfo.file}` 경로 |
| `selectAnswer` 정답 비교 | `answer === question.ox_result` — 필드명 유지 필요 |
| `oxService` 연동 | 필요 없으면 oxService 호출 제거 |

**의존성**
- `src/config/oxSubjects.js`
- `src/services/oxService.js`
- `src/stores/authStore.js` (`useAuthStore.getState()` — Supabase userId 취득)
- Supabase 테이블: `attempts`, `progress`, `question_stats`

---

### 2-2. `src/stores/examStore.js` (참고)
**재활용 포인트**
- `progressMap` 설계: `questionId → { selectedAnswer, isCorrect }` Map 구조는 OX wrongMap과 대응
- `resetStore` / `loadQuestions` 패턴은 oxStore 설계의 원형

**재활용 시 참고 제약**
- `examStore.js` 임의 수정 금지 (CLAUDE.md 핵심 금지사항)

---

## 3. 서비스 레이어

### 3-1. `src/services/oxService.js`
**주요 기능**
- `recordAttempt`: `attempts` INSERT + `upsert_question_stat` RPC (`Promise.all` 동시 실행)
- `saveProgress` / `loadProgress`: `progress` 테이블 upsert/select (`filter_key='ox:{subject}:{subSubject}'`)
- `userId=null`(게스트) 시 모든 DB 호출 즉시 return (게스트 안전 처리)

**재활용 가능 범위:** `타 시험 확장`
- OX 형식이 아닌 다른 학습 형식에도 동일 패턴 적용 가능
- 게스트 early-return 패턴은 모든 서비스 레이어의 표준으로 사용

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| `selected_answer` 매핑 | O→1 / X→2, MCQ는 1~4 그대로 |
| `study_mode` 값 | `'ox'` → 새 모드명으로 변경 |
| `service_level` 기준값 | OX=3, MCQ=2 |
| `filter_key` 네임스페이스 | `'ox:'` prefix → 새 타입으로 교체 |

**의존성**
- `src/lib/supabase.js`
- Supabase 테이블: `attempts`, `question_stats`(RPC), `progress`

---

### 3-2. `src/services/statsService.js` (참고)
**재활용 포인트**
- 게스트/회원 분기 패턴 (`authStatus !== 'authenticated'` early return)
- `try/catch` 보장으로 네트워크 실패 시 앱 중단 없음
- `canUseFeature(serviceLevel, MIN_LEVEL)` 기능 레벨 체크 패턴

---

## 4. UI 레이어

### 4-1. `src/config/oxSubjects.js`
**주요 기능**
- 3과목 Config 중앙 관리: `key`, `label`, `file`, `subs[]`
- 하드코딩 금지 원칙 구현 — 과목 추가/변경 시 이 파일만 수정

**재활용 가능 범위:** `타 시험 확장`
- 다른 시험/과목 체계로 OX 학습을 확장할 때 이 파일만 교체

**재활용 시 변경 필요 항목**
```js
// 패턴 유지, 값만 교체
{ key: 'new_key', label: '표시명', file: 'data_file.json', subs: ['세부1', '세부2'] }
```

**의존성**
- 참조: `oxStore.js`, `OXHome.jsx`, `OXSubject.jsx`, `OXQuiz.jsx`, `OXReview.jsx`

---

### 4-2. `src/pages/OXHome.jsx`
**주요 기능**
- 레벨 게이트 패턴: `serviceLevel < N` 조건 → 잠금 화면 early return
- config 주도 카드 렌더링: `OX_SUBJECTS.map()` (하드코딩 없음)
- oxStore 진행 정보 표시: 현재 로드된 과목과 일치 시 실제값, 불일치 시 기본값

**재활용 가능 범위:** `GEP 내부` / `타 시험 확장`
- 레벨 게이트 패턴은 다른 유료 기능 화면에 그대로 복사 가능

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| `serviceLevel < 3` | 기능 레벨 기준 변경 |
| `SUBJECT_THEME` | 새 과목 컬러 테마 추가 |
| `OX_SUBJECTS` import | 새 config로 교체 |

**의존성**
- `useAuthStore` (serviceLevel)
- `useOxStore` (subject, roundNo, totalCumulative)
- `src/config/oxSubjects.js`

---

### 4-3. `src/pages/OXSubject.jsx`
**주요 기능**
- 세부과목 선택 → `resetStore()` + `await loadQuestions()` + `navigate()` 순서 보장
- `subjectKey` 유효성 검증 → 잘못된 URL 진입 시 `/ox` 자동 리다이렉트
- `isLoading` 중 로딩 텍스트 표시 (UI 흔들림 방지)

**재활용 가능 범위:** `타 시험 확장`
- 세부 카테고리 선택 → 비동기 데이터 로드 → 이동 패턴은 범용

**재활용 시 변경 필요 항목**
- `OX_SUBJECTS` config, `SUBJECT_THEME` 컬러, navigate 경로 (`/ox/...`)

**의존성**
- `useOxStore` (isLoading, roundNo, totalCumulative, resetStore, loadQuestions)
- `src/config/oxSubjects.js`

---

### 4-4. `src/pages/OXQuiz.jsx`
**주요 기능**
- 크래시 가드 2단계: `isLoading` → LoadingView, `!currentQuestion` → EmptyView
- `handleNext` 3분기: isLastQuestion(응답/미응답 모두 /review 이동) / 미응답 → skipQuestion / 응답 → goNext
- 하단 고정 패널: `position: fixed; left: 50%; transform: translateX(-50%); max-width: 640px` — 모바일 안전 레이아웃

**재활용 가능 범위:** `타 시험 확장`
- O/X 2지선다 형식이라면 그대로 사용 가능
- 하단 고정 패널 레이아웃은 MCQ AnswerButtons에도 동일 패턴 적용 가능

**재활용 시 변경 필요 항목**
| 항목 | 변경 내용 |
|------|-----------|
| O/X 버튼 | 다른 선택지 형식으로 교체 |
| `getOXStyle / getOXLabel` | 새 피드백 스타일로 교체 |
| `selectCurrentQuestions` selector | 스토어 구조에 맞게 수정 |
| navigate 경로 | 새 라우트 구조로 변경 |

**의존성**
- `useOxStore` (전체 상태 + 액션)
- `src/config/oxSubjects.js` (헤더 컬러)

---

### 4-5. `src/pages/OXReview.jsx`
**주요 기능**
- 세션 통계 수신: `location.state`로 전달받음 (completeRound 후 answeredSet 리셋되므로 사전 캡처 필수)
- `wrongCounts` useMemo: wrongMap에서 실시간 계산 (1회↑ / 2회↑ / 3회↑)
- 3개 버튼 분기: 모아풀기(`startReview` + navigate) / 이어서풀기(navigate) / 과목선택(navigate)

**재활용 가능 범위:** `타 시험 확장`
- "라운드 완료 → 틀린 문제 재시도" 패턴은 어떤 학습 앱에도 적용 가능
- `location.state`로 통계를 전달하는 패턴은 completeRound/reset 이후에도 데이터 유지하는 표준 방법

**재활용 시 변경 필요 항목**
- `wrongMap` → 새 스토어 오답 구조, `questions` → 새 문항 배열, `startReview` 액션

**의존성**
- `useOxStore` (wrongMap, questions, startReview)
- `location.state` (sessionAnswered, sessionCorrect, sessionWrong, sessionSkipped, totalQuestions)

---

## 5. 검증 스크립트 레이어

### 5-1. `scripts/verify-byround.mjs`
**주요 기능**
- statsStore의 `updateStats` / `handleAnswer` 핵심 로직을 인라인으로 시뮬레이션
- 3개 시나리오: 과목별 학습 모드 / 회차별 풀기 모드 / round 비정상값 방어
- `pass/fail` 카운트로 결과 출력 + `process.exit(1)` 실패 종료

**재활용 가능 범위:** `범용`
- 테스트 프레임워크(Vitest/Jest) 미설치 환경에서 로직 검증하는 경량 패턴

**재활용 시 변경 필요 항목**
- 시뮬레이션 대상 로직 교체, 시나리오/assert 조건 수정

---

### 5-2. `scripts/test-stats.mjs`
**주요 기능**
- `globalThis.localStorage` 목(mock) 설정 후 Zustand 스토어를 동적 import로 로드
- statsStore → localStorage 저장 흐름 end-to-end 검증 (7개 테스트 케이스)

**재활용 가능 범위:** `범용`
- 브라우저 API 의존 스토어를 Node.js 환경에서 테스트하는 표준 패턴

**재활용 시 변경 필요 항목**
- 목 대상 API (`localStorage` → `sessionStorage` 등), import 경로, 테스트 케이스

---

### 5-3. `scripts/check-subjects.mjs`
**주요 기능**
- `public/data/exams.json`의 과목별·세부과목 분포를 3줄로 조회

**재활용 가능 범위:** `범용`
- JSON 데이터 분포 빠른 확인용 1회성 유틸 — 패턴 재사용 가능

---

## 6. 확장 시나리오 — 타 시험 OX 학습 적용 방법

### 6-1. 최소 변경으로 새 시험 OX 탑재 (예: 생명보험중개사)

```
Step 1 [데이터]
  - gep040_step1_extract.cjs 복사 → OX_SSOT_DB_ID, MASTER_JSON, FILE_MAP, SUBJECT_NORM 수정
  - 실행: node scripts/새스크립트.cjs
  - 출력: public/data/생보_law.json, 생보_p1.json 등

Step 2 [Config]
  - src/config/oxSubjects.js에 새 과목 항목 추가
    { key: 'lb_law', label: '생보 법령', file: '생보_law.json', subs: [...] }

Step 3 [UI]
  - OXHome.jsx: SUBJECT_THEME에 'lb_law' 컬러 추가
  - OXSubject.jsx: 자동 처리 (config 주도 렌더링)
  - OXQuiz.jsx / OXReview.jsx: 변경 불필요

Step 4 [Supabase]
  - oxService.js: DB 스키마 동일 (과목명만 다름) → 변경 불필요

Step 5 [라우터]
  - App.jsx: 기존 /ox/:subjectKey 라우트가 자동 처리 → 추가 불필요
```

**총 변경 파일: 2개** (`scripts/새스크립트.cjs`, `src/config/oxSubjects.js`)
**UI 코드 변경: 1곳** (`OXHome.jsx` 컬러 테마)

---

### 6-2. 재활용 범위 요약표

| 파일/모듈 | GEP 내부 | 타 시험 확장 | 범용 |
|-----------|----------|-------------|------|
| `gep040_step1_extract.cjs` | ✅ | ✅ | - |
| `export_notion_to_json.js` | ✅ | ✅ | - |
| `fix-subject-by-part-number.js` | ✅ | ✅ | ✅ |
| `verify-byround.mjs` | ✅ | - | ✅ |
| `test-stats.mjs` | ✅ | - | ✅ |
| `check-subjects.mjs` | ✅ | - | ✅ |
| `oxSubjects.js` (config) | ✅ | ✅ | - |
| `oxStore.js` | ✅ | ✅ | - |
| `oxService.js` | ✅ | ✅ | - |
| `OXHome.jsx` | ✅ | ✅ | - |
| `OXSubject.jsx` | ✅ | ✅ | - |
| `OXQuiz.jsx` | ✅ | ✅ | - |
| `OXReview.jsx` | ✅ | ✅ | - |
| `statsService.js` 패턴 | ✅ | ✅ | ✅ |

---

## 7. 조대표님 검토용 요약 (10줄)

1. **추출 스크립트 2종**: Notion → JSON 변환 (OX용 순수 Node.js / MCQ용 @notionhq/client) — 과목 config만 바꾸면 타 시험에 즉시 적용 가능
2. **Notion 일괄 수정 스크립트**: 부별문항번호 기준 과목 필드 자동 교정 — DB 데이터 정제 작업 재활용 가능
3. **oxStore.js (3축 카운터)**: answeredSet / wrongMap / totalCumulative 분리 설계 — OX 외 다른 학습 모드에도 이식 가능한 핵심 패턴
4. **oxService.js**: 게스트 early-return + Supabase attempts/progress 이중 저장 — 새 서비스 레이어의 표준 템플릿
5. **oxSubjects.js**: 과목 하드코딩 금지 원칙 구현 — 2줄 추가로 새 과목 탑재 가능
6. **OXHome 레벨 게이트 패턴**: `serviceLevel < N` early return — 다른 유료 기능 화면에 복사 즉시 적용
7. **OXQuiz handleNext 3분기**: 마지막/미응답/응답 분기 처리 — 유사한 퀴즈 UI의 설계 기준
8. **OXReview location.state 패턴**: store 리셋 전 통계 캡처 후 navigate state 전달 — 상태 소멸 전 데이터 보존 표준 방법
9. **검증 스크립트 2종**: 프레임워크 없이 Node.js 환경에서 스토어 로직 검증 — CI 없는 환경의 경량 테스트 패턴
10. **타 시험 확장 시 최소 변경**: 추출 스크립트 1개 + config 1개 수정으로 새 시험 OX 학습 탑재 가능 (UI 코드 변경 최소화)
