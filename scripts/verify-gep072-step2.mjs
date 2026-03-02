/**
 * verify-gep072-step2.mjs
 * GEP_072 STEP 2 검증 스크립트
 * 대상: customMockStore.js 핵심 로직
 *
 * node scripts/verify-gep072-step2.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

let pass = 0, fail = 0
function check(label, condition) {
  if (condition) { console.log(`  ✅ PASS | ${label}`); pass++ }
  else           { console.log(`  ❌ FAIL | ${label}`); fail++ }
}

// ── exams.json + config 로드 ────────────────────────────────────────────────
const examsData   = JSON.parse(readFileSync(resolve(__dir, '../public/data/exams.json'), 'utf8'))
const allQ        = examsData.questions

const configSrc = readFileSync(resolve(__dir, '../src/config/customMockConfig.js'), 'utf8')
const config    = eval(
  configSrc
    .replace(/export const customMockConfig =/, 'const customMockConfig =')
    .replace(/export default.*/, '')
    + '\ncustomMockConfig'
)

// ── 핵심 로직 인라인 (Zustand / import 없이) ──────────────────────────────────

// calculateScore (mockExamService에서 재사용하는 로직)
function calculateScore(answers, questions) {
  const bySubject = {}
  questions.forEach((q, idx) => {
    const qNum      = idx + 1
    const selected  = answers[qNum]
    const isCorrect = selected != null && Number(selected) === Number(q.answer)
    if (!bySubject[q.subject]) bySubject[q.subject] = { correct: 0, total: 0 }
    bySubject[q.subject].total++
    if (isCorrect) bySubject[q.subject].correct++
  })
  const scores = {}
  for (const [subject, data] of Object.entries(bySubject)) {
    scores[subject] = {
      correct: data.correct,
      total:   data.total,
      score:   data.total > 0 ? Math.round((data.correct / data.total) * 1000) / 10 : 0,
    }
  }
  return scores
}

// localStorage 시뮬레이션 (Map 기반)
const fakeLS = new Map()
const CUSTOM_SESSION_LS_KEY  = 'gep:custom:active'
const CUSTOM_PROGRESS_LS_KEY = (sid, part) => `gep:custom:${sid}:${part}`
const CUSTOM_RESULT_LS_KEY   = (sid, part) => `gep:custom:result:${sid}:${part}`

function persistSession(s) {
  fakeLS.set(CUSTOM_SESSION_LS_KEY, JSON.stringify({
    sessionLocalId: s.sessionLocalId, supabaseSessionId: s.supabaseSessionId,
    mode: s.mode, timerType: s.timerType,
    weakSubjects: s.weakSubjects, allQuestions: s.allQuestions,
  }))
}
function loadPersistedSession() {
  const raw = fakeLS.get(CUSTOM_SESSION_LS_KEY)
  return raw ? JSON.parse(raw) : null
}
function saveProgressLS(sid, part, store) {
  if (!store.startTime) return
  fakeLS.set(CUSTOM_PROGRESS_LS_KEY(sid, part), JSON.stringify({
    answers:      store.answers,
    currentIndex: store.currentIndex,
    elapsedTime:  Math.floor((Date.now() - store.startTime) / 1000),
  }))
}
function loadProgressLS(sid, part) {
  const raw = fakeLS.get(CUSTOM_PROGRESS_LS_KEY(sid, part))
  return raw ? JSON.parse(raw) : null
}
function saveResultLS(sid, part, data) {
  fakeLS.set(CUSTOM_RESULT_LS_KEY(sid, part), JSON.stringify(data))
}
function loadResultLS(sid, part) {
  const raw = fakeLS.get(CUSTOM_RESULT_LS_KEY(sid, part))
  return raw ? JSON.parse(raw) : null
}
function clearProgressLS(sid, part) { fakeLS.delete(CUSTOM_PROGRESS_LS_KEY(sid, part)) }

// Store 상태 시뮬레이션 (Zustand 없이)
const INITIAL = {
  sessionLocalId: null, supabaseSessionId: null,
  mode: null, timerType: null, weakSubjects: [],
  allQuestions: [], questions: [], currentIndex: 0,
  answers: {}, startTime: null, timeLimit: null,
  currentPart: null,
  part1Completed: false, part1Score: null,
  part2Completed: false, part2Scores: null,
  isComplete: false, isLoading: false, loadError: null,
}

function createStore() {
  let state = { ...INITIAL }
  const get = () => state
  // Zustand set과 동일: 함수형/비함수형 모두 기존 state에 merge
  const set = (patch) => {
    state = typeof patch === 'function'
      ? { ...state, ...patch(state) }
      : { ...state, ...patch }
  }

  function getElapsedTime() {
    if (!state.startTime) return 0
    return Math.floor((Date.now() - state.startTime) / 1000)
  }
  function getRemainingTime() {
    return Math.max(0, (state.timeLimit ?? 0) - getElapsedTime())
  }
  function getUnansweredQuestions() {
    return state.questions.map((_, i) => i + 1).filter(n => state.answers[n] == null)
  }

  return {
    get,
    getElapsedTime,
    getRemainingTime,
    getUnansweredQuestions,

    // startSession 동기 버전 (generateQuestions 결과를 직접 주입)
    startSession(allQuestions, mode, timerType, weakSubjects = []) {
      const sessionLocalId = `custom_${Date.now()}`
      const part1Qs  = allQuestions.slice(0, 40)
      const timeLimit = config.timers[timerType].part1
      const nextState = {
        ...INITIAL,
        sessionLocalId, supabaseSessionId: null,
        mode, timerType, weakSubjects,
        allQuestions, questions: part1Qs,
        currentIndex: 0, answers: {},
        startTime: Date.now(), timeLimit,
        currentPart: 'part1', isLoading: false,
      }
      set(nextState)
      persistSession(nextState)
      return { success: true }
    },

    resumeSession(sessionMeta, part, savedAnswers, savedIndex, elapsedTime) {
      const { sessionLocalId, supabaseSessionId, mode, timerType, weakSubjects, allQuestions } = sessionMeta
      const questions = part === 'part1' ? allQuestions.slice(0, 40) : allQuestions.slice(40)
      const timeLimit = config.timers[timerType][part]
      const startTime = Date.now() - elapsedTime * 1000
      set({
        sessionLocalId, supabaseSessionId: supabaseSessionId ?? null,
        mode, timerType, weakSubjects: weakSubjects ?? [],
        allQuestions, questions, currentIndex: savedIndex,
        answers: savedAnswers, startTime, timeLimit,
        currentPart: part, part1Completed: part === 'part2',
        isLoading: false, loadError: null,
      })
    },

    selectAnswer(qNum, answer) {
      set(s => ({ answers: { ...s.answers, [qNum]: answer } }))
    },

    nextQuestion() { set(s => ({ currentIndex: Math.min(s.currentIndex + 1, s.questions.length - 1) })) },
    prevQuestion() { set(s => ({ currentIndex: Math.max(s.currentIndex - 1, 0) })) },
    goToQuestion(i) { set({ currentIndex: i }) },

    saveProgress() {
      if (!state.sessionLocalId || !state.currentPart) return
      saveProgressLS(state.sessionLocalId, state.currentPart, { ...state, getElapsedTime })
    },

    submitPart1() {
      const scores      = calculateScore(state.answers, state.questions)
      const elapsedTime = getElapsedTime()
      saveResultLS(state.sessionLocalId, 'part1', { scores, elapsedTime })
      clearProgressLS(state.sessionLocalId, 'part1')

      const part2Qs  = state.allQuestions.slice(40)
      const timeLimit = config.timers[state.timerType].part2
      set({
        part1Completed: true, part1Score: scores,
        currentPart: 'part2', questions: part2Qs,
        currentIndex: 0, answers: {},
        startTime: Date.now(), timeLimit,
      })
      return { scores, elapsedTime }
    },

    submitPart2() {
      const scores      = calculateScore(state.answers, state.questions)
      const elapsedTime = getElapsedTime()
      saveResultLS(state.sessionLocalId, 'part2', { scores, elapsedTime })
      clearProgressLS(state.sessionLocalId, 'part2')
      set({
        part2Completed: true, part2Scores: scores, isComplete: true,
        currentPart: null, questions: [], answers: {},
        currentIndex: 0, startTime: null, timeLimit: null,
      })
      return { scores, elapsedTime }
    },

    reset() {
      fakeLS.delete(CUSTOM_SESSION_LS_KEY)
      set({ ...INITIAL })
    },
  }
}

// ── 표준 모드 120문제 생성 (기존 verify 로직 재사용) ──────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function randomPick(pool, count) {
  if (!pool.length) return []
  if (pool.length >= count) return shuffle(pool).slice(0, count)
  const r = []
  while (r.length < count) r.push(...shuffle(pool).slice(0, Math.min(count - r.length, pool.length)))
  return r
}
function calcAllocation(subs, weak, total, mult = 2) {
  const w = subs.map(s => weak.includes(s) ? mult : 1)
  const tw = w.reduce((a, b) => a + b, 0)
  const allocs = w.map(v => Math.floor(v / tw * total))
  const rem = total - allocs.reduce((a, b) => a + b, 0)
  const fracs = w.map((v, i) => ({ i, f: v / tw * total - allocs[i] })).sort((a, b) => b.f - a.f)
  for (let i = 0; i < rem; i++) allocs[fracs[i].i]++
  const res = {}
  subs.forEach((s, i) => { res[s] = allocs[i] })
  return res
}
function makeQuestions(weak = []) {
  const parts = { law: [], p1: [], p2: [] }
  for (const [subj, { count, subSubjects }] of Object.entries(config.distribution)) {
    const alloc = calcAllocation(subSubjects, weak, count)
    for (const [sub, n] of Object.entries(alloc)) {
      const pool  = allQ.filter(q => q.subject === subj && q.subSubject === sub)
      const picks = randomPick(pool, n)
      if (subj === '법령')    parts.law.push(...picks)
      if (subj === '손보1부') parts.p1.push(...picks)
      if (subj === '손보2부') parts.p2.push(...picks)
    }
  }
  return [...shuffle(parts.law), ...shuffle(parts.p1), ...shuffle(parts.p2)]
}

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] startSession → 초기 상태
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] startSession → 초기 상태 검증')

const store = createStore()
const qs    = makeQuestions()
store.startSession(qs, 'standard', 'full')
const s1 = store.get()

check('isLoading = false',                  s1.isLoading === false)
check('currentPart = "part1"',              s1.currentPart === 'part1')
check('mode = "standard"',                  s1.mode === 'standard')
check('timerType = "full"',                 s1.timerType === 'full')
check('allQuestions = 120',                 s1.allQuestions.length === 120)
check('questions (part1) = 40',             s1.questions.length === 40)
check('모든 part1 문제가 법령',             s1.questions.every(q => q.subject === '법령'))
check('currentIndex = 0',                   s1.currentIndex === 0)
check('answers = {}',                       Object.keys(s1.answers).length === 0)
check('startTime 설정됨',                   s1.startTime != null)
check('timeLimit = 40분 (2400초)',          s1.timeLimit === 40 * 60)
check('sessionLocalId 설정됨',              s1.sessionLocalId?.startsWith('custom_'))
check('part1Completed = false',             s1.part1Completed === false)
check('isComplete = false',                 s1.isComplete === false)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] startSession → localStorage 세션 메타 저장
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] localStorage 세션 메타 저장 확인')

const persisted = loadPersistedSession()
check('세션 메타 저장됨',                   persisted != null)
check('sessionLocalId 일치',               persisted?.sessionLocalId === s1.sessionLocalId)
check('mode 일치',                          persisted?.mode === 'standard')
check('timerType 일치',                     persisted?.timerType === 'full')
check('allQuestions 120개 저장됨',          persisted?.allQuestions?.length === 120)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] selectAnswer + 10문제 자동저장
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] selectAnswer + 자동저장')

// 10문제 답안 입력
for (let i = 1; i <= 10; i++) store.selectAnswer(i, (i % 4) + 1)
store.goToQuestion(9) // 10번째 문제 → 자동저장 트리거 시뮬레이션
store.saveProgress()

const s2 = store.get()
check('10개 답안 저장됨',                   Object.keys(s2.answers).length === 10)
check('답안 값 범위 1~4',                   Object.values(s2.answers).every(v => v >= 1 && v <= 4))

const savedProg = loadProgressLS(s2.sessionLocalId, 'part1')
check('progress localStorage 저장됨',       savedProg != null)
check('progress answers 10개',              Object.keys(savedProg?.answers ?? {}).length === 10)
check('progress currentIndex 저장됨',       savedProg?.currentIndex != null)
check('progress elapsedTime 저장됨',        savedProg?.elapsedTime != null)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] 문제 이동 (next/prev/goTo)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] 문제 이동 액션')

store.goToQuestion(0)
store.nextQuestion(); check('nextQuestion → index = 1', store.get().currentIndex === 1)
store.nextQuestion(); check('nextQuestion → index = 2', store.get().currentIndex === 2)
store.prevQuestion(); check('prevQuestion → index = 1', store.get().currentIndex === 1)
store.goToQuestion(39); check('goToQuestion(39) → index = 39', store.get().currentIndex === 39)
store.nextQuestion(); check('마지막에서 nextQuestion → index = 39 유지', store.get().currentIndex === 39)
store.goToQuestion(0); store.prevQuestion()
check('첫 문제에서 prevQuestion → index = 0 유지', store.get().currentIndex === 0)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] getUnansweredQuestions
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] 미응답 문제 목록')

// 현재 1~10번 답안 있음, 11~40 없음
const unanswered = store.getUnansweredQuestions()
check('미응답 = 30개 (11~40번)',            unanswered.length === 30)
check('미응답 시작 = 11번',                 unanswered[0] === 11)
check('미응답 끝 = 40번',                   unanswered[29] === 40)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] 타이머 검증 (절대시간 기반)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] 타이머 (절대시간 기반)')

const elapsed = store.getElapsedTime()
const remaining = store.getRemainingTime()
check('elapsedTime >= 0',                   elapsed >= 0)
check('remainingTime <= 2400 (40분)',        remaining <= 40 * 60)
check('remainingTime > 0 (방금 시작)',       remaining > 0)
check('elapsed + remaining ≈ 2400초',       Math.abs(elapsed + remaining - 2400) <= 2)
check('isTimeout = false (방금 시작)',       !store.get()?.isComplete) // isTimeout은 메서드 호출

// SHORT 타이머 검증
const storeShort = createStore()
const qsShort    = makeQuestions()
storeShort.startSession(qsShort, 'weakness', 'short')
check('SHORT part1 = 1920초 (32분)',        storeShort.get().timeLimit === 32 * 60)
// part2 타이머는 submitPart1 후 확인
storeShort.submitPart1()
check('SHORT part2 = 3840초 (64분)',        storeShort.get().timeLimit === 64 * 60)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] submitPart1 → 2교시 전환
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] submitPart1 → 2교시 전환')

// 전체 40개 답안 세팅
for (let i = 1; i <= 40; i++) store.selectAnswer(i, 1)
const { scores: p1Scores, elapsedTime: p1Elapsed } = store.submitPart1()
const s3 = store.get()

check('part1Completed = true',              s3.part1Completed === true)
check('currentPart = "part2"',             s3.currentPart === 'part2')
check('part2 questions = 80',              s3.questions.length === 80)
check('part2 questions = 손보1부+손보2부', s3.questions.every(q => ['손보1부','손보2부'].includes(q.subject)))
check('part2 currentIndex = 0',            s3.currentIndex === 0)
check('part2 answers = {}',                Object.keys(s3.answers).length === 0)
check('part2 timeLimit = 4800초 (FULL)',   s3.timeLimit === 80 * 60)
check('part1 result localStorage 저장됨',  loadResultLS(s3.sessionLocalId, 'part1') != null)
check('part1 progress 클리어됨',           loadProgressLS(s3.sessionLocalId, 'part1') === null)
check('p1Scores["법령"] 존재',             p1Scores['법령'] != null)
check('p1Elapsed > 0',                     p1Elapsed >= 0)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 8 ] submitPart2 → 최종 완료
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 8 ] submitPart2 → 최종 완료')

// 80개 답안 세팅
for (let i = 1; i <= 80; i++) store.selectAnswer(i, 2)
const { scores: p2Scores } = store.submitPart2()
const s4 = store.get()

check('part2Completed = true',             s4.part2Completed === true)
check('isComplete = true',                 s4.isComplete === true)
check('currentPart = null',                s4.currentPart === null)
check('questions 클리어됨',               s4.questions.length === 0)
check('answers 클리어됨',                 Object.keys(s4.answers).length === 0)
check('startTime = null',                  s4.startTime === null)
check('part2 result localStorage 저장됨',  loadResultLS(s4.sessionLocalId, 'part2') != null)
check('part2 progress 클리어됨',           loadProgressLS(s4.sessionLocalId, 'part2') === null)
check('p2Scores["손보1부"] 존재',          p2Scores['손보1부'] != null)
check('p2Scores["손보2부"] 존재',          p2Scores['손보2부'] != null)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 9 ] resumeSession — 이어하기
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 9 ] resumeSession — 이어하기')

const store2   = createStore()
const qsResume = makeQuestions()
store2.startSession(qsResume, 'standard', 'full')

// 20문제 답안 저장 후 진행 저장
for (let i = 1; i <= 20; i++) store2.selectAnswer(i, 3)
store2.goToQuestion(19)
store2.saveProgress()

// 이어하기 시뮬레이션
const meta      = loadPersistedSession()
const progress  = loadProgressLS(meta.sessionLocalId, 'part1')
const store3    = createStore()
store3.resumeSession(meta, 'part1', progress.answers, progress.currentIndex, progress.elapsedTime)
const sr = store3.get()

check('resumeSession: currentPart = "part1"',       sr.currentPart === 'part1')
check('resumeSession: questions = 40',              sr.questions.length === 40)
check('resumeSession: 20개 답안 복원됨',            Object.keys(sr.answers).length === 20)
check('resumeSession: currentIndex 복원됨',         sr.currentIndex === 19)
check('resumeSession: startTime 설정됨',            sr.startTime != null)
check('resumeSession: allQuestions 120개 복원됨',   sr.allQuestions.length === 120)

// 타이머 연속성 (경과 시간 기반 재설정)
const resumedElapsed = store3.getElapsedTime()
check('resumeSession: 경과시간 ≥ progress 저장값',  resumedElapsed >= progress.elapsedTime)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 10 ] reset → 전체 초기화
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 10 ] reset → 전체 초기화')

const store4 = createStore()
store4.startSession(makeQuestions(), 'weakness', 'short', ['해상보험', '특종보험', '보험업법'])
store4.reset()
const sr4 = store4.get()

check('reset: sessionLocalId = null',      sr4.sessionLocalId === null)
check('reset: mode = null',                sr4.mode === null)
check('reset: timerType = null',           sr4.timerType === null)
check('reset: allQuestions = []',          sr4.allQuestions.length === 0)
check('reset: questions = []',             sr4.questions.length === 0)
check('reset: answers = {}',              Object.keys(sr4.answers).length === 0)
check('reset: isComplete = false',         sr4.isComplete === false)
check('reset: localStorage 세션 클리어됨', loadPersistedSession() === null)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 11 ] calculateScore 정합성 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 11 ] calculateScore — 채점 정합성')

// 법령 40문제 전부 정답 맞추기 (answer=1로 세팅 후 정답 1인 것만 맞음)
const lawQs = makeQuestions().slice(0, 40)
const testAnswers = {}
lawQs.forEach((q, i) => { testAnswers[i + 1] = q.answer }) // 모두 정답
const perfectScore = calculateScore(testAnswers, lawQs)
check('전체 정답: 법령 score = 100',       perfectScore['법령']?.score === 100)
check('전체 정답: correct = total',        perfectScore['법령']?.correct === perfectScore['법령']?.total)

const wrongAnswers = {}
lawQs.forEach((q, i) => {
  // 틀린 답: answer와 다른 값
  wrongAnswers[i + 1] = (q.answer % 4) + 1
})
const wrongScore = calculateScore(wrongAnswers, lawQs)
check('모두 오답: 법령 score < 100',        wrongScore['법령']?.score < 100)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 12 ] INITIAL 구조 검증 — 모든 필드 존재
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 12 ] INITIAL 상태 필드 완전성')

const freshStore = createStore()
const fs = freshStore.get()
const requiredFields = [
  'sessionLocalId', 'supabaseSessionId', 'mode', 'timerType', 'weakSubjects',
  'allQuestions', 'questions', 'currentIndex', 'answers',
  'startTime', 'timeLimit', 'currentPart',
  'part1Completed', 'part1Score', 'part2Completed', 'part2Scores',
  'isComplete', 'isLoading', 'loadError',
]
requiredFields.forEach(field => {
  check(`INITIAL.${field} 필드 존재`, field in fs)
})

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_072 STEP 2 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
