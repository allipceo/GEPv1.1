# GEP_099_UnifiedWrongReview_ChallengeMode

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-3
**지시자:** 노팀장 (개발관리창007)

---

## 1. 작업 목적

Phase 6-3 통합 오답 복습 시스템의 핵심 페이지 2개 구축.
GEP_095(서비스), GEP_097(컴포넌트) 위에 조립하여 사용자-facing 기능 완성.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/UnifiedWrongReview.jsx` | 신규 — 통합 오답 복습 홈 (/unified-wrong) |
| `src/pages/ChallengeMode.jsx` | 신규 — 도전 풀기 퀴즈 (/unified-wrong/challenge/:minCount) |
| `src/App.jsx` | 라우트 2개 추가 |
| `scripts/verify-gep099-step3.mjs` | 신규 — 검증 스크립트 (79 PASS) |

---

## 3. 주요 변경사항

### UnifiedWrongReview.jsx — 레이아웃 (상→하)

```
1. 헤더 (뒤로가기 + 총 문제수)
2. 🔥 5회+ 바로 풀기 버튼 (bg-red-600, 전체 폭)
3. D-Day 학습 플랜 (StudyPresetCard × 3)
4. 오답 분포 (WrongCountDistribution)
5. 고급 필터 (접기/펼치기 — SOURCE_LABEL + 세부과목)
6. WrongQuestionCard 목록 (wrong_count 내림차순)
```

- 비회원: `🔒 로그인 후 이용 가능합니다` 안내
- EXAM_DATE = `2026-09-27` (보험중개사 시험 기준일)
- 필터: `selectedSource` (ALL/MCQ/OX/MOCK/CUSTOM), `selectedSub` (세부과목)

### ChallengeMode.jsx — 3단계 Phase

```
start → quiz → done
```

| Phase | 내용 |
|-------|------|
| start | 문제 수, 과목별 분포(subjectDist), "지금 시작하기" 버튼 |
| quiz | ProgressBar + WrongCountBadge + MCQ(4지선다)/OX(O·X) + FeedbackBanner |
| done | ReclassificationAnimation + 뒤로가기 |

### enrichQuestion 로직

| source | 처리 |
|--------|------|
| MCQ/MOCK/CUSTOM | examStore.questions에서 id로 조인 → questionRaw, answer, subject 획득 |
| OX | isOX=true, questionRaw=null (OX 원문 별도 처리 예정) |

### FeedbackBanner

| 결과 | 표시 |
|------|------|
| 정답 | ✅ 약점 극복! |
| 오답 | ❌ {wrong_count+1}회로 이동 |

### App.jsx 추가 라우트

```jsx
<Route path="/unified-wrong" element={<UnifiedWrongReview />} />
<Route path="/unified-wrong/challenge/:minCount" element={<ChallengeMode />} />
```

---

## 4. 설계 결정 사항

| 결정 | 이유 |
|------|------|
| enrichQuestion 로직 | MCQ/OX 원본 데이터 분리 보관 → 오답 서비스는 id+source+wrong_count만 관리 |
| reclassifyResults fire-and-forget | done Phase 진입 즉시 UI 표시, 백그라운드 DB 업데이트 |
| OX questionRaw=null | OX 3,824문제 원문은 ox_*.json 별도 fetch 필요 — STEP 4 이후 구현 |
| subjectDist 계산 | subject ?? source 폴백으로 OX도 집계 가능 |

---

## 5. 테스트 결과

- 빌드: ✅ 성공 (139 modules, 591 kB)
- 검증: ✅ **79 PASS / 0 FAIL** (`node scripts/verify-gep099-step3.mjs`)
  - 11개 시나리오: 파일존재, 라우트, 구조확인, 레이아웃순서, enrichQuestion, MCQ/OX 정답판별, mcqStatus, subjectDist, ProgressBar

---

## 6. 배포 결과

- Commit: (아래 참조)
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app/unified-wrong

---

## 7. 다음 작업

- STEP 4 — OX 원문 조인 (ox_*.json fetch → ChallengeMode OX 문제 내용 표시)
- Supabase RPC `increment_wrong_count_mcq`, `increment_wrong_count_ox` 수동 생성 필요 (GEP_095 DDL 참조)
