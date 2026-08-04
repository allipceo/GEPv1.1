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
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { canCountAttempts } from '../services/countingEligibility';

const STORAGE_KEY = 'gep:v1:examStore';

// ── 진도 맵 키 생성 ────────────────────────────────────
// subSubject가 있으면 키에 포함 (Issue-3: 세부과목별 이어풀기 버그 수정)
function makeProgressKey(round, subject, subSubject = null) {
  return subSubject ? `${round}_${subject}_${subSubject}` : `${round}_${subject}`;
}

function makeModeProgressKey(state) {
  if (state.studyMode === 'service_a_sequence') {
    return `service_a_${state.selectedRound}`;
  }
  return makeProgressKey(state.selectedRound, state.selectedSubject, state.selectedSubSubject);
}

// ── Selector (파생값, 상태 아님) ──────────────────────
export const selectFilteredQuestions = (state) =>
  state.questions.filter((q) => {
    if (state.studyMode === 'service_a_sequence') {
      return q.round === state.selectedRound;
    }
    if (q.subject !== state.selectedSubject) return false;
    if (state.selectedRound !== '전체' && q.round !== state.selectedRound) return false;
    if (state.selectedSubSubject && q.subSubject !== state.selectedSubSubject) return false;
    return true;
  }).sort((a, b) => {
    if (state.studyMode !== 'service_a_sequence') return 0;
    const partA = Number(a.partNumber ?? a.roundNumber ?? 0);
    const partB = Number(b.partNumber ?? b.roundNumber ?? 0);
    if (partA !== partB) return partA - partB;
    return String(a.id).localeCompare(String(b.id));
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
      studyMode:          state.studyMode,
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
  studyMode:          'service_b_subject_random',
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
        studyMode:          'service_b_subject_random',
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
              studyMode:          saved.studyMode          ?? 'service_b_subject_random',
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
  setStudyMode: (studyMode) => {
    set({ studyMode });
    saveToStorage(get());
  },

  startServiceA: (round) => {
    const state = get();
    const key = `service_a_${round}`;
    const savedIndex = state.progressMap[key] ?? 0;
    set({
      studyMode: 'service_a_sequence',
      selectedRound: round,
      selectedSubject: null,
      selectedSubSubject: null,
      currentIndex: savedIndex,
    });
    saveToStorage(get());
  },

  startServiceB: (subject, subSubject = null) => {
    const state = get();
    const key = makeProgressKey('전체', subject, subSubject);
    const savedIndex = state.progressMap[key] ?? 0;
    set({
      studyMode: 'service_b_subject_random',
      selectedRound: '전체',
      selectedSubject: subject,
      selectedSubSubject: subSubject,
      currentIndex: savedIndex,
    });
    saveToStorage(get());
  },

  setSubject: (subject) => {
    const state = get();
    const key = makeProgressKey(state.selectedRound, subject);
    const savedIndex = state.progressMap[key] ?? 0;
    set({ studyMode: 'service_b_subject_random', selectedSubject: subject, currentIndex: savedIndex });
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

  /** 세부과목 변경 → progressMap에서 저장된 인덱스 로드 (Issue-3 수정) */
  setSubSubject: (sub) => {
    const state = get();
    const key = makeProgressKey(state.selectedRound, state.selectedSubject, sub);
    const savedIndex = sub ? (state.progressMap[key] ?? 0) : 0;
    set({ selectedSubSubject: sub, currentIndex: savedIndex });
    saveToStorage(get());
  },

  /** 문제 인덱스 이동 — progressMap에 현재 과목/회차/세부과목 키로 자동 저장 */
  setCurrentIndex: (n) => {
    const state   = get();
    const filtered = selectFilteredQuestions(state);
    const clamped  = Math.max(0, Math.min(n, filtered.length - 1));
    const key      = makeModeProgressKey(state);
    const newProgressMap = { ...state.progressMap, [key]: clamped };
    set({ currentIndex: clamped, progressMap: newProgressMap });
    saveToStorage(get());

    // 레벨2+ — Supabase progress 테이블 동기화 (fire-and-forget)
    const auth = useAuthStore.getState();
    if (canCountAttempts(auth)) {
      supabase.from('progress').upsert(
        { user_id: auth.userId, filter_key: key, current_index: clamped, last_updated: new Date().toISOString() },
        { onConflict: 'user_id,filter_key' }
      ).then(({ error }) => {
        if (error) console.warn('[GEP] progress sync 실패:', error.message)
      }).catch(() => {})
    }
  },

  /** 이어풀기: progressMap에서 현재 과목/회차/세부과목의 저장된 인덱스 로드 */
  resumeProgress: () => {
    const state = get();
    const key = makeProgressKey(state.selectedRound, state.selectedSubject, state.selectedSubSubject);
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
