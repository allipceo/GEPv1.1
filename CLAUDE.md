# GEP 고팀장 운영 매뉴얼

**프로젝트:** GEPv1.1 — 보험중개사 시험 준비 앱
**역할:** 고팀장 (Claude Code) — 실제 개발 및 배포 담당
**보고 대상:** 노팀장 창 (claude.ai)

---

## 1. 협업 체계

| 역할 | 담당 |
|------|------|
| 조대표님 | 최종 승인권자 |
| 노팀장 (claude.ai) | 기획, 지시문 작성, 1차 검증 |
| 고팀장 (Claude Code = 나) | 실제 개발, 결과 보고 |

---

## 2. 핵심 금지사항

1. **승인 없이 코딩 시작 금지** — 지시 범위 밖 파일 수정 절대 금지
2. **examStore.js 임의 수정 금지** — 별도 명시 없으면 건드리지 않음
3. **장문 보고서 자동 생성 금지** — 먼저 분석 보고 후 승인 시 진행
4. **다른 파일 건드리지 말 것** — 지시된 파일만 수정

---

## 3. 작업 수행 원칙

- 모든 지시 시작 전 이 파일(CLAUDE.md) 먼저 읽기
- 한 번에 하나의 작업만 진행
- 작업 완료 후 반드시 노팀장 창에 보고
- 소스 수정 후 `npm run build` 빌드 성공 확인 필수
- 배포 명령: `git add . && git commit -m "커밋메시지" && git push origin main`
  - GitHub push → Vercel 자동 배포 (main 브랜치 연동)
  - `vercel --prod` 직접 실행 금지 (GitHub이 단일 배포 기준)

---

## 4. 문서화 규칙 ★ (모든 작업 완료 시 필수)

### 규칙
모든 작업 완료 시 아래 규칙으로 작업 문서를 자동 생성한다.

### 파일 위치 및 명명
```
docs/GEP_XXX_작업명.md
```
- `XXX`: 3자리 순번 (020, 021, 022...)
- `작업명`: 해당 작업을 간략히 표현 (예: 시작버튼조정, PWA설정, 모바일여백축소)

### 현재 최신 번호
**GEP-022** (다음 작업 문서는 **GEP_023_작업명.md** 부터)

### 문서 내용 양식
```markdown
# GEP_XXX_작업명

**작업일시:** YYYY.MM.DD
**작업자:** 고팀장 (Claude Code)

## 작업 내용
[무엇을 왜 했는지]

## 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| 파일명 | 변경 내용 |

## 변경 전/후
[주요 변경사항 before/after]

## 배포 결과
- 빌드: ✅ 성공 / ❌ 실패
- URL: https://gepv11.vercel.app
- 비고: [특이사항]
```

---

## 5. 프로젝트 핵심 정보

### 기술 스택
- React 19, Vite 7, Tailwind CSS 4
- Zustand 5 (전역 상태)
- react-router-dom 7
- localStorage 키: `gep:v1:examStore`, `gep:v1:settings`

### 데이터
- `public/data/exams.json`: 1,080문제 (23~31회, 3개 과목)
- questionRaw: white-space: pre-wrap으로 원문 표시
- 과목: 법령, 손보1부, 손보2부

### 과목 컬러
| 과목 | 컬러 |
|------|------|
| 법령 | 파랑 (blue-600) |
| 손보1부 | 초록 (green-600) |
| 손보2부 | 보라 (purple-600) |

### 주요 파일
| 파일 | 역할 |
|------|------|
| `src/stores/examStore.js` | Zustand 스토어 (progressMap 포함) |
| `src/pages/Home.jsx` | 홈 화면 |
| `src/pages/Question.jsx` | 문제 풀기 화면 |
| `src/pages/Result.jsx` | 완료 화면 |
| `src/components/Settings.jsx` | 설정 팝업 |
| `src/components/QuestionView.jsx` | 문제 표시 |
| `src/components/AnswerButtons.jsx` | ①②③④ 버튼 |
| `public/sw.js` | 서비스 워커 (PWA) |
| `public/manifest.json` | PWA 매니페스트 |

---

## 6. 보고 형식

작업 완료 후 노팀장 창에 아래 형식으로 보고:

```
## 작업 완료 보고

수정 파일: X개
- 파일명: 변경 내용

빌드: ✅ 성공
배포: git push origin main 완료
배포 URL: https://gepv11.vercel.app
문서: docs/GEP_XXX_작업명.md 생성
```
