/**
 * src/stores/oxStore.js
 * OX 퀴즈 전용 Zustand 스토어 — examStore와 완전 독립.
 *
 * 3축 카운터:
 *   축1 answeredSet    — 1회 이상 응답한 ox_id 집합 (라운드 완주 시 리셋)
 *   축2 wrongMap       — ox_id → 틀린 횟수 (절대 리셋 금지)
 *   축3 totalCumulative — 전체 누적 응답 수 (절대 리셋 금지)
 *
 * 상태 분리 원칙:
 *   화면 상태 (localSelected, showResult, currentIdx) — 이전버튼 시 리셋
 *   기록 상태 (answeredSet, wrongMap, totalCumulative) — 임의 리셋 절대 금지
 */

import { create } from 'zustand'
import { OX_SUBJECTS } from '../config/oxSubjects'
import { oxService } from '../services/oxService'
import { useAuthStore } from './authStore'

// ── JSON fetch 로더 (public/data/ — 번들 분리, 선택 시점 동적 로드) ──────────

// ── 초기 상태 팩토리 (Set/Map은 매번 새 인스턴스) ────────────────────────────
function getInitialState() {
  return {
    // 세션 메타
    subject:    null,
    subSubject: null,
    questions:  [],
    isLoading:  false,

    // 화면 상태 (컴포넌트 로컬용 — 이전버튼 시 리셋 대상)
    currentIdx:    0,
    localSelected: null,  // null / 'O' / 'X'
    showResult:    false,

    // 기록 상태 (절대 임의 리셋 금지)
    answeredSet:     new Set(),  // 축1
    wrongMap:        new Map(),  // 축2
    totalCumulative: 0,          // 축3
    roundNo:         1,

    // 모아풀기 모드
    isReviewMode:    false,
    reviewQuestions: [],
  }
}

// ── Selector ────────────────────────────────────────────────────────────────
/** 현재 출제 목록: 모아풀기 모드면 reviewQuestions, 아니면 questions */
export const selectCurrentQuestions = (state) =>
  state.isReviewMode ? state.reviewQuestions : state.questions

// ── 스토어 ──────────────────────────────────────────────────────────────────
const useOxStore = create((set, get) => ({
  ...getInitialState(),

  // ── loadQuestions ─────────────────────────────────────────────────────────
  /**
   * JSON 로드 + 필터링 + questions 세팅.
   * subSubject가 'ALL'이면 전체 사용.
   * resumeQuestionId: 이어풀기 재개 지점(oxService.loadProgress().lastQuestionId) — ID 앵커 방식.
   *   현재 로드된 문제 목록에서 이 ID의 위치를 찾아 그 지점부터 시작한다(순수 인덱스 저장은
   *   문제 세트 구성이 바뀌면 엉뚱한 문제를 가리킬 수 있어 폐기 — GEPv30-141 원칙 9).
   *   목록에서 찾지 못하면(문제 제거/재구성 등) 0번(처음)으로 안전하게 폴백한다.
   * initialCumulative: 화면 상단 "누적 N" 표시값(oxService.getCumulativeCount() 조회 결과).
   *   resetStore()가 totalCumulative를 0으로 초기화하므로, 매 진입 시 원장 실측치로
   *   되살리지 않으면 재진입할 때마다 0으로 보인다(2026-08-29 발견 및 수정).
   * 반드시 resetStore() 호출 후 사용 (과목 변경 시).
   */
  loadQuestions: async (subjectKey, subSubject = 'ALL', resumeQuestionId = null, initialCumulative = 0) => {
    set({ isLoading: true })
    try {
      const subjectInfo = OX_SUBJECTS.find((s) => s.key === subjectKey)
      if (!subjectInfo) throw new Error(`[oxStore] Unknown subjectKey: ${subjectKey}`)

      const res = await fetch(`/data/${subjectInfo.file}`)
      if (!res.ok) throw new Error(`[oxStore] fetch 실패: ${res.status} ${subjectInfo.file}`)
      const all = await res.json()

      // subSubject 필터: ox_id 마지막 토큰으로 세부과목 추출 (JSON 스키마 변경 불필요)
      // ex) "OX-23-법령-16-A-상법" → split('-').slice(-1)[0] === "상법"
      const questions = subSubject === 'ALL'
        ? all
        : all.filter((q) => q.ox_id.split('-').slice(-1)[0] === subSubject)

      const resumeIdx = resumeQuestionId
        ? questions.findIndex((q) => q.ox_id === resumeQuestionId)
        : -1
      const safeStartIndex = resumeIdx >= 0 ? resumeIdx : 0

      set({
        subject:         subjectKey,
        subSubject,
        questions,
        isLoading:       false,
        currentIdx:      safeStartIndex,
        localSelected:   null,
        showResult:      false,
        totalCumulative: initialCumulative,
      })
    } catch (err) {
      set({ isLoading: false })
      console.error('[oxStore] loadQuestions 오류:', err)
    }
  },

  // ── selectAnswer ──────────────────────────────────────────────────────────
  /**
   * 'O'/'X' 선택 처리.
   * answeredSet: 첫 응답만 카운트 (재응답 시 totalCumulative 증가 없음).
   * wrongMap: 오답 시 누적 +1.
   */
  selectAnswer: (answer) => {
    const state = get()
    const currentQs = selectCurrentQuestions(state)
    const question = currentQs[state.currentIdx]
    if (!question) return

    const oxId     = question.ox_id
    const isCorrect = answer === question.ox_result

    // 축1: answeredSet (새 Set 생성 — 불변성 유지)
    const newAnsweredSet = new Set(state.answeredSet)
    let newTotalCumulative = state.totalCumulative
    if (!newAnsweredSet.has(oxId)) {
      newAnsweredSet.add(oxId)
      newTotalCumulative += 1  // 축3
    }

    // 축2: wrongMap (새 Map 생성 — 불변성 유지)
    const newWrongMap = new Map(state.wrongMap)
    if (!isCorrect) {
      newWrongMap.set(oxId, (newWrongMap.get(oxId) ?? 0) + 1)
    }

    set({
      localSelected:   answer,
      showResult:      true,
      answeredSet:     newAnsweredSet,
      wrongMap:        newWrongMap,
      totalCumulative: newTotalCumulative,
    })

    // Supabase 기록 (게스트 userId=null이면 oxService 내부에서 스킵)
    const authState = useAuthStore.getState()
    oxService.recordAttempt(authState, oxId, isCorrect, {
      answer:     answer,
      round:      question.round,
      subject:    state.subject,
      subSubject: state.subSubject,
    })
  },

  // ── goNext ────────────────────────────────────────────────────────────────
  /**
   * 다음 문항 이동.
   * 마지막 문항이면 completeRound() 호출.
   */
  goNext: () => {
    const state = get()
    const currentQs = selectCurrentQuestions(state)

    if (state.currentIdx >= currentQs.length - 1) {
      get().completeRound()
    } else {
      const nextIdx = state.currentIdx + 1
      set({
        currentIdx:    nextIdx,
        localSelected: null,
        showResult:    false,
      })

      // 이어풀기 재개 지점 저장 — 모아풀기(reviewQuestions)는 전체 목록의 부분집합이라
      // ID를 저장해도 일반풀이 목록에서 위치가 어긋나므로 저장하지 않는다
      // (2026-08-20 이어풀기 결함 수정, 2026-08-20(2차) ID 앵커 방식으로 전환).
      if (!state.isReviewMode) {
        const authState = useAuthStore.getState()
        const nextQuestionId = currentQs[nextIdx]?.ox_id ?? null
        oxService.saveProgress(authState, state.subject, state.subSubject, {
          currentIndex:   nextIdx,
          lastQuestionId: nextQuestionId,
        })
      }
    }
  },

  // ── goPrev ────────────────────────────────────────────────────────────────
  /**
   * 이전 문항 이동.
   * 화면 상태만 리셋. 기록 상태(answeredSet, wrongMap, totalCumulative) 변경 없음.
   */
  goPrev: () => {
    const state = get()
    if (state.currentIdx <= 0) return

    set({
      currentIdx:    state.currentIdx - 1,
      localSelected: null,  // 화면만 리셋
      showResult:    false,
      // answeredSet, wrongMap, totalCumulative — 변경 없음
    })
  },

  // ── skipQuestion ──────────────────────────────────────────────────────────
  /**
   * 현재 문항 건너뛰기.
   * 기록 상태 변경 없음.
   */
  skipQuestion: () => {
    set({ localSelected: null, showResult: false })
    get().goNext()
  },

  // ── completeRound ─────────────────────────────────────────────────────────
  /**
   * 라운드 완주 처리.
   * 축1(answeredSet)만 리셋. 축2(wrongMap), 축3(totalCumulative)은 절대 유지.
   */
  completeRound: () => {
    const state = get()
    const authState = useAuthStore.getState()

    // 라운드 완주 → 다음 진입 시 처음(0번)부터 시작하도록 재개 지점 리셋
    oxService.saveProgress(authState, state.subject, state.subSubject, {
      currentIndex:   0,
      lastQuestionId: null,
    })

    set({
      roundNo:         state.roundNo + 1,
      currentIdx:      0,
      answeredSet:     new Set(),  // 축1만 리셋
      localSelected:   null,
      showResult:      false,
      isReviewMode:    false,      // 모아풀기 완주 후 이어풀기가 정상 문제로 복귀하도록
      reviewQuestions: [],
      // wrongMap, totalCumulative 유지 (축2, 3 절대 유지)
    })
  },

  // ── startReview ───────────────────────────────────────────────────────────
  /**
   * 모아풀기 시작.
   * wrongMap에서 minWrongCount 이상인 항목만 추출.
   * 틀린횟수 내림차순 정렬, 동률 시 원래 순서 유지 (JS sort stable 보장).
   */
  startReview: (minWrongCount = 1) => {
    const state = get()

    // minWrongCount 이상인 ox_id 집합
    const eligibleIds = new Set()
    for (const [oxId, count] of state.wrongMap) {
      if (count >= minWrongCount) eligibleIds.add(oxId)
    }

    // questions에서 해당 항목 필터 후 틀린횟수 내림차순 정렬
    const candidates = state.questions
      .filter((q) => eligibleIds.has(q.ox_id))
      .sort((a, b) => {
        const countA = state.wrongMap.get(a.ox_id) ?? 0
        const countB = state.wrongMap.get(b.ox_id) ?? 0
        return countB - countA  // 내림차순; 동률 시 stable sort로 원래 순서 유지
      })

    set({
      isReviewMode:    true,
      reviewQuestions: candidates,
      currentIdx:      0,
      localSelected:   null,
      showResult:      false,
    })
  },

  // ── resetStore ────────────────────────────────────────────────────────────
  /**
   * 전체 초기화. 과목 변경 시 loadQuestions 전에 반드시 호출.
   */
  resetStore: () => set(getInitialState()),
}))

export default useOxStore
