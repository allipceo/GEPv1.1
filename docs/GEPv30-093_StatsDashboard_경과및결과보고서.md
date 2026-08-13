# GEPv30-093 학습 분석 대시보드 신규 페이지 경과 및 결과보고서

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 — 대시보드 고도화
**지시자:** 노팀장 (개발관리창006)
**관련 문서:** `C:\dev\GEPv3.0\DOCS\GEPv30-093_StatsDashboard_개발지시서.md` (092와 내용 동일, 번호만 변경)
**배포 목표:** https://gepv11.vercel.app

---

## 1. 작업 목적

기존 DB 구조·컴포넌트 변경 없이, 이미 구현되어 있던 `WeaknessHeatmap` / `StudyRoadmap` / `PassProbabilityCard` / `PredictionCard` 4개 통계 컴포넌트와 신규 "반복 오답 Top 5" 집계를 한 화면에 조립한 `/stats-dashboard` 페이지를 신설한다. 홈 L2 메뉴 최하단에 진입 버튼을 추가하고, 실패 시 라우트 주석 1줄로 즉시 롤백 가능한 구조를 유지한다.

## 2. 수정/신규 파일 (3개)

| 파일 | 작업 |
|------|------|
| `src/pages/StatsDashboard.jsx` | 신규 생성 |
| `src/App.jsx` | import 1줄 + `/stats-dashboard` 라우트 1줄 추가 |
| `src/pages/Home.jsx` | L2-F 아래 `📊 내 학습 분석` 버튼 1개 추가 |

---

## 3. 노팀장 지시서 대비 변경사항 (2건)

착수 전 지시서를 실제 코드베이스(Supabase 스키마, `exams.json` 필드, 기존 통계 페이지 패턴)와 대조 검토한 결과 2건을 수정 후 진행 승인을 받았다.

| # | 지시서 원안 | 수정 내용 | 사유 |
|---|-----------|-----------|------|
| 1 | `text: q?.question?.slice(0, 40) ?? \`문제 ${id}\`` | `text: q?.questionRaw?.slice(0, 40) ?? \`문제 ${id}\`` | `exams.json`/`examStore.questions`의 실제 문제 원문 필드명은 `questionRaw`이며 `question` 필드는 존재하지 않는다(`src/utils/loadExams.js`, `public/data/exams.json` 직접 확인). 원안대로면 반복오답 Top5의 문제 미리보기가 항상 폴백 텍스트(`문제 ${id}`)만 표시되어 기능 취지가 무력화됨. |
| 2 | `mock_exam_sessions`를 `created_at` 순으로 dedupe 없이 전량 조회 | `round ASC, attempt_number DESC` 정렬 후 회차별 최신 1건만 남기는 dedupe 처리 추가 | `mock_exam_sessions`는 회차당 재응시 시 `attempt_number`가 증가하며 여러 행이 남는 구조(`supabase/migrations/mock_exam_tables.sql`). 기존 `MockExamStats.jsx`도 동일하게 회차별 최신 세션만 사용 중. dedupe 없이 전량 반영 시 재응시가 잦은 회차가 PredictionCard 추세·PassProbabilityCard 몬테카를로 표본에 중복 가중되어 신뢰도가 낮아짐. |

두 건 모두 노팀장 확인 후 확정 승인받아 반영함. (3번 `custom_mock_sessions` 미포함, 4번 `.neq('study_mode','ox')` 유지는 지시서 원안대로 진행 — 아래 5절 참조)

---

## 4. 검증 결과 (V1~V8)

실계정(조대표님, `202504012`) 기준 로컬 dev 서버(Browser 프리뷰)로 검증. 실기기(모바일)는 대표님 확인 대기 중 — 6절 참조.

| # | 항목 | 방법 | 결과 |
|---|------|------|------|
| V1 | 홈 → `📊 내 학습 분석` 버튼 노출 | 홈 화면 렌더링 확인 | ✅ L2-F 아래 정상 노출 |
| V2 | `/stats-dashboard` 진입 → 로딩 후 전체 블록 렌더링 | 버튼 클릭 → 라우트 이동 | ✅ 6개 블록 순서대로 정상 렌더링, 콘솔 에러 없음 |
| V3 | 반복 오답 숫자·미리보기가 실제 DB와 일치 | 실계정 데이터 렌더링 확인 | ✅ "보험업의 허가에 관한 설명으로 옳지 않은 것은?..." 등 실제 문제 원문 정상 표시(수정 1 반영 확인), 12회·8회·7회 등 오답 횟수 정상 |
| V4 | WeaknessHeatmap 12과목 정답률 표시 | 화면 확인 | ✅ 법령/손보1부/손보2부 12개 세부과목 정답률·우수·보통·약점 배지 정상 |
| V5 | 모의고사 데이터 없을 때 PredictionCard graceful 처리 | 이 계정은 모의고사 응시 0회 | ✅ PassProbabilityCard·PredictionCard 모두 "최소 5회 이상 완료 후 확인 가능(0회 보유)" 안내로 정상 처리, 크래시 없음 |
| V6 | 모바일 스크롤 전체 정상 렌더링 | 375×812 뷰포트로 리사이즈 후 `document.documentElement.scrollWidth` 확인 | ✅ `scrollWidth === innerWidth(375)`, 가로 오버플로우 없음 |
| V7 | `틀린문제 풀기 →` 버튼 → `/wrong-review` 이동 | 클릭 실행 후 `window.location.href` 확인 | ✅ `/wrong-review`로 정상 이동 |
| V8 | `npm run build` 에러 없음 | 빌드 실행 | ✅ 148 modules, 에러 없음 (기존에도 있던 청크 크기 경고만 존재, 본 작업과 무관) |

---

## 5. 고팀장 발견 이슈 (4건) 및 처리 내역

착수 전 지시서 대조 검토 단계에서 발견하여 노팀장에게 보고한 항목과 최종 처리 결과.

| # | 이슈 | 처리 내역 |
|---|------|-----------|
| 1 | `q?.question` 필드명 오류 (실제는 `questionRaw`) | 🔴 확정 수정 — 3절 #1 참조 |
| 2 | `mock_exam_sessions` 재응시 중복 집계 | 🟡 확정 수정 — 3절 #2 참조 (회차별 최신 1건만 dedupe) |
| 3 | `custom_mock_sessions`(맞춤 모의고사) 미포함 | 🟡 이번 093 범위에서는 의도적으로 제외 확정 — 정규 `mock_exam_sessions`(9회차)만 포함. 커스텀 모의고사 연동은 Phase 2로 별도 진행 (6절 참조) |
| 4 | `.neq('study_mode', 'ox')` 필터가 사실상 no-op | 🟢 원안 유지 확정 — OX는 별도 `ox_attempts` 테이블에 기록되어 `attempts.study_mode`에 `'ox'` 값이 존재하지 않지만(실제 값: `service_a_sequence`/`service_b_subject_random`/`wrong_review`), 노이즈 없이 그대로 두기로 결정 |

---

## 6. 배포 결과

- Commit: (아래 커밋 참조)
- Push: origin/main
- Vercel: 자동 배포
- URL: https://gepv11.vercel.app

---

## 7. 다음 작업

1. **조대표님 실기기(모바일) 확인** — V1~V8을 로컬 dev 프리뷰가 아닌 실제 배포 URL(https://gepv11.vercel.app)에서 재확인 필요
2. **`custom_mock_sessions` 포함 여부 (Phase 2)** — 조대표님 실기기 확인 후 이상 없으면, 맞춤 모의고사 결과를 합격확률·예측점수 계산에 포함할지 노팀장 검토 후 착수
3. **`RequireLogin.jsx` 관리자 승인 게이트 수정 여부** — GEPv30-092에서 발견되어 이월된 항목(관리자 계정도 미승인 시 일반 학습 라우트가 막히는 기존 동작). 본 건과 무관하여 이번에도 미수정 — 조대표님 확인 후 별도 작업 여부 결정 필요
