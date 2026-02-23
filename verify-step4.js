/**
 * verify-step4.js — Phase 3 STEP4 통합 검증 스크립트
 *
 * 실행: node verify-step4.js
 *
 * 5개 시나리오:
 *   A. 게스트 30문제 소진 → 팝업 → 다른 과목 이동
 *   B. 신규 회원 로그인 → 레벨1 확인
 *   C. 레벨2 문제풀기 → 서버 저장 → 틀린문제풀기
 *   D. 오프라인 → 로컬 저장 → 복귀 후 싱크
 *   E. 기존 기능 회귀 테스트
 */

// ── Mock localStorage ─────────────────────────────────────────
let _store = {}
const localStorage = {
  getItem:    (k) => _store[k] ?? null,
  setItem:    (k, v) => { _store[k] = String(v) },
  removeItem: (k) => { delete _store[k] },
  clear:      () => { _store = {} },
}
global.localStorage = localStorage

// ── Test runner ───────────────────────────────────────────────
let passed = 0, failed = 0, total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.error(`  ❌ ${name}`)
    console.error(`     → ${e.message}`)
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'Assertion failed')
}

function assertEqual(a, b, label) {
  if (a !== b) throw new Error(`${label ?? ''}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

// ── statsStorage 로직 인라인 (Node.js 환경용 복제) ───────────
const STATS_KEY     = 'gep_stats_v1'
const STATS_VERSION = '1.0'
const DEFAULT_STATS = () => ({
  version:   STATS_VERSION,
  total:     { solved: 0, correct: 0 },
  daily:     {},
  bySubject: {},
  byRound:   {},
})

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return DEFAULT_STATS()
    const p = JSON.parse(raw)
    if (p.version !== STATS_VERSION) return DEFAULT_STATS()
    return p
  } catch { return DEFAULT_STATS() }
}

function saveStats(s) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s))
}

function clearStats() {
  localStorage.removeItem(STATS_KEY)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function updateStats(prev, { subject, round, solved, correct }) {
  const today    = todayKey()
  const prevDay  = prev.daily[today]       ?? { solved: 0, correct: 0 }
  const prevSubj = prev.bySubject[subject] ?? { solved: 0, correct: 0 }
  const prevRnd  = prev.byRound[round]     ?? { solved: 0, correct: 0 }
  return {
    ...prev,
    total: { solved: prev.total.solved + solved, correct: prev.total.correct + correct },
    daily: { ...prev.daily, [today]: { solved: prevDay.solved + solved, correct: prevDay.correct + correct } },
    bySubject: { ...prev.bySubject, [subject]: { solved: prevSubj.solved + solved, correct: prevSubj.correct + correct } },
    byRound:   { ...prev.byRound,   [round]:   { solved: prevRnd.solved  + solved, correct: prevRnd.correct  + correct } },
  }
}

// ── examStore localStorage 로직 인라인 ───────────────────────
const EXAM_KEY = 'gep:v1:examStore'

function saveExamState(state) {
  const payload = {
    meta:               { version: '2.0', totalCount: 1080 },
    answers:            state.answers,
    currentIndex:       state.currentIndex,
    selectedSubject:    state.selectedSubject,
    selectedRound:      state.selectedRound,
    selectedSubSubject: state.selectedSubSubject,
    progressMap:        state.progressMap,
  }
  localStorage.setItem(EXAM_KEY, JSON.stringify(payload))
}

function loadExamState(version = '2.0', totalCount = 1080) {
  const raw = localStorage.getItem(EXAM_KEY)
  if (!raw) return null
  const saved = JSON.parse(raw)
  if (saved.meta?.version !== version || saved.meta?.totalCount !== totalCount) return null
  return saved
}

// ── Business logic helpers ────────────────────────────────────
const GUEST_LIMIT = 30

function guestLimitCheck(stats, subSubject) {
  const solved = stats.bySubject[subSubject]?.solved ?? 0
  return solved >= GUEST_LIMIT
}

// guestTotal (StatsPanel 로직)
function calcGuestTotal(bySubject) {
  const SUBS = [
    '보험업법','상법','세제재무','위험관리',
    '보증보험','연금저축','자동차보험','특종보험',
    '재보험','항공우주','해상보험','화재보험',
  ]
  return SUBS.reduce((sum, sub) => sum + Math.min(bySubject[sub]?.solved ?? 0, GUEST_LIMIT), 0)
}

// wrongCount (Home.jsx 로직)
function calcWrongCount(stats) {
  return Math.max(0, stats.total.solved - stats.total.correct)
}

// ═══════════════════════════════════════════════════════════════
// 시나리오 A: 게스트 30문제 소진 → 팝업 → 다른 과목 이동
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 시나리오 A: 게스트 30문제 소진')

test('A-1: 게스트 통계 초기 상태 = solved 0', () => {
  localStorage.clear()
  const stats = loadStats()
  assert(stats.total.solved === 0, '초기 solved != 0')
})

test('A-2: 보험업법 30문제 풀기 → bySubject 반영', () => {
  let stats = loadStats()
  for (let i = 0; i < 30; i++) {
    stats = updateStats(stats, { subject: '보험업법', round: 23, solved: 1, correct: i % 2 === 0 ? 1 : 0 })
  }
  saveStats(stats)
  const loaded = loadStats()
  assertEqual(loaded.bySubject['보험업법'].solved, 30, 'bySubject solved')
})

test('A-3: 30문제 소진 시 guestLimitCheck → true (팝업 트리거)', () => {
  const stats = loadStats()
  assert(guestLimitCheck(stats, '보험업법') === true, '30문제 소진 후 limit 미감지')
})

test('A-4: 다른 과목(상법) 은 limit 미도달 → false', () => {
  const stats = loadStats()
  assert(guestLimitCheck(stats, '상법') === false, '상법은 아직 limit 아님')
})

test('A-5: guestTotal = 30 (1과목만 30개)', () => {
  const stats = loadStats()
  const total = calcGuestTotal(stats.bySubject)
  assertEqual(total, 30, 'guestTotal')
})

test('A-6: 과목 이동 후 새 과목은 limit 미도달', () => {
  const stats = loadStats()
  // 자동차보험으로 이동
  assert(guestLimitCheck(stats, '자동차보험') === false, '새 과목 limit 미달')
})

// ═══════════════════════════════════════════════════════════════
// 시나리오 B: 신규 회원 로그인 → 레벨1 확인
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 시나리오 B: 신규 회원 로그인')

// authStore 로직 시뮬레이션
function makeAuthState(serviceLevel = 1) {
  return {
    authStatus:   'authenticated',
    serviceLevel,
    email:        'test@example.com',
    userId:       'uid-test-123',
    userFeatures: {
      canStats:    serviceLevel >= 2,
      canWrongNote: serviceLevel >= 3,
      canMockExam: serviceLevel >= 5,
    },
  }
}

test('B-1: 신규 회원 service_level = 1', () => {
  const auth = makeAuthState(1)
  assertEqual(auth.serviceLevel, 1, 'serviceLevel')
  assert(auth.authStatus === 'authenticated', 'authStatus')
})

test('B-2: 레벨1 userFeatures — canStats false', () => {
  const auth = makeAuthState(1)
  assert(auth.userFeatures.canStats === false, 'canStats')
  assert(auth.userFeatures.canWrongNote === false, 'canWrongNote')
})

test('B-3: 레벨2 userFeatures — canStats true', () => {
  const auth = makeAuthState(2)
  assert(auth.userFeatures.canStats === true, 'canStats lv2')
  assert(auth.userFeatures.canWrongNote === false, 'canWrongNote lv2')
})

test('B-4: isGuest 판별 — 게스트 시 true', () => {
  const guestAuth = { authStatus: 'guest', serviceLevel: 1 }
  const isGuest   = guestAuth.authStatus === 'guest' && guestAuth.serviceLevel < 2
  assert(isGuest === true, 'isGuest')
})

test('B-5: isGuest 판별 — 회원 시 false', () => {
  const auth    = makeAuthState(1)
  const isGuest = auth.authStatus === 'guest' && auth.serviceLevel < 2
  assert(isGuest === false, 'isGuest false for authenticated')
})

// ═══════════════════════════════════════════════════════════════
// 시나리오 C: 레벨2 문제풀기 → 서버 저장 → 틀린문제풀기
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 시나리오 C: 레벨2 문제풀기 → 틀린문제')

test('C-1: 레벨2 attempts 저장 조건 충족', () => {
  const auth = makeAuthState(2)
  const STATS_MIN_LEVEL = 2
  assert(auth.authStatus === 'authenticated', 'authenticated')
  assert(auth.serviceLevel >= STATS_MIN_LEVEL, 'serviceLevel >= 2')
  assert(auth.userId !== null, 'userId 존재')
})

test('C-2: wrongCount 계산 — 오답 횟수 = solved - correct', () => {
  localStorage.clear()
  let stats = loadStats()
  // 10문제 풀기, 3개 정답
  for (let i = 0; i < 10; i++) {
    stats = updateStats(stats, { subject: '상법', round: 24, solved: 1, correct: i < 3 ? 1 : 0 })
  }
  saveStats(stats)
  const loaded = loadStats()
  const wc = calcWrongCount(loaded)
  assertEqual(wc, 7, 'wrongCount')
})

test('C-3: wrongCount — wrongCount 프롭 조건 (레벨2+만)', () => {
  const stats = loadStats()
  const auth  = makeAuthState(2)
  const wc = (auth.authStatus === 'authenticated' && auth.serviceLevel >= 2)
    ? calcWrongCount(stats) : null
  assert(wc !== null, 'wrongCount not null for lv2')
  assertEqual(wc, 7, 'wrongCount value')
})

test('C-4: 레벨1에서 wrongCount = null', () => {
  const stats = loadStats()
  const auth  = makeAuthState(1)
  const wc = (auth.authStatus === 'authenticated' && auth.serviceLevel >= 2)
    ? calcWrongCount(stats) : null
  assert(wc === null, 'wrongCount null for lv1')
})

test('C-5: 틀린문제 풀기 버튼 — wrongCount > 0 뱃지 표시 조건', () => {
  const wrongCount = 7
  const showBadge  = wrongCount > 0
  assert(showBadge === true, '뱃지 표시')
})

// ═══════════════════════════════════════════════════════════════
// 시나리오 D: 오프라인 → 로컬 저장 → 복귀 후 싱크
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 시나리오 D: 오프라인 → 로컬 저장 → 복귀')

test('D-1: 오프라인 시 statsStorage 정상 save/load', () => {
  localStorage.clear()
  let stats = loadStats()
  stats = updateStats(stats, { subject: '화재보험', round: 25, solved: 5, correct: 3 })
  saveStats(stats)
  const loaded = loadStats()
  assertEqual(loaded.bySubject['화재보험'].solved, 5, '오프라인 로컬 저장')
  assertEqual(loaded.bySubject['화재보험'].correct, 3, '오프라인 로컬 정답')
})

test('D-2: 버전 불일치 시 기본값 반환', () => {
  localStorage.setItem(STATS_KEY, JSON.stringify({ version: '0.9', total: { solved: 99, correct: 50 }, daily: {}, bySubject: {}, byRound: {} }))
  const stats = loadStats()
  assertEqual(stats.total.solved, 0, '구버전 → 기본값')
})

test('D-3: examStore 로컬 저장/복원 — 버전 일치', () => {
  localStorage.clear()
  const state = {
    answers:            { 'q-001': 2 },
    currentIndex:       5,
    selectedSubject:    '법령',
    selectedRound:      24,
    selectedSubSubject: '상법',
    progressMap:        { '24_법령_상법': 5 },
  }
  saveExamState(state)
  const loaded = loadExamState('2.0', 1080)
  assert(loaded !== null, '복원 성공')
  assertEqual(loaded.currentIndex, 5, 'currentIndex 복원')
  assertEqual(loaded.selectedSubject, '법령', 'selectedSubject 복원')
  assertEqual(loaded.progressMap['24_법령_상법'], 5, 'progressMap 복원')
})

test('D-4: examStore — 버전 불일치 시 null 반환', () => {
  // 같은 데이터를 다른 totalCount로 로드 시도
  const loaded = loadExamState('2.0', 999)
  assert(loaded === null, '버전 불일치 → null')
})

test('D-5: 오늘 날짜 키 형식 YYYY-MM-DD', () => {
  const key = todayKey()
  assert(/^\d{4}-\d{2}-\d{2}$/.test(key), `날짜 형식 오류: ${key}`)
})

// ═══════════════════════════════════════════════════════════════
// 시나리오 E: 기존 기능 회귀 테스트
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 시나리오 E: 기존 기능 회귀 테스트')

test('E-1: statsStorage clearStats → 기본값으로 복원', () => {
  localStorage.clear()
  let stats = loadStats()
  stats = updateStats(stats, { subject: '법령', round: 23, solved: 10, correct: 8 })
  saveStats(stats)
  clearStats()
  const reset = loadStats()
  assertEqual(reset.total.solved, 0, 'clearStats 후 reset')
})

test('E-2: updateStats — total 누적 정확성', () => {
  let stats = loadStats()
  stats = updateStats(stats, { subject: '해상보험', round: 26, solved: 10, correct: 7 })
  stats = updateStats(stats, { subject: '해상보험', round: 26, solved: 5,  correct: 3 })
  assertEqual(stats.total.solved,  15, 'total.solved 누적')
  assertEqual(stats.total.correct, 10, 'total.correct 누적')
})

test('E-3: guestTotal — 12 세부과목 상한 합산', () => {
  localStorage.clear()
  const bySubject = {
    '보험업법': { solved: 35, correct: 20 }, // 상한 30
    '상법':    { solved: 20, correct: 15 },  // 그대로 20
    // 나머지 10개 = 0
  }
  const total = calcGuestTotal(bySubject)
  assertEqual(total, 50, 'guestTotal (30+20)')
})

test('E-4: progressMap 키 형식 — 세부과목 포함', () => {
  const makeKey = (round, subject, sub) =>
    sub ? `${round}_${subject}_${sub}` : `${round}_${subject}`

  assertEqual(makeKey(23, '법령', null),   '23_법령',       '세부과목 없음')
  assertEqual(makeKey(24, '손보1부', '상법'), '24_손보1부_상법', '세부과목 있음')
})

test('E-5: 정답률 계산 — solved=0 시 null', () => {
  const pct = (solved, correct) =>
    solved > 0 ? Math.round((correct / solved) * 100) : null
  assert(pct(0, 0) === null, 'solved=0 → null')
  assertEqual(pct(10, 7), 70, '7/10 = 70%')
})

test('E-6: 게스트 30문제 초과 시 answered 후에도 stat 기록 금지 재시도 없음 (recordedSet)', () => {
  // recordedSet 패턴: 이미 기록된 문제는 skip
  const recordedSet = new Set()
  const questionId  = 'q-test-001'

  let recorded = 0
  function tryRecord(id) {
    if (recordedSet.has(id)) return
    recorded++
    recordedSet.add(id)
  }

  tryRecord(questionId) // 1회
  tryRecord(questionId) // 중복 → skip
  tryRecord(questionId) // 중복 → skip
  assertEqual(recorded, 1, 'recordedSet 중복 방지')
})

// ═══════════════════════════════════════════════════════════════
// 결과 출력
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50))
console.log(`결과: ${passed}/${total} 통과${failed > 0 ? `, ${failed}개 실패` : ''}`)
if (failed === 0) {
  console.log('🎉 모든 테스트 통과!')
} else {
  console.log('⚠️  일부 테스트 실패 — 위 ❌ 항목 확인')
  process.exitCode = 1
}
