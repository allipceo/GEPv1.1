# GEPv30-151 서비스 B(과목별 랜덤풀이) 과목 순서 정정 구현 결과보고

**작성일:** 2026-08-29 | **작성자:** 고팀장 (Claude Code)
**지시:** 조대표 — 선택형 과목별 풀기 화면에서 손보2부·법령·손보1부 순으로 잘못 표시됨(정상: 법령·손보1부·손보2부)

---

## 1. 증상

`/service-b`(서비스 B, 과목별 랜덤풀이) 화면에서 과목 카드 순서가 **손보2부 → 법령 → 손보1부**로 표시됨. 정상 순서는 **법령 → 손보1부 → 손보2부**(다른 모든 화면 — Home, MockExamResult, CustomMockResult, WrongReviewSubjects 등 — 은 이미 이 순서를 따름).

## 2. 원인 조사

지시문 예상(하드코딩 배열 or config `order` 필드)과 달리, 실제 원인은 [ServiceBHome.jsx](GEPv1.1-source/src/pages/ServiceBHome.jsx)의 `subjects` 계산 로직이었다.

```js
// 수정 전
const grouped = new Map()
questions.forEach((question) => {
  if (!grouped.has(question.subject)) grouped.set(question.subject, new Map())
  ...
})
return [...grouped.entries()].map(...)   // Map 삽입 순서 = questions 배열에서 각 과목이 "처음 등장하는 순서"
```

`questions`는 `exams.json`(절대 수정 금지 대상, [CLAUDE.md](GEPv1.1-source/CLAUDE.md) §10.1)을 그대로 순회한 배열이고, 그 안에서 손보2부 문제가 법령/손보1부보다 먼저 나타나는 구간이 있어 `Map` 삽입 순서가 뒤틀렸다. 즉 **과목 순서가 소스 데이터 배치에 종속되어 있었고, 화면 쪽에 명시적 정렬이 없었다.**

## 3. 수정 내용

`exams.json`은 건드리지 않고(수정 금지 원칙 준수), 화면 레벨에 이미 다른 페이지들이 쓰는 것과 동일한 정렬 상수를 추가했다.

| 파일 | 변경 |
|---|---|
| `src/pages/ServiceBHome.jsx` | `SUBJECT_ORDER = ['법령', '손보1부', '손보2부']` 상수 추가, `subjects` useMemo에서 `grouped.entries()`를 이 순서로 정렬 후 매핑(목록에 없는 과목은 뒤로, 그중에서는 가나다순 폴백) |

## 4. 검증

- `npm run build` — 성공
- 실계정(사번 12345678) 로그인 후 `/service-b` 접속, `get_page_text`로 전체 텍스트 순서 확인:
  ```
  법령 → 보험업법/상법/세제재무/위험관리
  손보1부 → 보증보험/연금저축/자동차보험/특종보험
  손보2부 → 재보험/항공우주/해상보험/화재보험
  ```
  대분류(법령→손보1부→손보2부) 순서 정상. 세부과목은 기존 로직대로 가나다순 정렬 유지(변경 범위 아님).

## 5. 영향 범위

`ServiceBHome.jsx` 1개 파일만 수정. 다른 화면(Home, MockExamResult, WrongReviewSubjects 등)은 원래부터 정상 순서였으므로 변경 없음.
