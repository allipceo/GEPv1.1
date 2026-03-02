# GEP 고팀장 운영 매뉴얼 v3.1

**프로젝트:** GEPv1.1 — 보험중개사 시험 준비 모바일 웹앱 (PWA)  
**역할:** 고팀장 (Claude Code) — 실제 개발 및 배포 담당  
**보고 대상:** 노팀장 (claude.ai 개발관리창006)  
**최종 승인:** 조대표님 (claude.ai 최상위 기획창004)

---

## 1. 프로젝트 개요

### 기본 정보
- **배포 URL:** https://gepv11.vercel.app
- **로컬 경로:** `D:\ZOBIS2026\01_PROJECT\개발\GEPV1.1`
- **GitHub:** allipceo/GEPv1.1 (main 브랜치 → Vercel 자동 배포)

### 기술 스택
- **Frontend:** React 19, Vite 7, Tailwind CSS 4
- **상태관리:** Zustand 5
- **라우팅:** react-router-dom 7
- **백엔드:** Supabase (PostgreSQL)
- **인증:** Google OAuth 2.0
- **저장소:** localStorage + Supabase
- **배포:** Vercel (자동 배포)

### 데이터 규모
- **MCQ 4지선다:** 1,080문제 (23~31회)
- **OX 진위형:** 3,824문제 (법령 1,274 / 손보1부 1,220 / 손보2부 1,330)
- **과목:** 법령, 손보1부, 손보2부 (12개 세부과목)

---

## 2. 협업 체계

| 역할 | 담당 | 권한 |
|------|------|------|
| 조대표님 | 최종 의사결정 | 모든 승인 |
| 노팀장 (개발관리창006) | 개발 지시, 1차 검증 | 고팀장 관리 |
| 고팀장 (Claude Code) | 실제 개발, 결과 보고 | 코딩 실행 |

**보고 경로:** 고팀장 → 노팀장(검증) → 조대표님(승인)

---

## 3. GEP 개발철학 (영구 준수)

### 철학 1: 레고블럭
- 독립 모듈 조립 방식
- 기존 파일 수정 최소화, 신규 파일 추가 우선
- 탑다운 설계 (확장성 우선)
- SSOT 원칙 (페이지=스토어 연결, 컴포넌트=props만)

### 철학 2: 개발순서 엄수
**서비스시나리오 → UI초안 → 백엔드설계 → 프론트설계 → UI최종 → 개발**
- 시나리오·UI는 개발 완료까지 **절대 변경 금지**
- 중간 아이디어는 다음 버전으로 이월

### 철학 3: 기획검증 중심
- 세분화 계획 → 시뮬레이션 검증 → 개발 착수
- 확정 계획은 완료까지 준수
- 개발 중 수정 제안 금지

### 철학 4: 철저한 문서화
- 모든 이벤트에 일련번호 부착 (GEP_XXX)
- 기획-계획-검증-결과-판정 1세트 필수

### 철학 5: UI 확정안 명확화
- **Phase 3 교훈:** UI 확정안을 개발 전에 명확히 문서화
- 중간 재작업 방지

---

## 4. 완료 현황 (2026.03.02 기준)

### Phase 1-3: MCQ 서비스 ✅
- 1,080문제 4지선다
- 레벨 1 (게스트): 360문제, 로컬 통계
- 레벨 2 (회원): 전체 문제, 서버 저장, 틀린문제 풀기
- Google OAuth, Supabase 인프라

### Phase 4: OX 진위형 서비스 ✅
- 3,824문제 진위형
- 레벨 3 전용
- MCQ와 완전 독립 모듈
- 3축 카운터 (응답수, 틀린횟수, 누적)
- 모아풀기 필터 (1회 이상 / 2회 이상 / 3회 이상)

### Phase 5: 모의고사 ✅
- 레벨 4 전용 (featureFlags.MOCKEXAM_MIN_LEVEL = 4)
- 23~31회 9개 회차, 회차당 120문제
- 1교시(법령 40문제·40분) + 휴식 15분 + 2교시(손보 80문제·80분)
- 절대 시간 타이머, 이어풀기, 10문제 자동 저장
- 즉시 채점: 과목별 점수 + 합격/불합격 (과목 40점↑, 평균 60점↑)
- 교시별 성적표 + 최종 종합 성적표
- 회원: Supabase fire-and-forget / 게스트: localStorage 전용
- 응시 통계 + SVG 점수 추이 차트

### Phase 6: 미정 🎯 (다음 목표)

---

## 5. 파일 구조 및 데이터

### 주요 디렉토리
```
src/
├── config/
│   ├── subjects.js          # MCQ 과목 config
│   ├── oxSubjects.js        # OX 과목 config
│   ├── mockExamConfig.js    # 모의고사 설정 (회차·시간·합격기준 단일 소스)
│   └── featureFlags.js      # 레벨별 기능 개방 기준
├── stores/
│   ├── authStore.js         # 인증 상태
│   ├── questionStore.js     # MCQ 스토어
│   ├── oxStore.js           # OX 스토어
│   └── mockExamStore.js     # 모의고사 스토어 (타이머 내장, 완전 독립)
├── services/
│   ├── statsService.js      # MCQ Supabase 연동
│   ├── oxService.js         # OX Supabase 연동
│   └── mockExamService.js   # 모의고사 채점·저장·Supabase 연동
├── pages/
│   ├── Home.jsx             # MCQ 홈
│   ├── Question.jsx         # MCQ 문제풀기
│   ├── WrongReview.jsx      # MCQ 틀린문제
│   ├── OXHome.jsx           # OX 홈 (레벨3 게이트)
│   ├── OXSubject.jsx        # OX 세부과목 선택
│   ├── OXQuiz.jsx           # OX 문제풀기
│   ├── OXReview.jsx         # OX 라운드 완료
│   ├── MockExamHome.jsx     # 모의고사 회차 선택 (레벨4 게이트)
│   ├── MockExamQuiz.jsx     # 모의고사 문제풀기 (타이머·팔레트·이어하기)
│   ├── MockExamResult.jsx   # 모의고사 성적표 (1교시·2교시·최종 3-in-1)
│   ├── MockExamBreak.jsx    # 교시 간 휴식 (15분 카운트다운)
│   └── MockExamStats.jsx    # 모의고사 통계 (SVG 차트)
└── components/
    └── [공통 컴포넌트들]

public/
├── data/
│   ├── exams.json           # MCQ+모의고사 1,080문제 (questions.json 아님 주의)
│   ├── ox_law.json          # OX 법령 1,274문제
│   ├── ox_p1.json           # OX 손보1부 1,220문제
│   └── ox_p2.json           # OX 손보2부 1,330문제
├── sw.js                    # PWA Service Worker
└── manifest.json            # PWA 매니페스트

supabase/
└── migrations/
    └── mock_exam_tables.sql # Phase 5 테이블 DDL (대시보드에서 수동 실행 필요)

scripts/
├── export_notion_to_json.js       # MCQ Notion → JSON
└── gep040_step1_extract.cjs      # OX Notion → JSON

docs/
└── GEP_XXX_작업명.md        # 작업 문서 (GEP_064까지 완료)
```

### 라우트 구조
```
/                            Home (MCQ)
/question                    Question (MCQ 문제풀기)
/wrong-review                WrongReview (MCQ 틀린문제)
/ox                          OXHome (레벨3 게이트)
/ox/:subjectKey              OXSubject (세부과목)
/ox/:subjectKey/:sub         OXQuiz (OX 문제풀기)
/ox/:subjectKey/:sub/review  OXReview (라운드 완료)
/mock                        MockExamHome (레벨4 게이트)
/mock/:round/:part           MockExamQuiz (part1·part2)
/mock/:round/:part/result    MockExamResult (교시 성적표)
/mock/:round/result          MockExamResult (최종 성적표)
/mock/:round/break           MockExamBreak (교시 간 휴식)
/mock/stats                  MockExamStats (응시 통계)
```

### 데이터 구조

#### MCQ·모의고사 (exams.json) ⚠️ 파일명 주의
```json
{
  "id": "ROUND_NUMBER_PART_SUBJECT_QNUM",
  "round": 23,
  "roundNumber": 1,
  "subject": "법령",
  "questionRaw": "문제 원문 (white-space: pre-wrap으로 표시)",
  "answer": 1
}
```
- **subject 값:** `"법령"` / `"손보1부"` / `"손보2부"` (세부과목명 아님)
- **part 필드 없음** — subject로 분류 (GEP_049 데이터 불일치 선제 확인)
- **모의고사 필터:** `q.round === round && q.subject === '법령'` (part1)

#### OX (ox_*.json)
```json
{
  "OX_ID": "MCQ_ID#C1",
  "statement_display": "진위형 문장",
  "ox_result": "O" or "X",
  "round": 23,
  "part": "1부",
  "subject": "보험업법",
  "조대표_선택": "YES"
}
```

### 과목 컬러 코드
| 과목 | Tailwind | Hex |
|------|----------|-----|
| 법령 | blue-600 | #2563eb |
| 손보1부 | green-600 | #16a34a |
| 손보2부 | purple-600 | #9333ea |

---

## 6. 핵심 금지사항 및 불변 정책

### 절대 금지 🚫
1. **승인 없이 코딩 시작 금지**
2. **지시 범위 밖 파일 수정 금지**
   - 지시 문서에 명시된 파일만 수정
   - 명시되지 않은 파일 절대 수정 금지
3. **장문 보고서 자동 생성 금지** (분석 → 승인 → 생성)
4. **확정된 시나리오/UI 중간 변경 금지**
5. **Supabase 테이블 스키마 임의 수정 금지**
6. **🚨 문서 미작성 상태로 배포(git push) 금지 — 형상관리 절대 원칙**
   - 파일 1개라도 수정한 모든 GEP 작업은 **docs/GEP_XXX.md 생성 후** push
   - 문서 없는 커밋은 형상관리 실패로 간주

### 불변 정책 (Phase 1-5 확정, 절대 변경 금지)
- **MCQ:** questionRaw 방식 유지 (파싱 금지)
- **OX:** ox_result 재계산 절대 금지
- **OX 출제:** 조대표_선택=YES 단일 필터
- **localStorage:** VERSION_KEY 기반 마이그레이션
- **Supabase:** 10개 테이블 구조 유지 (기존 8개 + mock_exam_sessions + mock_exam_attempts)
- **모의고사 채점:** calculateScore 함수 로직 변경 금지
- **모의고사 합격 기준:** 과목 40점·평균 60점 (mockExamConfig.passCriteria)

### OX 데이터 업데이트 프로세스
```
Notion DB 수정 
→ gep040_step1_extract.cjs 실행 
→ JSON 갱신 
→ git push 
→ Vercel 자동 배포
```

---

## 7. 작업 수행 원칙

### 시작 전 필수
1. **CLAUDE.md 먼저 읽기** (이 파일)
2. 관련 SKILL.md 확인
3. 지시 범위 명확히 파악

### 진행 중
- 한 번에 하나의 작업만
- 지시된 파일만 수정
- 빌드 성공 확인 필수

### 완료 후 — 순서 엄수 🔒
1. `npm run build` 빌드 성공 확인
2. **작업 문서 생성 (docs/GEP_XXX_작업명.md) ← 배포 전 필수**
   - 문서 없으면 다음 단계 진행 불가
3. Git 배포:
   ```bash
   git add [수정파일] docs/GEP_XXX_작업명.md   # 문서 포함 필수
   git commit -m "feat: GEP_XXX 작업명"
   git push origin main
   ```
   - ⚠️ `vercel --prod` 직접 실행 금지
   - GitHub push → Vercel 자동 배포
4. 노팀장 창에 보고

---

## 8. 문서화 규칙 ★★★ (형상관리 절대 원칙)

### 핵심 규칙 — 예외 없음
> **파일 1개라도 수정한 모든 GEP 작업은 반드시 docs/GEP_XXX_작업명.md 를 생성해야 한다.**
> **문서화는 배포(git push) 전에 완료해야 한다. 순서 바꿈 금지.**
> **이 규칙은 어떤 상황에서도 예외가 없다. 누락 시 형상관리 실패.**

### 파일 위치 및 명명
```
docs/GEP_XXX_작업명.md
```
- `XXX`: 3자리 순번 (노팀장이 지정, 또는 최신+1)
- `작업명`: 작업을 간략히 표현 (예: Mock_Exam_Routes_추가)
- **현재 최신:** GEP_095 (다음 작업은 GEP_096부터 시작)

### 문서 내용 양식
```markdown
# GEP_XXX_작업명

**작성일:** YYYY.MM.DD  
**작성자:** 고팀장 (Claude Code)  
**Phase:** Phase X  
**지시자:** 노팀장 (개발관리창006)

## 1. 작업 목적
[무엇을 왜 했는지 1-2줄]

## 2. 수정/추가 파일
| 파일 | 변경 내용 |
|------|----------|
| src/xxx/yyy.js | 내용 |

## 3. 주요 변경사항
### 변경 전
```code
before
```

### 변경 후
```code
after
```

## 4. 테스트 결과
- 빌드: ✅ 성공 / ❌ 실패
- 로컬 테스트: [결과]

## 5. 배포 결과
- Commit: [커밋 해시]
- URL: https://gepv11.vercel.app
- 비고: [특이사항]

## 6. 다음 작업
[필요시 명시]
```

---

## 9. 보고 형식

작업 완료 후 노팀장 창(개발관리창006)에 아래 형식으로 보고:

```markdown
## GEP_XXX 작업 완료 보고

**작업명:** [작업명]

**수정 파일:** X개
- `파일명`: 변경 내용
- `파일명`: 변경 내용

**테스트:**
- 빌드: ✅ 성공
- 로컬 실행: ✅ 정상

**배포:**
- Commit: [커밋 해시 앞 7자리]
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

**문서화:** ← 이 항목이 ✅ 아니면 보고 불가
- docs/GEP_XXX_작업명.md ✅ 생성 (커밋에 포함)

**검증 요청:**
[노팀장이 확인해야 할 사항]
```

---

## 10. Supabase 테이블 (참고용, 수정 금지)

### 주요 테이블 (불변)
- **users:** 사용자 정보
- **user_feature_access:** 레벨별 기능 접근
- **attempts:** MCQ 풀이 원장
- **question_stats:** MCQ 문제별 통계 (집계 캐시)
- **ox_attempts:** OX 풀이 원장
- **ox_question_stats:** OX 문제별 통계
- **wrong_questions:** 틀린문제 빠른 조회용
- **ox_wrong_questions:** OX 틀린문제 빠른 조회용
- **mock_exam_sessions:** 모의고사 세션 (회차·교시별 점수·완료 여부) ← Phase 5 신규
- **mock_exam_attempts:** 모의고사 문제별 응답 원장 ← Phase 5 신규

### Supabase 스키마 패턴 (신규 테이블 추가 시 반드시 준수)
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY   -- uuid_generate_v4() 사용 금지
user_id UUID REFERENCES users(user_id)          -- users(id) 사용 금지
created_at TIMESTAMPTZ DEFAULT NOW()            -- TIMESTAMP 사용 금지
POLICY ... USING (auth.uid() = user_id)         -- RLS 필수
```

### 게스트 처리 패턴
```javascript
// Service 레이어에서 early-return
if (!userId) {
  return { success: true, data: [] };
}
```

---

## 11. 주요 교훈 (Phase 1-6)

| 이슈 | 원인 | 해결 | 교훈 |
|------|------|------|------|
| PWA 캐시 흰 화면 | 구버전 SW | Clear site data | SW 버전 관리 필수 |
| OAuth 콜백 실패 | Supabase URL 미설정 | Redirect URL 추가 | 환경변수 체크리스트 |
| Home UI 시나리오 이탈 | 개발철학 위반 | 아코디언 재설계 | UI 확정안 문서화 |
| OX 마지막 문항 건너뛰기 | 체크 순서 | handleNext 분기 수정 | 경계값 테스트 |
| exams.json 필드 불일치 | 지시서에 q.part 명시, 실제엔 없음 | q.subject로 필터링 | 지시서 전 데이터 구조 검증 필수 |
| featureFlags 레벨 오류 | MOCKEXAM_MIN_LEVEL=5 설정 오류 | 4로 수정 | 레벨 게이트 상수 개발 전 확인 |
| 재응시 결과 혼재 | handleRetry가 RESULT_LS_KEY 미삭제 | 두 키 모두 삭제 | localStorage 클리어는 progress+result 세트로 |
| 중복 제출 | 제출 버튼 isSubmitting 가드 없음 | isSubmitting 상태 추가 | 비가역 액션엔 항상 제출 중 가드 |
| **🚨 GEP_085~095 문서 누락** | **완료 후 순서에서 문서화가 push 뒤에 위치** | **CLAUDE.md 개정 — 문서화를 push 전 필수 단계로 격상** | **문서화는 배포 전에. 순서 바꿈 절대 금지** |

---

## 12. SSOT 기준 문서

작업 전 반드시 참조:
- **GEP_038:** 서비스레벨별 통합 서비스 시나리오 정의서
- **GEP_045:** Phase 4 완료보고서
- **GEP_046:** Phase 4 재활용 프로세스 정리
- **GEP_048:** 개발관리창006 페르소나 및 지시문
- **GEP_063:** Phase 5 완료보고서
- **GEP_064:** Phase 5 개발경과·결과·레고블럭 재활용 분석

---

## 13. 환경 설정

### 로컬 개발 환경
1. **Node.js 18+ 설치 확인**
2. **의존성 설치:** `npm install`
3. **.env 파일 설정** (프로젝트 루트)

### 환경변수 (.env)
```
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### 긴급 상황 대처

#### 빌드 실패 시
```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

#### 배포 실패 시
1. Vercel 대시보드에서 빌드 로그 확인
2. 에러 메시지 캡처
3. 노팀장 창에 즉시 보고

#### 데이터 손실 시
- **localStorage:** 복구 불가 (로컬 전용)
- **Supabase:** 서버 데이터만 복구 가능
- **예방:** 중요 작업 전 DB 백업 확인

---

## 14. 현재 대기 상태

**Phase 5 완료 — Phase 6 개발 대기 중**

| 항목 | 내용 |
|------|------|
| 최신 완료 문서 | GEP_064 |
| 다음 문서 번호 | GEP_065부터 시작 |
| 대기 중 | 노팀장으로부터 Phase 6 개발계획서 수신 대기 |
| Supabase 미적용 | mock_exam_tables.sql — 노팀장 대시보드 수동 실행 필요 |

### Phase 1~5 레벨 체계 (확정)
```
레벨 1 (게스트)  — MCQ 360문제, 로컬 통계
레벨 2 (회원)   — MCQ 전체 1,080문제, 서버 통계, 틀린문제
레벨 3 (회원)   — OX 진위형 3,824문제
레벨 4 (회원)   — 모의고사 9회차 ✅ 완료
레벨 5 이상     — Phase 6 미정
```

---

**작성일:** 2026.03.02
**버전:** v3.0
**다음 업데이트:** Phase 6 완료 시