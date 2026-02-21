# GEP 환경설정 가이드

**작성일:** 2026.02.18  
**작성자:** 노팀장  
**대상:** 조대표님 (초보자 기준)

---

## 1. 환경설정 체크리스트

### ✅ 완료 항목

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | Node.js | ✅ v24.13.1 | 최신 버전 |
| 2 | Git | ✅ v2.53.0 | 최신 버전 |
| 3 | VS Code | ✅ 설치됨 | Claude Code 확장 포함 |
| 4 | Claude Code | ✅ 설치됨 | VS Code 확장으로 동작 중 |
| 5 | CLAUDE.md | ✅ 배치됨 | 프로젝트 루트 |
| 6 | MCP - context7 | ✅ Connected | React/Tailwind 문서 참조 |
| 7 | MCP - sequential-thinking | ✅ Connected | 작업 분해 |
| 8 | 기획안 PDF 5종 | ✅ 배치됨 | GEP-010~014 |
| 9 | 엑셀 데이터 | ✅ 배치됨 | ExamBank_Master_Data |

### 🔲 남은 항목

| # | 항목 | 명령어 | 언제 |
|---|------|--------|------|
| 1 | Vercel CLI | `npm i -g vercel` | Week 3 배포 시 |
| 2 | GitHub 저장소 생성 | GitHub.com에서 생성 | Week 0 시작 시 |
| 3 | GitHub MCP 추가 | 아래 명령어 참조 | 저장소 생성 후 |
| 4 | Notion API 토큰 | Notion 개발자 페이지 | Week 0 시작 시 |

#### GitHub MCP 추가 방법 (저장소 만든 후)
```cmd
:: cmd에서 실행
claude mcp add-json github "{\"type\":\"stdio\",\"command\":\"cmd\",\"args\":[\"/c\",\"npx\",\"-y\",\"@modelcontextprotocol/server-github\"],\"env\":{\"GITHUB_PERSONAL_ACCESS_TOKEN\":\"여기에_토큰\"}}"
```

#### GitHub 토큰 생성법
1. https://github.com/settings/tokens 접속
2. "Generate new token (classic)" 클릭
3. 권한: repo 체크
4. 생성된 토큰 복사 (한번만 보임, 메모 필수!)

---

## 2. 프로젝트 초기 세팅 (Week 0에 고팀장이 할 일)

```bash
# 프로젝트 생성
npm create vite@latest gep-frontend -- --template react
cd gep-frontend

# 패키지 설치
npm install
npm install zustand
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite

# 확인
npm run dev
```

> ⚠️ 이 작업은 고팀장에게 지시할 내용입니다. 
> 조대표님이 직접 하실 필요 없습니다.

---

## 3. 고팀장 샘플 지시문

### 지시문 ①: 프로젝트 초기 세팅 (Week 0)

```
CLAUDE.md를 읽고 프로젝트 구조를 파악해.

작업 지시:
1. npm create vite@latest로 React 프로젝트 생성
2. zustand, react-router-dom, tailwindcss 설치
3. CLAUDE.md의 프로젝트 구조대로 폴더 생성
4. 빈 파일들 생성 (내용은 아직 작성 금지)
5. npm run dev로 정상 실행 확인

완료 후 작업 보고 형식으로 보고해.
```

### 지시문 ②: 컴포넌트 개발 (Week 1)

```
CLAUDE.md를 읽고 코딩 컨벤션을 확인해.
GEP-013 프론트엔드 기획안을 참조해.

작업 지시:
QuestionView.jsx 컴포넌트를 개발해.
- 문제 번호, 문제 텍스트, 4개 선택지 표시
- props: question 객체를 받음
- Tailwind CSS로 모바일 우선 스타일링
- 한국어 주석 포함

다른 컴포넌트는 건드리지 마.
완료 후 작업 보고 형식으로 보고해.
```

### 지시문 ③: 버그 수정

```
CLAUDE.md를 읽어.

문제 상황:
[여기에 에러 메시지 또는 증상 설명]

작업 지시:
1. 원인 분석 먼저 보고해 (코드 수정 전)
2. 내가 승인하면 수정 진행
3. 다른 파일은 건드리지 마
```

### 지시문 ④: 진행상황 확인

```
현재 프로젝트 상태를 보고해.
- 생성된 파일 목록
- 각 파일의 완성도 (빈파일/작성중/완료)
- npm run dev 실행 가능 여부
- 발견된 이슈

작업 보고 형식으로 보고해.
```

---

## 4. 고팀장 지시 시 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **CLAUDE.md 먼저 읽혀라** | 모든 지시 첫 줄에 "CLAUDE.md를 읽고" 포함 |
| **한 번에 하나** | 지시 1개 = 컴포넌트 1개 또는 기능 1개 |
| **범위 제한** | "다른 파일은 건드리지 마" 명시 |
| **보고 강제** | "작업 보고 형식으로 보고해" 포함 |
| **2단계 진행** | 분석→승인→수정 (특히 버그/리팩토링) |

---

## 5. 트러블슈팅

### MCP 연결 실패 시
```cmd
:: cmd에서 실행
claude mcp remove 서버이름
claude mcp add-json 서버이름 "{\"type\":\"stdio\",\"command\":\"cmd\",\"args\":[\"/c\",\"npx\",\"-y\",\"패키지명\"]}"
```
> Windows에서는 `cmd /c` 래퍼가 필요한 경우가 많음

### Claude Code가 응답 없을 때
- VS Code 재시작
- 터미널에서 `claude` 입력하여 직접 실행 테스트

### 고팀장이 엉뚱한 작업을 할 때
- "중지해. CLAUDE.md를 다시 읽고, 금지사항을 확인해." 입력
- 금지사항 4개가 CLAUDE.md에 명시되어 있으므로 즉시 멈춤