/**
 * scripts/test-stats.mjs
 * GEP_023 단위 테스트: updateStats → localStorage gep_stats_v1 저장 확인
 *
 * 실행: node scripts/test-stats.mjs
 *
 * Vitest 미설치 환경에서 Node.js 동적 import로 localStorage를 모킹하여
 * statsStore.js / statsStorage.js 동작을 검증한다.
 */

// ── 1. localStorage 목(mock) 설정 — 반드시 import 전에 ──────────────────
const _store = {}
globalThis.localStorage = {
  getItem:    (k) => _store[k] ?? null,
  setItem:    (k, v) => { _store[k] = String(v) },
  removeItem: (k) => { delete _store[k] },
}

// ── 2. 모듈 동적 로드 (localStorage mock 이후 평가되도록 await import 사용) ─
const { default: useStatsStore } = await import('../src/stores/statsStore.js')
const { STATS_KEY }              = await import('../src/utils/statsStorage.js')

// ── 3. 테스트 헬퍼 ────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}`)
    console.error(`     expected: ${JSON.stringify(expected)}`)
    console.error(`     actual:   ${JSON.stringify(actual)}`)
    failed++
  }
}

// ── 4. 테스트 케이스 ──────────────────────────────────────────────────────

console.log('\n[테스트 1] updateStats 호출 → total 누적')
useStatsStore.getState().resetStats()
useStatsStore.getState().updateStats({ subject: '법령', round: 23, solved: 10, correct: 7 })
const s1 = useStatsStore.getState().stats
assert('total.solved  = 10', s1.total.solved,  10)
assert('total.correct = 7',  s1.total.correct, 7)

console.log('\n[테스트 2] localStorage["gep_stats_v1"] 저장 확인')
const saved = JSON.parse(_store[STATS_KEY] ?? 'null')
assert('localStorage에 저장됨',     saved !== null,        true)
assert('saved.total.solved  = 10', saved?.total?.solved,  10)
assert('saved.total.correct = 7',  saved?.total?.correct, 7)

console.log('\n[테스트 3] bySubject 누적')
assert('bySubject.법령.solved  = 10', s1.bySubject['법령'].solved,  10)
assert('bySubject.법령.correct = 7',  s1.bySubject['법령'].correct, 7)

console.log('\n[테스트 4] byRound 누적')
assert('byRound[23].solved  = 10', s1.byRound[23].solved,  10)
assert('byRound[23].correct = 7',  s1.byRound[23].correct, 7)

console.log('\n[테스트 5] getTodayStats')
const today = useStatsStore.getState().getTodayStats()
assert('today.solved  = 10', today.solved,  10)
assert('today.correct = 7',  today.correct, 7)

console.log('\n[테스트 6] 2번 연속 호출 시 누적')
useStatsStore.getState().updateStats({ subject: '법령', round: 23, solved: 5, correct: 3 })
const s6 = useStatsStore.getState().stats
assert('total.solved  = 15', s6.total.solved,  15)
assert('total.correct = 10', s6.total.correct, 10)

console.log('\n[테스트 7] resetStats → 초기화 및 localStorage 키 삭제')
useStatsStore.getState().resetStats()
const s7 = useStatsStore.getState().stats
assert('total.solved  = 0',   s7.total.solved,  0)
assert('total.correct = 0',   s7.total.correct, 0)
assert('localStorage 키 없음', STATS_KEY in _store, false)

// ── 5. 결과 요약 ──────────────────────────────────────────────────────────
console.log(`\n결과: ${passed} 통과 / ${failed} 실패`)
if (failed > 0) process.exit(1)
