/**
 * src/stores/examStore.js
 * Zustand 전역 스토어 - 시험 데이터 및 풀이 상태 관리
 *
 * filteredQuestions는 상태가 아닌 selector(파생값).
 * localStorage 키: 'gep:v1:examStore'
 *
 * progressMap: 회차+과목별 마지막 인덱스 저장
 *   키 형식: "${round}_${subject}" (예: "23_법령", "26_손보1부")
 *   과목/회차 변경 시 → 해당 키 인덱스 자동 로드
 *   문제 이동 시    → setCurrentIndex에서 자동 저장
 */

import { create } from 'zustand';
import { loadExams } from '../utils/loadExams';

const STORAGE_KEY = 'gep:v1:examStore';

// ── 진도 맵 키 생성 ────────────────────────────────────
function makeProgressKey(round, subject) {
  return `${round}_${subject}`;
}

// ── Selector (파생값, 상태 아님) ──────────────────────
export const selectFilteredQuestions = (state) =>
  state.questions.filter((q) => {
    if (q.subject !== state.selectedSubject) return false;
    if (state.selectedRound !== '전체' && q.round !== state.selectedRound) return false;
    if (state.selectedSubSubject && q.subSubject !== state.selectedSubSubject) return false;
    return true;
  });

// ── localStorage 헬퍼 ─────────────────────────────────
function saveToStorage(state) {
  try {
    const payload = {
      meta: {
        version:    state._examsMeta?.version    ?? null,
        totalCount: state._examsMeta?.totalCount ?? null,
      },
      answers:            state.answers,
      currentIndex:       state.currentIndex,
      selectedSubject:    state.selectedSubject,
      selectedRound:      state.selectedRound,
      selectedSubSubject: state.selectedSubSubject,
      progressMap:        state.progressMap,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function clearStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

// ── 스토어 ────────────────────────────────────────────
const useExamStore = create((set, get) => ({
  // 상태
  questions:          [],
  currentIndex:       0,
  selectedSubject:    '법령',
  selectedRound:      23,
  selectedSubSubject: null,
  answers:            {},
  progressMap:        {}, // { "23_법령": 10, "26_손보1부": 5 }
  isLoading:          false,
  isReady:            false,
  error:              null,
  _examsMeta:         null, // { version, totalCount } — 내부용

  // ── 액션 ──────────────────────────────────────────

  /** exams.json 로드, localStorage 복원/버전 체크 */
  loadQuestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const exams = await loadExams();
      const { version, totalCount, questions } = exams;

      // localStorage 복원 시도
      let restored = {
        answers:            {},
        currentIndex:       0,
        selectedSubject:    '법령',
        selectedRound:      23,
        selectedSubSubject: null,
        progressMap:        {},
      };
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (
            saved.meta?.version    === version &&
            saved.meta?.totalCount === totalCount
          ) {
            restored = {
              answers:            saved.answers            ?? {},
              currentIndex:       saved.currentIndex       ?? 0,
              selectedSubject:    saved.selectedSubject    ?? '법령',
              selectedRound:      saved.selectedRound      ?? 23,
              selectedSubSubject: saved.selectedSubSubject ?? null,
              progressMap:        saved.progressMap        ?? {},
            };
          } else {
            clearStorage();
          }
        }
      } catch (_) {
        clearStorage();
      }

      // currentIndex clamp (복원값 기준)
      const tempState = { questions, ...restored };
      const filtered  = selectFilteredQuestions(tempState);
      const clampedIndex =
        filtered.length === 0
          ? 0
          : Math.min(restored.currentIndex, filtered.length - 1);

      set({
        questions,
        ...restored,
        currentIndex: clampedIndex,
        isLoading:    false,
        isReady:      true,
        _examsMeta:   { version, totalCount },
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /** 과목 변경 → progressMap에서 해당 키 인덱스 로드 */
  setSubject: (subject) => {
    const state = get();
    const key = makeProgressKey(state.selectedRound, subject);
    const savedIndex = state.progressMap[key] ?? 0;
    set({ selectedSubject: subject, currentIndex: savedIndex });
    saveToStorage(get());
  },

  /** 회차 변경 → progressMap에서 해당 키 인덱스 로드 */
  setRound: (round) => {
    const state = get();
    const key = makeProgressKey(round, state.selectedSubject);
    const savedIndex = state.progressMap[key] ?? 0;
    set({ selectedRound: round, currentIndex: savedIndex });
    saveToStorage(get());
  },

  /** 세부과목 변경 → currentIndex 리셋 */
  setSubSubject: (sub) => {
    set({ selectedSubSubject: sub, currentIndex: 0 });
    saveToStorage(get());
  },

  /** 문제 인덱스 이동 — progressMap에 현재 과목/회차 키로 자동 저장 */
  setCurrentIndex: (n) => {
    const state   = get();
    const filtered = selectFilteredQuestions(state);
    const clamped  = Math.max(0, Math.min(n, filtered.length - 1));
    const key      = makeProgressKey(state.selectedRound, state.selectedSubject);
    const newProgressMap = { ...state.progressMap, [key]: clamped };
    set({ currentIndex: clamped, progressMap: newProgressMap });
    saveToStorage(get());
  },

  /** 이어풀기: progressMap에서 현재 과목/회차의 저장된 인덱스 로드 */
  resumeProgress: () => {
    const state = get();
    const key = makeProgressKey(state.selectedRound, state.selectedSubject);
    const savedIndex = state.progressMap[key] ?? state.currentIndex;
    set({ currentIndex: savedIndex });
  },

  /** 답안 저장 — 1~4 범위 검증, 재선택 시 overwrite */
  saveAnswer: (questionId, answer) => {
    if (answer < 1 || answer > 4) return;
    const newAnswers = { ...get().answers, [questionId]: answer };
    set({ answers: newAnswers });
    saveToStorage(get());
  },
}));

export default useExamStore;
