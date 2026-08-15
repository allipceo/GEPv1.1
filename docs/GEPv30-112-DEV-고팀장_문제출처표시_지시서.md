# GEPv30-112 고팀장 개발 지시서 — MiniMock 문제 출처 표시

**문서번호**: GEPv30-112  
**작성일**: 2026-08-15  
**작성자**: 노팀장 (Claude Cowork)  
**수신**: 고팀장 (Claude Code)  
**브랜치**: `gepv30-mini-mock` (또는 신규 `gepv30-112-source-display`)  
**성격**: MiniMockQuiz 화면에 문제 출처(회차·과목·번호) 표시 추가  
**정정 이력**: 고팀장 코드베이스 교차검증 반영 (STEP 1·3·5 수정, 2026-08-15)

---

## 배경

배포된 MiniMock 퀴즈 화면에서 현재 문제 메타 칩이:

```
법령 · 보험업법 · 3번
```

으로만 표시된다. 사용자(수험생)가 해당 문제가 **몇 회차 시험의 몇 번 문제**인지 알 수 없어 출처 정보 추가가 요청됨.

**목표 UI**:
```
법령 · 보험업법 · 3번
(23회, 법령 3번 문제)
```

---

## 데이터 확인 결과

`public/data/exams.json` 각 문제에 다음 두 필드가 존재한다:

| 필드 | 의미 | 예시 |
|------|------|------|
| `partNumber` | 전체 120문 절대 번호 (법령 1~40, 손보1 41~80, 손보2 81~120) | 41 |
| `roundNumber` | **과목 내 순번 (각 교시 1~40)** | 1 |

시험 구조: 1교시 법령 1~40번 / 2교시 손보1부 1~40번 / 3교시 손보2부 1~40번  
→ 표시에 사용할 필드: **`roundNumber`** (과목 내 독립 순번)

**현재 문제**: `mini_mock_sets.json` 생성 스크립트에서 `roundNumber` 필드를 복사하지 않아 세트 JSON에 없음.

---

## STEP 1 — `scripts/generateMiniMockSets.cjs` 수정

실제 코드는 `.map()` 아닌 `.forEach(...push(...))` 패턴이다.  
**52~60행** 블록에 `roundNumber: q.roundNumber,` 한 줄만 추가:

```js
// 실제 코드 (52~60행) — roundNumber 한 줄 추가
picked.forEach(q => questions.push({
  id:          q.id,
  round:       q.round,
  roundNumber: q.roundNumber,   // ← 추가 (56행 위치)
  subject:     q.subject,
  subSubject:  q.subSubject,
  questionRaw: q.questionRaw,
  answer:      q.answer,
}))
```

**주의**: 스크립트 파일 전체를 재작성하지 말고, 56행 위치에 한 줄만 삽입.

---

## STEP 2 — `mini_mock_sets.json` 재생성

```bash
node scripts/generateMiniMockSets.cjs
```

재생성 후 `public/data/mini_mock_sets.json` 첫 번째 세트 첫 문제에 `roundNumber` 필드가 있는지 확인:

```bash
node -e "
const d = require('./public/data/mini_mock_sets.json');
const q = d[0].questions[0];
console.log('roundNumber:', q.roundNumber, '/ round:', q.round, '/ subject:', q.subject);
"
```

`roundNumber`가 1~40 사이 정수로 출력되면 정상.

---

## STEP 3 — `src/pages/MiniMockQuiz.jsx` 수정

실제 261~272행 코드 기준. 변수명은 `question` (currentQ 아님), 클래스는 Tailwind.

### 현재 (261~272행, 변경 전)

```jsx
<div className="flex items-center gap-2 mb-4">
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${subjectBadge}`}>
    {question.subject}
  </span>
  {question.subSubject && (
    <span className="text-xs text-gray-400">{question.subSubject}</span>
  )}
  <span className="text-xs text-gray-300">·</span>
  <span className="text-xs text-gray-400">{currentIndex + 1}번</span>
</div>
```

### 수정 후 — 위 `</div>` 바로 아래에 삽입

```jsx
<div className="flex items-center gap-2 mb-4">
  {/* 기존 코드 그대로 */}
</div>
{question.roundNumber != null && (
  <p className="text-xs text-gray-400 text-center -mt-2 mb-4">
    (원본: {question.round}회 {question.subject} {question.roundNumber}번 문제)
  </p>
)}
```

**UX 설명**: "원본:" 접두어가 필수다.  
칩의 `{currentIndex + 1}번`은 이 세트 내 순서(1~30), `roundNumber`는 원시험 과목 내 순서(1~40) — 대부분 다른 숫자가 출력되므로 구분어 없으면 혼란을 준다.  
예: 세트 내 5번째 문제 = 원본 법령 17번 문제 → `(원본: 23회 법령 17번 문제)` 로 표시.

---

## STEP 4 — 로컬 확인

1. `npm run dev` 실행
2. `/mini-mock` → 아무 세트 선택 → 퀴즈 진입
3. 문제 칩 아래 `(23회, 법령 3번 문제)` 형식 텍스트 확인
4. 다음/이전 문제 이동 시 회차·번호 정상 변경 확인
5. 세트가 다르면 다른 `round` 값이 나오는지 확인 (SET 01과 SET 10 비교)

---

## STEP 5 — 완료보고서 작성 → 커밋 & 푸시

### 5-1. 완료보고서 생성 (커밋 전 필수)

CLAUDE.md 8절 규칙: 파일 수정이 있는 모든 GEP 작업은 `docs/` 완료보고서 필수.  
`docs/GEPv30-112-완료보고서.md` 생성:

```markdown
# GEPv30-112 완료보고서 — MiniMock 문제 출처 표시

**작성일**: [날짜]  
**작성자**: 고팀장 (Claude Code)  
**작업 목적**: MiniMockQuiz 문제 칩 아래 원본 출처 표시 추가

## 수정 파일
- scripts/generateMiniMockSets.cjs — roundNumber 필드 복사 추가 (56행)
- public/data/mini_mock_sets.json — 30세트 재생성
- src/pages/MiniMockQuiz.jsx — 출처 텍스트 렌더링 추가 (272행 아래)

## 테스트 결과
- SET [번호] 확인: [회차]회 [과목] [번호]번 문제 표시 정상
- 다음/이전 이동 시 roundNumber 변경 정상
- roundNumber null 방어 처리 확인

## 특이사항
[있으면 기재, 없으면 없음]
```

### 5-2. 커밋 & 푸시

```bash
git add public/data/mini_mock_sets.json \
        scripts/generateMiniMockSets.cjs \
        src/pages/MiniMockQuiz.jsx \
        docs/GEPv30-112-완료보고서.md

git commit -m "feat: MiniMock 문제 출처 표시 추가 (round·roundNumber)

- generateMiniMockSets.cjs에 roundNumber 필드 복사 추가 (56행)
- mini_mock_sets.json 30세트 재생성
- MiniMockQuiz.jsx 칩 아래 출처 텍스트 렌더링
  예: (원본: 23회 법령 17번 문제)

GEPv30-112"

git push origin gepv30-mini-mock
```

---

## 완료 보고 기준

노팀장에게 다음 형식으로 보고:

```
GEPv30-112 완료 보고

1. generateMiniMockSets.cjs — roundNumber 추가 완료
2. mini_mock_sets.json 재생성 완료 (30세트 × 30문)
3. MiniMockQuiz.jsx 출처 텍스트 추가 완료
4. 로컬 확인: SET [번호] 기준 (회차)회, (과목) (번호)번 문제 표시 정상
5. 커밋 해시: [해시]
6. 특이사항: [있으면 기재, 없으면 '없음']
```

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `scripts/generateMiniMockSets.cjs` | `roundNumber` 필드 복사 1줄 추가 (56행) |
| `public/data/mini_mock_sets.json` | 재생성 (roundNumber 포함) |
| `src/pages/MiniMockQuiz.jsx` | 출처 텍스트 렌더링 추가 (272행 아래) |
| `docs/GEPv30-112-완료보고서.md` | 신규 생성 (CLAUDE.md 8절 규칙) |

**수정 금지**: `statsService.js`, `miniMockService.js`, `miniMockStore.js`, `App.jsx`, `featureFlags.js` — 이번 작업과 무관.

---

**GEPv30-107 ~ GEPv30-111 기준선은 그대로 유지. GEPv30-112는 UI 표시 전용 추가 작업.**
