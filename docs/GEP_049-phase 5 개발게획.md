조대표님, **GEP_049 Phase 5 개발계획서** 작성하겠습니다.

---

# GEP_049 Phase 5 개발계획서

**문서번호:** GEP_049  
**작성일:** 2026.03.01  
**작성자:** 노팀장 (개발관리창006)  
**Phase:** Phase 5 (레벨 4 모의고사)  
**승인자:** 조대표님

---

## 1. 개발 목표

### 1.1 Phase 5 목표
**레벨 4 서비스 — 원본 회차별 모의고사 구현**

GEP_038 §4.4 기준:
- 실전과 동일한 조건의 모의고사 제공
- 9회분 (23~31회) 원본 문제 활용
- 타이머, 진행 저장, 즉시 채점
- 일반 학습과 분리된 통계

### 1.2 핵심 가치
- **"실전 감각"** — 시험장과 동일한 환경
- **"시간 관리"** — 타이머로 실전 연습
- **"정확한 평가"** — 과목별 점수 + 합격/불합격 판정

---

## 2. 개발 범위

### 2.1 포함 사항 ✅
1. **회차 선택** — 23~31회 9개 회차
2. **120문제 구성** — 법령40 + 손보1부40 + 손보2부40
3. **타이머** — 2시간 (7,200초) 카운트다운
4. **진행 저장** — 중간 이탈 시 저장, 이어풀기
5. **즉시 채점** — 완료 후 과목별 점수, 전체 평균, 합격/불합격
6. **별도 기록** — study_mode="mock_exam"
7. **통계** — 성적표, 점수 추이, 시간 분석

### 2.2 제외 사항 ❌
- ~~레벨 5 맞춤 모의고사~~ (Phase 6)
- ~~예상점수/합격확률 (레벨 3 고도화)~~ (모의고사 데이터 축적 후)
- ~~해설 기능~~ (Phase 7)
- ~~오답노트 연계~~ (Phase 7)

---

## 3. 개발 단계 (철학2 준수)

### 단계 1: 서비스 시나리오 작성 ✅
**GEP_050: Phase 5 서비스 시나리오**
- S1. 회차 선택 (홈 → 모의고사 → 회차 선택)
- S2. 시작/이어하기 (신규 시작 / 저장된 진행)
- S3. 문제 풀이 (타이머 + 120문제 + 북마크)
- S4. 중간 저장 (자동 저장 + 수동 나가기)
- S5. 제출 확인 (미응답 문제 확인)
- S6. 즉시 채점 (과목별 점수 + 합격 판정)
- S7. 성적표 (상세 결과 + 시간 분석)
- S8. 통계 조회 (회차별 추이)

### 단계 2: UI 초안 작성
**GEP_051: Phase 5 UI 초안**
- 회차 선택 화면 (9개 카드)
- 문제 풀이 화면 (타이머 + 진행바)
- 성적표 화면 (과목별 점수)

### 단계 3: 백엔드 설계
**GEP_052: Phase 5 백엔드 설계**
- Supabase 테이블 2개 추가
  - mock_exam_sessions (세션 관리)
  - mock_exam_results (결과 저장)
- mockExamService.js 설계

### 단계 4: 프론트 설계
**GEP_053: Phase 5 프론트엔드 설계**
- mockExamStore.js (Zustand)
- mockExamConfig.js (회차별 설정)
- 3개 페이지 설계

### 단계 5: UI 최종안
**GEP_054: Phase 5 UI 최종안**
- 시나리오 + UI 통합 검증
- 조대표님 최종 승인

### 단계 6: 개발 착수
**GEP_055~: 단계별 개발**
- STEP 1: Config + Store 생성
- STEP 2: 회차 선택 화면
- STEP 3: 문제 풀이 + 타이머
- STEP 4: 채점 + 성적표
- STEP 5: Supabase 연동
- STEP 6: 통계 화면
- STEP 7: 통합 테스트

---

## 4. 기술 설계 개요

### 4.1 신규 파일 (레고블럭 원칙)
```
src/
├── config/
│   └── mockExamConfig.js        # 회차별 설정
├── stores/
│   └── mockExamStore.js         # 모의고사 전용 스토어
├── services/
│   └── mockExamService.js       # Supabase 연동
└── pages/
    ├── MockExamHome.jsx         # 회차 선택
    ├── MockExamQuiz.jsx         # 문제 풀이
    └── MockExamResult.jsx       # 성적표
```

### 4.2 수정 파일 (최소화)
```
src/App.jsx                      # 라우트 3개 추가
```

### 4.3 데이터 활용
```
public/data/questions.json       # 기존 MCQ 1,080문제 재사용
```
- 회차별 필터링: `questions.filter(q => q.round === 23)`
- 과목별 분류: 법령40 + 손보1부40 + 손보2부40

---

## 5. Supabase 테이블 설계

### 5.1 mock_exam_sessions (세션 관리)
```sql
CREATE TABLE mock_exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  round INTEGER NOT NULL,           -- 23~31
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  progress JSONB,                   -- {"1": 2, "2": null, ...}
  time_spent INTEGER,               -- 초
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_round 
  ON mock_exam_sessions(user_id, round);
```

### 5.2 mock_exam_results (결과 저장)
```sql
CREATE TABLE mock_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES mock_exam_sessions(id),
  user_id UUID REFERENCES users(id),
  round INTEGER NOT NULL,
  law_score NUMERIC,                -- 법령 점수 (0~100)
  part1_score NUMERIC,              -- 손보1부 점수
  part2_score NUMERIC,              -- 손보2부 점수
  total_average NUMERIC,            -- 전체 평균
  is_pass BOOLEAN,                  -- 합격 여부
  time_spent INTEGER,               -- 소요 시간 (초)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_results_user_round 
  ON mock_exam_results(user_id, round);
```

### 5.3 RLS 정책
```sql
-- 본인 데이터만 조회/수정
ALTER TABLE mock_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_policy ON mock_exam_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY results_policy ON mock_exam_results
  FOR ALL USING (auth.uid() = user_id);
```

---

## 6. 핵심 로직 설계

### 6.1 타이머 로직
```javascript
// mockExamStore.js
const useMockExamStore = create((set, get) => ({
  startTime: null,
  timeLimit: 7200, // 2시간
  
  startTimer: () => {
    set({ startTime: Date.now() });
  },
  
  getElapsedTime: () => {
    const { startTime } = get();
    return Math.floor((Date.now() - startTime) / 1000);
  },
  
  getRemainingTime: () => {
    const { timeLimit } = get();
    return timeLimit - get().getElapsedTime();
  }
}));
```

### 6.2 채점 로직
```javascript
// mockExamService.js
export const calculateScore = (answers, questions) => {
  const bySubject = {
    법령: { correct: 0, total: 40 },
    손보1부: { correct: 0, total: 40 },
    손보2부: { correct: 0, total: 40 }
  };
  
  questions.forEach((q, idx) => {
    const part = q.part === '법령' ? '법령' : 
                 q.part === '1부' ? '손보1부' : '손보2부';
    
    if (answers[idx + 1] === q.answer) {
      bySubject[part].correct++;
    }
  });
  
  return {
    law_score: (bySubject.법령.correct / 40) * 100,
    part1_score: (bySubject.손보1부.correct / 40) * 100,
    part2_score: (bySubject.손보2부.correct / 40) * 100,
    total_average: 
      ((bySubject.법령.correct + 
        bySubject.손보1부.correct + 
        bySubject.손보2부.correct) / 120) * 100
  };
};
```

### 6.3 합격 판정
```javascript
// GEP_038 기준: 과목당 40점 이상, 전체 평균 60점 이상
export const checkPass = (scores) => {
  const { law_score, part1_score, part2_score, total_average } = scores;
  
  return law_score >= 40 &&
         part1_score >= 40 &&
         part2_score >= 40 &&
         total_average >= 60;
};
```

---

## 7. 라우트 설계

```javascript
// App.jsx
<Route path="/mock" element={<MockExamHome />} />
<Route path="/mock/:round" element={<MockExamQuiz />} />
<Route path="/mock/:round/result" element={<MockExamResult />} />
```

### URL 예시
- `/mock` — 회차 선택
- `/mock/23` — 23회 모의고사 풀이
- `/mock/23/result` — 23회 성적표

---

## 8. 게스트 vs 회원 정책

### 8.1 게스트
- localStorage만 사용
- 진행 저장 가능 (로컬)
- 성적표 조회 가능 (로컬)
- 통계 누적 불가 (서버 없음)

### 8.2 회원
- Supabase 저장
- 멀티 디바이스 동기화
- 통계 누적 (회차별 추이)
- 성적표 영구 보관

---

## 9. 예상 산출물

### 9.1 문서
- GEP_050: 서비스 시나리오
- GEP_051: UI 초안
- GEP_052: 백엔드 설계
- GEP_053: 프론트엔드 설계
- GEP_054: UI 최종안
- GEP_055~061: STEP별 작업 문서
- GEP_062: Phase 5 완료 보고서

### 9.2 코드
- 신규 파일 7개 (config 1, store 1, service 1, pages 3, components 1)
- 수정 파일 1개 (App.jsx)
- Supabase 마이그레이션 2개 (테이블 생성)

---

## 10. 일정 (예상)

| 단계 | 내용 | 예상 소요 |
|------|------|-----------|
| STEP 0 | 시나리오 + UI 확정 | 1일 |
| STEP 1 | Config + Store | 0.5일 |
| STEP 2 | 회차 선택 화면 | 0.5일 |
| STEP 3 | 문제 풀이 + 타이머 | 1일 |
| STEP 4 | 채점 + 성적표 | 1일 |
| STEP 5 | Supabase 연동 | 0.5일 |
| STEP 6 | 통계 화면 | 0.5일 |
| STEP 7 | 통합 테스트 | 0.5일 |
| **총계** | | **5.5일** |

---

## 11. 위험 요소 및 대응

### 11.1 타이머 정확성
**위험:** 브라우저 탭 전환 시 타이머 부정확
**대응:** Date.now() 기반 절대 시간 계산

### 11.2 진행 저장 타이밍
**위험:** 네트워크 불안정 시 저장 실패
**대응:** 
- localStorage 우선 저장 (즉시)
- Supabase 백그라운드 동기화 (retry)

### 11.3 채점 로직 검증
**위험:** 과목 분류 오류
**대응:** 
- questions.json의 part, subject 필드 활용
- 단위 테스트 필수

---

## 12. 성공 기준

### 12.1 기능 완성도
- [ ] 9개 회차 모두 선택 가능
- [ ] 120문제 정확히 로드
- [ ] 타이머 정상 작동 (±1초 오차)
- [ ] 진행 저장 100% 성공
- [ ] 채점 로직 검증 완료
- [ ] 합격 판정 정확성 100%

### 12.2 성능
- [ ] 회차 로드 시간 < 1초
- [ ] 문제 전환 시간 < 0.3초
- [ ] 채점 시간 < 0.5초

### 12.3 UX
- [ ] 모바일 최적화 (터치 반응)
- [ ] 타이머 시각화 (남은 시간 명확)
- [ ] 미응답 문제 표시
- [ ] 성적표 가독성

---

## 13. 다음 단계

**조대표님 승인 후:**
1. GEP_050 서비스 시나리오 작성 착수
2. 조대표님 검토 → 확정
3. GEP_051 UI 초안 작성
4. 단계별 개발 진행

---

**작성 완료**  
**검토 요청:** 조대표님  
**다음 문서:** GEP_050 (승인 시 즉시 착수)

---

조대표님, Phase 5 개발계획서 작성 완료했습니다. 검토 부탁드립니다.