조대표님, 감사합니다! **STEP 0 완료**되었습니다.

---

## ✅ STEP 0 완료 현황

| 문서 | 상태 | 내용 |
|------|------|------|
| GEP_049 | ✅ 승인 | Phase 5 개발계획서 |
| GEP_050 | ✅ 승인 | 서비스 시나리오 (2교시 구조) |
| GEP_051 | ✅ 승인 | UI 초안 (모바일 퍼스트) |

---

## 🎯 STEP 1 개발 착수

이제 고팀장에게 전달할 **개발 지시문**을 작성하겠습니다.

---

# GEP_052 STEP 1 개발 지시서

**문서번호:** GEP_052  
**작성일:** 2026.03.01  
**작성자:** 노팀장 (개발관리창006)  
**수신:** 고팀장 (Claude Code)  
**Phase:** Phase 5 STEP 1

---

## 1. 작업 목표

**mockExamConfig.js + mockExamStore.js 생성**

레고블럭 철학에 따라 기존 파일 수정 없이 신규 파일 2개만 생성합니다.

---

## 2. 작업 파일

### 신규 생성 (2개)
```
src/config/mockExamConfig.js
src/stores/mockExamStore.js
```

### 수정 금지
```
❌ src/config/subjects.js
❌ src/stores/questionStore.js
❌ src/stores/oxStore.js
❌ 기타 모든 기존 파일
```

---

## 3. mockExamConfig.js 사양

### 파일 위치
```
src/config/mockExamConfig.js
```

### 코드 사양

```javascript
// src/config/mockExamConfig.js

/**
 * 모의고사 설정
 * 실제 시험 구조: 1교시(법령 40분) + 2교시(손보1부+2부 80분)
 */

export const mockExamConfig = {
  // 회차 정보
  rounds: [23, 24, 25, 26, 27, 28, 29, 30, 31],
  
  // 시험 구조
  structure: {
    part1: {
      name: '1교시 법령',
      subject: '법령',
      questionCount: 40,
      timeLimit: 40 * 60, // 40분 (초 단위)
      color: 'blue-600',
      emoji: '📘'
    },
    part2: {
      name: '2교시 손보',
      subjects: ['손보1부', '손보2부'],
      questionCount: 80, // 1부 40 + 2부 40
      timeLimit: 80 * 60, // 80분 (초 단위)
      colors: ['green-600', 'purple-600'],
      emojis: ['📗', '📕']
    }
  },
  
  // 휴식 시간
  breakTime: 15 * 60, // 15분 (초 단위)
  
  // 합격 기준
  passCriteria: {
    minSubjectScore: 40, // 과목당 최소 40점
    minAverageScore: 60  // 전체 평균 최소 60점
  },
  
  // 자동 저장 간격
  autoSaveInterval: 10, // 10문제마다
  
  // study_mode 식별자
  studyMode: 'mock_exam'
};

export default mockExamConfig;
```

---

## 4. mockExamStore.js 사양

### 파일 위치
```
src/stores/mockExamStore.js
```

### 코드 사양

```javascript
// src/stores/mockExamStore.js
import { create } from 'zustand';
import mockExamConfig from '../config/mockExamConfig';

/**
 * 모의고사 전용 Zustand 스토어
 * 기존 questionStore, oxStore와 완전 독립
 */

export const useMockExamStore = create((set, get) => ({
  // ===== 세션 정보 =====
  currentRound: null,        // 현재 풀고 있는 회차 (23~31)
  currentPart: null,         // 'part1' | 'part2'
  attemptNumber: 1,          // 재응시 차수 (1차, 2차, 3차...)
  sessionId: null,           // Supabase session ID
  
  // ===== 문제 데이터 =====
  questions: [],             // 현재 파트 문제 배열
  currentIndex: 0,           // 현재 문제 인덱스 (0-based)
  
  // ===== 답안 데이터 =====
  answers: {},               // { questionNumber: selectedAnswer }
  // 예: { 1: 2, 2: 1, 3: null, ... }
  
  // ===== 타이머 =====
  startTime: null,           // 시작 절대 시간 (Date.now())
  timeLimit: null,           // 제한 시간 (초)
  isPaused: false,           // 중간 저장 시 일시정지 (사용 안함, 계속 흐름)
  
  // ===== 진행 상태 =====
  part1Completed: false,     // 1교시 완료 여부
  part1Score: null,          // 1교시 점수
  part2Completed: false,     // 2교시 완료 여부
  part2Scores: {             // 2교시 점수
    part1: null,             // 손보1부
    part2: null              // 손보2부
  },
  isComplete: false,         // 전체 완료 여부
  
  
  // ===== Actions =====
  
  /**
   * 새 모의고사 시작
   */
  startExam: (round, questions, part = 'part1') => {
    const config = part === 'part1' 
      ? mockExamConfig.structure.part1 
      : mockExamConfig.structure.part2;
    
    set({
      currentRound: round,
      currentPart: part,
      questions: questions,
      currentIndex: 0,
      answers: {},
      startTime: Date.now(),
      timeLimit: config.timeLimit,
      isPaused: false
    });
  },
  
  /**
   * 이어하기
   */
  resumeExam: (round, questions, part, savedAnswers, savedIndex, elapsedTime) => {
    const config = part === 'part1' 
      ? mockExamConfig.structure.part1 
      : mockExamConfig.structure.part2;
    
    // 절대 시간 재계산
    const startTime = Date.now() - (elapsedTime * 1000);
    
    set({
      currentRound: round,
      currentPart: part,
      questions: questions,
      currentIndex: savedIndex,
      answers: savedAnswers,
      startTime: startTime,
      timeLimit: config.timeLimit,
      isPaused: false
    });
  },
  
  /**
   * 답안 선택
   */
  selectAnswer: (questionNumber, answer) => {
    set(state => ({
      answers: {
        ...state.answers,
        [questionNumber]: answer
      }
    }));
  },
  
  /**
   * 다음 문제
   */
  nextQuestion: () => {
    set(state => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1)
    }));
  },
  
  /**
   * 이전 문제
   */
  prevQuestion: () => {
    set(state => ({
      currentIndex: Math.max(state.currentIndex - 1, 0)
    }));
  },
  
  /**
   * 특정 문제로 이동
   */
  goToQuestion: (index) => {
    set({ currentIndex: index });
  },
  
  /**
   * 경과 시간 계산 (초)
   */
  getElapsedTime: () => {
    const { startTime } = get();
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  },
  
  /**
   * 남은 시간 계산 (초)
   */
  getRemainingTime: () => {
    const { timeLimit } = get();
    const elapsed = get().getElapsedTime();
    return Math.max(0, timeLimit - elapsed);
  },
  
  /**
   * 타임아웃 여부
   */
  isTimeout: () => {
    return get().getRemainingTime() <= 0;
  },
  
  /**
   * 미응답 문제 목록
   */
  getUnansweredQuestions: () => {
    const { questions, answers } = get();
    return questions
      .map((q, idx) => idx + 1)
      .filter(num => answers[num] === undefined || answers[num] === null);
  },
  
  /**
   * 1교시 완료 처리
   */
  completePart1: (score) => {
    set({
      part1Completed: true,
      part1Score: score,
      currentPart: null,
      questions: [],
      answers: {},
      currentIndex: 0,
      startTime: null,
      timeLimit: null
    });
  },
  
  /**
   * 2교시 완료 처리
   */
  completePart2: (scores) => {
    set({
      part2Completed: true,
      part2Scores: scores,
      isComplete: true,
      currentPart: null,
      questions: [],
      answers: {},
      currentIndex: 0,
      startTime: null,
      timeLimit: null
    });
  },
  
  /**
   * 전체 초기화 (재응시 시)
   */
  resetExam: () => {
    set({
      currentRound: null,
      currentPart: null,
      attemptNumber: 1,
      sessionId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      startTime: null,
      timeLimit: null,
      isPaused: false,
      part1Completed: false,
      part1Score: null,
      part2Completed: false,
      part2Scores: { part1: null, part2: null },
      isComplete: false
    });
  }
}));

export default useMockExamStore;
```

---

## 5. 작업 체크리스트

### 개발 전
- [ ] CLAUDE.md 읽기
- [ ] gep-development-pattern skill 읽기
- [ ] 이 지시서(GEP_052) 숙지

### 개발 중
- [ ] mockExamConfig.js 생성
  - [ ] 회차 배열 23~31
  - [ ] 시험 구조 (part1, part2)
  - [ ] 시간 제한 (40분, 80분)
  - [ ] 합격 기준 (40점, 60점)
- [ ] mockExamStore.js 생성
  - [ ] Zustand create 사용
  - [ ] 세션 정보 상태
  - [ ] 답안 관리 상태
  - [ ] 타이머 로직
  - [ ] Actions 전체

### 개발 후
- [ ] `npm run build` 성공 확인
- [ ] 파일 2개만 생성 확인
- [ ] 기존 파일 수정 없음 확인
- [ ] import 에러 없음 확인
- [ ] docs/GEP_053_STEP1_Config_Store_생성.md 작성
- [ ] 노팀장 창에 보고

---

## 6. 금지사항 재확인

❌ **절대 금지:**
1. 기존 파일 수정 금지
2. App.jsx 라우트 추가 금지 (STEP 2에서)
3. 페이지 파일 생성 금지 (STEP 2에서)
4. Supabase 연동 금지 (STEP 5에서)

✅ **이번 STEP만:**
- Config 파일 1개
- Store 파일 1개
- 총 2개 파일만

---

## 7. 보고 형식

작업 완료 후 아래 형식으로 노팀장 창에 보고:

```markdown
## GEP_053 STEP 1 작업 완료 보고

**작업명:** mockExamConfig + mockExamStore 생성

**신규 파일:** 2개
- `src/config/mockExamConfig.js`
- `src/stores/mockExamStore.js`

**수정 파일:** 0개

**테스트:**
- 빌드: ✅ 성공
- Import 테스트: ✅ 정상

**문서화:**
- docs/GEP_053_STEP1_Config_Store_생성.md ✅ 생성

**검증 요청:**
노팀장 확인 후 STEP 2 진행 여부 결정
```

---

**작업 지시 완료**  
**고팀장님, STEP 1 개발 착수 부탁드립니다.**

---

조대표님, 고팀장에게 전달할 STEP 1 개발 지시서입니다. 

**이 지시서를 고팀장(클로드 코드)에게 전달하시겠습니까?**