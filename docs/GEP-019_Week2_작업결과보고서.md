# GEP 개발 작업결과보고서 — Week 2

**문서코드:** GEP-019 (Week 2)
**작성일:** 2026.02.21
**작성자:** 고팀장 (Claude Code)
**검토:** 노팀장 (claude.ai)
**승인:** 조대표님

---

## 1. Week 2 목표 및 결과

| 목표 | 결과 |
|------|------|
| Vercel 배포 (Week 2-1) | ✅ 완료 |
| 핵심 화면 구현 | ✅ 완료 |
| UI/UX 개선 | ✅ 완료 |
| 버그 수정 | ✅ 완료 |
| 진도 저장 개선 | ✅ 완료 |
| PWA 설정 | ✅ 완료 |

**배포 URL:** https://gepv11.vercel.app

---

## 2. 작업 상세

### 2-1. Vercel 배포

| 항목 | 내용 |
|------|------|
| Vercel CLI | npm install -g vercel (v50.22.1) |
| 프로젝트 | allipceos-projects/gepv1.1 |
| 운영 URL | https://gepv11.vercel.app |
| 빌드 환경 | Washington D.C. (iad1), Node.js |
| 빌드 시간 | 평균 1.8초 |

---

### 2-2. Result.jsx 구현 (과목 완료 화면)

**신규 구현:**
- 완료 메시지: `"23회 법령 완료!"` 형식
- 결과 통계: 전체 문제 수 / 정답(파랑) / 오답(빨강) / 정답률(%)
- 다시 풀기 버튼: `setCurrentIndex(0)` → `/question`
- 홈으로 버튼: `/`

**Question.jsx 연동:**
- 마지막 문제에서 "다음" → "완료" 버튼 변경
- 완료 클릭 시 `navigate('/result')`

**App.jsx:**
- `/result` 라우트 추가

---

### 2-3. UI/UX 개선

#### Settings.jsx 신규 생성
- 이름 / 시험일 입력 팝업
- localStorage `'gep:v1:settings'` 별도 저장 (store 무관)
- 앱 시작 시 자동 로드

#### Home.jsx 개편
| 항목 | 내용 |
|------|------|
| 타이틀 | "GEP 보험중개사" |
| D-day | 시험일 설정 시 `D-xx일` / 미설정 시 "시험일 설정" 버튼 |
| 설정 | 우상단 톱니바퀴 아이콘 |
| 하단 버튼 | 이어풀기(2/3) + 처음부터(1/3) grid 배치 |
| 과목 컬러 | 법령=파랑, 손보1부=초록, 손보2부=보라 |

#### Question.jsx 개편
- 헤더 배경: 과목별 컬러 (파랑/초록/보라)
- 헤더 중앙: `"23회 법령 15/120"` 형식

#### 전체 레이아웃
- `max-w-[640px] mx-auto` (PC 센터 정렬)

---

### 2-4. 버그 수정

#### [1] PC 우측 검은창 제거
- **원인:** `index.css`에 Vite 기본 템플릿 스타일 잔존
  - `:root { background-color: #242424; color: #fff }`
  - `body { display: flex; place-items: center }`
- **수정:** `:root` / `body` 배경 `#f3f4f6` (연회색), body flex 제거

#### [2] 버튼 레이아웃 개선
- **원인:** `QuestionView`의 `min-h-screen`이 이전/다음 버튼을 스크롤 아래로 밀어냄
- **수정:** Question.jsx를 `flex flex-col h-screen` 구조로 전면 재구성
  - 헤더 (flex-shrink-0)
  - 문제 영역 (flex-1 overflow-y-auto)
  - 하단 버튼 ①②③④ + 이전/다음 (flex-shrink-0)

#### [3] 이전 문제 초기화
- **원인:** store.answers 기반으로만 표시 → 이전 이동 후 재선택 불가
- **수정:** `localAnswered` (Set) 로컬 상태 추가
  - 이전 클릭 시 → 이동 문제 ID 제거 → ①②③④ 초기 상태
  - store.answers 수정 없음 (데이터 보존)

#### [4] 모바일 여백 축소
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| QuestionView 상단 패딩 | pt-4 (16px) | pt-2 (8px) |
| 과목 태그 마진 | mb-3 (12px) | mb-1 (4px) |
| 텍스트 줄간격 | leading-relaxed | leading-normal |
| 하단 버튼 패딩 | pt-3 (12px) | pt-2 (8px) |
| AnswerButton 패딩 | py-3 (24px) | py-2 (16px) |
| **총 절약** | | **약 34px** |

---

### 2-5. 진도 저장 개선 (progressMap)

**원인:** `currentIndex` 단일 전역값 → 과목/회차 변경 시 기존 진도 소실

**수정:** `examStore.js`에 `progressMap` 추가

```
progressMap 구조: { "23_법령": 14, "26_손보1부": 5 }
```

| 액션 | 동작 |
|------|------|
| `setSubject(subject)` | 해당 키 인덱스 로드 |
| `setRound(round)` | 해당 키 인덱스 로드 |
| `setCurrentIndex(n)` | 현재 키로 자동 저장 |
| `resumeProgress()` | 현재 과목/회차 인덱스 복원 |

- localStorage `'gep:v1:examStore'` 내 `progressMap` 직렬화 저장
- 기존 버전 가드 유지

---

### 2-6. PWA 설정

| 파일 | 내용 |
|------|------|
| `public/manifest.json` | 앱 이름: GEP 보험중개사, display: standalone, theme: #2563EB |
| `public/icon-192.svg` | 192×192 앱 아이콘 (파란 배경 + GEP 텍스트) |
| `public/icon-512.svg` | 512×512 앱 아이콘 |
| `public/sw.js` | Cache-First 전략, 오프라인 SPA 폴백 |
| `index.html` | manifest 링크, theme-color, Apple 메타태그, SW 등록 |

**Service Worker 전략:**
- install: `/`, `/index.html` 사전 캐시
- fetch: 캐시 우선 → 없으면 네트워크 후 자동 캐시 저장
- activate: 이전 버전 캐시 자동 삭제
- 오프라인 폴백: `/index.html` (SPA 동작 유지)

---

## 3. 수정/생성 파일 목록

| 파일 | 작업 |
|------|------|
| `src/stores/examStore.js` | progressMap 추가 |
| `src/pages/Home.jsx` | 전면 개편 |
| `src/pages/Question.jsx` | 레이아웃 재구성, localAnswered |
| `src/pages/Result.jsx` | 신규 구현 |
| `src/components/Settings.jsx` | 신규 생성 |
| `src/components/QuestionView.jsx` | min-h-screen 제거, 여백 축소 |
| `src/components/AnswerButtons.jsx` | fixed 제거 |
| `src/components/AnswerButton.jsx` | py-3 → py-2 |
| `src/index.css` | 검은 배경 제거 |
| `src/App.jsx` | /result 라우트 추가 |
| `index.html` | PWA 메타태그 + SW 등록 |
| `public/manifest.json` | 신규 |
| `public/icon-192.svg` | 신규 |
| `public/icon-512.svg` | 신규 |
| `public/sw.js` | 신규 |

---

## 4. 현재 프로젝트 파일 구조

```
GEPv1.1/
├── public/
│   ├── data/
│   │   └── exams.json              ✅ 1,080문제 (937KB)
│   ├── manifest.json               ✅ PWA 매니페스트
│   ├── icon-192.svg                ✅ 앱 아이콘 192x192
│   ├── icon-512.svg                ✅ 앱 아이콘 512x512
│   └── sw.js                       ✅ 서비스 워커
├── src/
│   ├── components/
│   │   ├── Settings.jsx            ✅ 설정 팝업 (신규)
│   │   ├── QuestionView.jsx        ✅ 완료
│   │   ├── AnswerButtons.jsx       ✅ 완료
│   │   ├── AnswerButton.jsx        ✅ 완료
│   │   ├── Header.jsx              🔲 미사용
│   │   ├── ProgressBar.jsx         🔲 미사용
│   │   ├── SubjectDropdown.jsx     🔲 미사용
│   │   ├── RoundSelector.jsx       🔲 미사용
│   │   ├── BottomNav.jsx           🔲 미사용
│   │   └── ResumeCard.jsx          🔲 미사용
│   ├── pages/
│   │   ├── Home.jsx                ✅ 완료
│   │   ├── Question.jsx            ✅ 완료
│   │   ├── Result.jsx              ✅ 완료
│   │   └── Settings.jsx            🔲 빈 파일 (components/Settings.jsx로 대체)
│   ├── stores/
│   │   └── examStore.js            ✅ progressMap 포함
│   ├── utils/
│   │   ├── loadExams.js            ✅ 완료
│   │   └── storage.js              🔲 미사용
│   ├── constants/
│   │   └── subjects.js             🔲 미사용
│   ├── App.jsx                     ✅ 3개 라우트
│   ├── index.css                   ✅ PWA 스타일
│   └── main.jsx                    ✅
├── index.html                      ✅ PWA 설정 완료
├── scripts/
│   ├── fix-subject-by-part-number.js   ✅
│   └── export_notion_to_json.js        ✅
├── .env                            ✅
├── .gitignore                      ✅
├── package.json                    ✅
└── vite.config.js                  ✅
```

---

## 5. 전체 개발 일정

| 단계 | 기간 | 목표 | 상태 |
|------|------|------|------|
| Week 0 | 완료 | 데이터 준비, 환경설정 | ✅ 완료 |
| Week 1 | 완료 | 문제 풀기 + 저장 | ✅ 완료 |
| Week 2 | 완료 | Vercel 배포 + UI 완성 + PWA | ✅ 완료 |
| Week 3 | 다음 | 안정화 + 추가 기능 | 🔲 예정 |
| Week 4 | 예정 | 정식 오픈 | 🔲 예정 |

---

## 6. Week 3 예정 작업 (참고)

- 미사용 컴포넌트 정리 (Header, ProgressBar, BottomNav 등)
- Result.jsx 오답 노트 기능
- 홈화면 전체 통계 표시
- 안정성 테스트 및 버그 수정
