/**
 * GEP_032_STEP1 검증 스크립트
 * byRound['전체'] 오염 차단 확인
 *
 * 실행: node scripts/verify-byround.mjs
 */

// ── statsStore 핵심 로직 인라인 시뮬레이션 ──────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_STATS = {
  version: '1.0',
  total:     { solved: 0, correct: 0 },
  daily:     {},
  bySubject: {},
  byRound:   {},
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

function updateStats(prev, { subject, round, solved, correct }) {
  const today     = todayKey()
  const prevDay   = prev.daily[today]        ?? { solved: 0, correct: 0 }
  const prevSubj  = prev.bySubject[subject]  ?? { solved: 0, correct: 0 }
  const prevRound = prev.byRound[round]      ?? { solved: 0, correct: 0 }
  return {
    ...prev,
    total: {
      solved:  prev.total.solved  + solved,
      correct: prev.total.correct + correct,
    },
    daily: {
      ...prev.daily,
      [today]: { solved: prevDay.solved + solved, correct: prevDay.correct + correct },
    },
    bySubject: {
      ...prev.bySubject,
      [subject]: { solved: prevSubj.solved + solved, correct: prevSubj.correct + correct },
    },
    byRound: {
      ...prev.byRound,
      [round]: { solved: prevRound.solved + solved, correct: prevRound.correct + correct },
    },
  }
}

// ── Question.jsx handleAnswer 핵심 로직 시뮬레이션 ──────
function handleAnswer(stats, { question, selectedRound, answerNum, recordedSet }) {
  if (recordedSet.has(question.id)) return { stats, recorded: false }

  const safeRound = Number.isInteger(question.round) ? question.round : null

  if (!safeRound) {
    console.warn('[GEP] question.round 비정상 — 통계 미기록:', question.id, question.round)
    return { stats, recorded: false }
  }

  const newStats = updateStats(stats, {
    subject: question.subSubject,
    round:   safeRound,
    solved:  1,
    correct: answerNum === question.answer ? 1 : 0,
  })
  recordedSet.add(question.id)
  return { stats: newStats, recorded: true }
}

// ── 테스트 실행 ─────────────────────────────────────────
let pass = 0, fail = 0

function check(label, condition) {
  if (condition) {
    console.log(`  ✅ PASS | ${label}`)
    pass++
  } else {
    console.log(`  ❌ FAIL | ${label}`)
    fail++
  }
}

console.log('\n=== GEP_032_STEP1 byRound 오염 검증 ===\n')

// ─────────────────────────────────────────────────────
// 시나리오 1: 과목별 학습 모드 (selectedRound='전체', question.round=23)
// ─────────────────────────────────────────────────────
console.log('[ 시나리오 1 ] 과목별 학습 모드 — selectedRound="전체", question.round=23')

let stats = clone(DEFAULT_STATS)
const recorded1 = new Set()
const questions1 = [
  { id: 'q1', round: 23, subSubject: '보험업법', answer: 2 },
  { id: 'q2', round: 27, subSubject: '보험업법', answer: 1 },
  { id: 'q3', round: 25, subSubject: '상법',     answer: 3 },
]

for (const q of questions1) {
  const result = handleAnswer(stats, {
    question: q,
    selectedRound: '전체',   // ← 과목별 학습 모드
    answerNum: q.answer,      // 모두 정답 처리
    recordedSet: recorded1,
  })
  stats = result.stats
}

console.log('  byRound 결과:', JSON.stringify(stats.byRound))
check('"전체" 키 없음',  !Object.keys(stats.byRound).includes('전체'))
check('숫자 23 키 존재', Object.keys(stats.byRound).includes('23'))
check('숫자 27 키 존재', Object.keys(stats.byRound).includes('27'))
check('숫자 25 키 존재', Object.keys(stats.byRound).includes('25'))
check('total.solved = 3', stats.total.solved === 3)

// ─────────────────────────────────────────────────────
// 시나리오 2: 회차별 풀기 모드 (selectedRound=23, question.round=23)
// ─────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] 회차별 풀기 모드 — selectedRound=23, question.round=23')

let stats2 = clone(DEFAULT_STATS)
const recorded2 = new Set()
const questions2 = [
  { id: 'q4', round: 23, subSubject: '법령', answer: 1 },
  { id: 'q5', round: 23, subSubject: '법령', answer: 2 },
]

for (const q of questions2) {
  const result = handleAnswer(stats2, {
    question: q,
    selectedRound: 23,       // ← 회차별 풀기 모드
    answerNum: q.answer,
    recordedSet: recorded2,
  })
  stats2 = result.stats
}

console.log('  byRound 결과:', JSON.stringify(stats2.byRound))
check('"전체" 키 없음',  !Object.keys(stats2.byRound).includes('전체'))
check('숫자 23 키 존재', Object.keys(stats2.byRound).includes('23'))
check('23.solved = 2',   stats2.byRound['23']?.solved === 2)

// ─────────────────────────────────────────────────────
// 시나리오 3: question.round 비정상 (null, undefined, "전체")
// ─────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] question.round 비정상값 — 통계 미기록 확인')

let stats3 = clone(DEFAULT_STATS)
const recorded3 = new Set()
const badQuestions = [
  { id: 'bq1', round: null,      subSubject: '법령', answer: 1 },
  { id: 'bq2', round: undefined, subSubject: '법령', answer: 1 },
  { id: 'bq3', round: '전체',   subSubject: '법령', answer: 1 },
]

for (const q of badQuestions) {
  const result = handleAnswer(stats3, {
    question: q,
    selectedRound: '전체',
    answerNum: 1,
    recordedSet: recorded3,
  })
  stats3 = result.stats
}

console.log('  byRound 결과:', JSON.stringify(stats3.byRound))
check('byRound 완전히 비어있음 (기록 0건)', Object.keys(stats3.byRound).length === 0)
check('total.solved = 0 (기록 없음)',        stats3.total.solved === 0)

// ─────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────
console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL ===`)
if (fail === 0) {
  console.log('✅ GEP_032_STEP1 검증 완료\n')
  process.exit(0)
} else {
  console.log('❌ 검증 실패 — 확인 필요\n')
  process.exit(1)
}
