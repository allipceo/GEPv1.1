/**
 * verify-gep095-step1.mjs
 * GEP_095 Phase 6-3 STEP 1 — unifiedWrongService.js 검증
 *
 * 브라우저/Supabase 없이 핵심 로직 인라인 시뮬레이션
 * node scripts/verify-gep095-step1.mjs
 */

// ── 인라인 시뮬레이션: unifiedWrongService 핵심 로직 ─────────────────────────

const CACHE_TTL_MS    = 60 * 60 * 1000
const STATS_CACHE_KEY = 'gep:unified_wrong_stats'

function cacheKey(userId) {
  return `gep:unified_wrong:${userId}`
}

// localStorage/sessionStorage 메모리 시뮬레이션
const _localStorage    = {}
const _sessionStorage  = {}
const localStorage = {
  getItem:    k => _localStorage[k] ?? null,
  setItem:    (k, v) => { _localStorage[k] = v },
  removeItem: k => { delete _localStorage[k] },
}
const sessionStorage = {
  getItem:    k => _sessionStorage[k] ?? null,
  setItem:    (k, v) => { _sessionStorage[k] = v },
  removeItem: k => { delete _sessionStorage[k] },
}

// getCachedWrongQuestions (인라인)
function getCachedWrongQuestions(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const { timestamp, data } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

// invalidateCache (인라인)
function invalidateCache(userId) {
  try { localStorage.removeItem(cacheKey(userId)) }  catch (_) {}
  try { sessionStorage.removeItem(STATS_CACHE_KEY) } catch (_) {}
}

// calculateWrongCountStats (인라인)
function calculateWrongCountStats(questions) {
  const list = questions ?? []
  try {
    const raw = sessionStorage.getItem(STATS_CACHE_KEY)
    if (raw) {
      const { count, dist } = JSON.parse(raw)
      if (count === list.length) return dist
    }
  } catch (_) {}

  const dist = { '6+': 0, '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  for (const q of list) {
    const c = q.wrong_count ?? 1
    if      (c >= 6)  dist['6+']++
    else if (c === 5) dist['5']++
    else if (c === 4) dist['4']++
    else if (c === 3) dist['3']++
    else if (c === 2) dist['2']++
    else              dist['1']++
  }
  try {
    sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ count: list.length, dist }))
  } catch (_) {}
  return dist
}

// filterByWrongCount (인라인)
function filterByWrongCount(questions, minCount) {
  if (!questions?.length) return []
  if (!minCount || minCount <= 1) return questions
  return questions.filter(q => (q.wrong_count ?? 1) >= minCount)
}

// fetchAllWrongQuestions 클라이언트 병합 로직 (인라인 — Supabase 없이 시뮬레이션)
function clientMerge(mcqData, oxData, mockData, customData) {
  const mcqItems = (mcqData ?? []).map(q => ({
    id:          q.question_id,
    source:      'MCQ',
    wrong_count: q.wrong_count ?? 1,
  }))
  const oxItems = (oxData ?? []).map(q => ({
    id:          q.question_id,
    source:      'OX',
    wrong_count: q.wrong_count ?? 1,
  }))

  const mockCounts = {}
  for (const row of (mockData ?? [])) {
    mockCounts[row.question_id] = (mockCounts[row.question_id] ?? 0) + 1
  }
  const mockItems = Object.entries(mockCounts).map(([id, count]) => ({
    id, source: 'MOCK', wrong_count: count,
  }))

  const customCounts = {}
  for (const row of (customData ?? [])) {
    customCounts[row.question_id] = (customCounts[row.question_id] ?? 0) + 1
  }
  const customItems = Object.entries(customCounts).map(([id, count]) => ({
    id, source: 'CUSTOM', wrong_count: count,
  }))

  return [...mcqItems, ...oxItems, ...mockItems, ...customItems]
    .sort((a, b) => b.wrong_count - a.wrong_count)
}

// reclassifyResults 분류 로직 (인라인 — Supabase 없이)
function classifyResults(results) {
  return {
    mcqCorrect: results.filter(r => r.source === 'MCQ' && r.isCorrect).map(r => r.id),
    mcqWrong:   results.filter(r => r.source === 'MCQ' && !r.isCorrect).map(r => r.id),
    oxCorrect:  results.filter(r => r.source === 'OX'  && r.isCorrect).map(r => r.id),
    oxWrong:    results.filter(r => r.source === 'OX'  && !r.isCorrect).map(r => r.id),
  }
}

// ── 테스트 유틸 ───────────────────────────────────────────────────────────────

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

// ── 시나리오 1: getCachedWrongQuestions — 캐시 없음 ─────────────────────────
console.log('\n[ 시나리오 1 ] getCachedWrongQuestions — 캐시 없음')
check('userId 없으면 null', getCachedWrongQuestions(null) === null)
check('캐시 없으면 null', getCachedWrongQuestions('user-1') === null)

// ── 시나리오 2: getCachedWrongQuestions — 캐시 히트/만료 ────────────────────
console.log('\n[ 시나리오 2 ] getCachedWrongQuestions — 캐시 히트 / TTL 만료')
{
  const userId = 'user-2'
  const testData = [{ id: 'Q1', source: 'MCQ', wrong_count: 3 }]

  // 유효 캐시 저장
  localStorage.setItem(cacheKey(userId), JSON.stringify({
    timestamp: Date.now(),
    data:      testData,
  }))
  const hit = getCachedWrongQuestions(userId)
  check('캐시 히트 시 데이터 반환', Array.isArray(hit) && hit.length === 1)
  check('캐시 히트 데이터 정확성', hit[0].id === 'Q1' && hit[0].wrong_count === 3)

  // 만료된 캐시 저장 (2시간 전)
  localStorage.setItem(cacheKey(userId), JSON.stringify({
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    data:      testData,
  }))
  check('TTL 만료 시 null', getCachedWrongQuestions(userId) === null)
}

// ── 시나리오 3: clientMerge — 4개 소스 병합 ────────────────────────────────
console.log('\n[ 시나리오 3 ] clientMerge — 4개 소스 병합 + 정렬')
{
  const mcqData    = [{ question_id: 'MCQ-A', wrong_count: 5 }, { question_id: 'MCQ-B', wrong_count: 2 }]
  const oxData     = [{ question_id: 'OX-A', wrong_count: 3 }]
  const mockData   = [
    { question_id: 'MOCK-A' }, { question_id: 'MOCK-A' }, { question_id: 'MOCK-B' },
  ]
  const customData = [{ question_id: 'CUSTOM-A' }, { question_id: 'CUSTOM-A' }]

  const merged = clientMerge(mcqData, oxData, mockData, customData)

  check('총 아이템 수 = 6 (MCQ2+OX1+MOCK2+CUSTOM1)', merged.length === 6)
  check('첫 번째 = wrong_count 최대값 (MCQ-A=5)', merged[0].id === 'MCQ-A' && merged[0].wrong_count === 5)
  check('MCQ source 태그', merged.find(m => m.id === 'MCQ-A')?.source === 'MCQ')
  check('OX source 태그', merged.find(m => m.id === 'OX-A')?.source === 'OX')
  check('MOCK 집계 (MOCK-A 2회)', merged.find(m => m.id === 'MOCK-A')?.wrong_count === 2)
  check('MOCK 집계 (MOCK-B 1회)', merged.find(m => m.id === 'MOCK-B')?.wrong_count === 1)
  check('CUSTOM 집계 (CUSTOM-A 2회)', merged.find(m => m.id === 'CUSTOM-A')?.wrong_count === 2)
  check('내림차순 정렬 (1등 wrong_count ≥ 2등)', merged[0].wrong_count >= merged[1].wrong_count)
  check('내림차순 정렬 (2등 wrong_count ≥ 3등)', merged[1].wrong_count >= merged[2].wrong_count)
}

// ── 시나리오 4: clientMerge — 엣지 케이스 ──────────────────────────────────
console.log('\n[ 시나리오 4 ] clientMerge — 엣지 케이스')
{
  check('전체 빈 배열 → 빈 결과', clientMerge([], [], [], []).length === 0)
  check('null 입력 허용', clientMerge(null, null, null, null).length === 0)

  // wrong_count 기본값 1
  const noCount = clientMerge([{ question_id: 'Q1' }], [], [], [])
  check('wrong_count 없으면 기본값 1', noCount[0].wrong_count === 1)
}

// ── 시나리오 5: calculateWrongCountStats ────────────────────────────────────
console.log('\n[ 시나리오 5 ] calculateWrongCountStats — 분포 계산')
{
  const questions = [
    { id: '1', wrong_count: 7 },
    { id: '2', wrong_count: 6 },
    { id: '3', wrong_count: 5 },
    { id: '4', wrong_count: 4 },
    { id: '5', wrong_count: 3 },
    { id: '6', wrong_count: 3 },
    { id: '7', wrong_count: 2 },
    { id: '8', wrong_count: 1 },
    { id: '9', wrong_count: 1 },
    { id: '10', wrong_count: 1 },
  ]
  const dist = calculateWrongCountStats(questions)

  check("6+ 분포 = 2 (7회, 6회)", dist['6+'] === 2)
  check("5 분포 = 1",  dist['5']  === 1)
  check("4 분포 = 1",  dist['4']  === 1)
  check("3 분포 = 2",  dist['3']  === 2)
  check("2 분포 = 1",  dist['2']  === 1)
  check("1 분포 = 3",  dist['1']  === 3)
  check("총합 = 10",   Object.values(dist).reduce((a, b) => a + b, 0) === 10)
}

// ── 시나리오 6: calculateWrongCountStats — sessionStorage 캐시 ──────────────
console.log('\n[ 시나리오 6 ] calculateWrongCountStats — sessionStorage 캐시')
{
  // 기존 캐시 클리어
  sessionStorage.removeItem(STATS_CACHE_KEY)

  const q1 = [{ id: 'A', wrong_count: 3 }, { id: 'B', wrong_count: 1 }]
  const dist1 = calculateWrongCountStats(q1)  // 캐시 저장됨

  // 같은 개수 → 캐시 히트
  const dist2 = calculateWrongCountStats(q1)
  check('캐시 히트 동일 객체(3분포)', dist1['3'] === dist2['3'])

  // 개수 변경 → 캐시 미스
  const q2 = [{ id: 'A', wrong_count: 2 }]
  const dist3 = calculateWrongCountStats(q2)
  check('개수 변경 시 재계산(2분포=1)', dist3['2'] === 1)
}

// ── 시나리오 7: calculateWrongCountStats — 빈 배열 ──────────────────────────
console.log('\n[ 시나리오 7 ] calculateWrongCountStats — 빈 / null')
{
  sessionStorage.removeItem(STATS_CACHE_KEY)
  const dist = calculateWrongCountStats([])
  check('빈 배열 → 모두 0', Object.values(dist).every(v => v === 0))
  const distNull = calculateWrongCountStats(null)
  check('null → 모두 0', Object.values(distNull).every(v => v === 0))
}

// ── 시나리오 8: filterByWrongCount ──────────────────────────────────────────
console.log('\n[ 시나리오 8 ] filterByWrongCount — N회 이상 필터')
{
  const questions = [
    { id: '1', wrong_count: 5 },
    { id: '2', wrong_count: 3 },
    { id: '3', wrong_count: 2 },
    { id: '4', wrong_count: 1 },
  ]

  check('minCount=1 → 전체 반환 (4개)',      filterByWrongCount(questions, 1).length === 4)
  check('minCount=0 → 전체 반환 (4개)',      filterByWrongCount(questions, 0).length === 4)
  check('minCount=3 → 3회 이상 (2개)',       filterByWrongCount(questions, 3).length === 2)
  check('minCount=5 → 5회 이상 (1개)',       filterByWrongCount(questions, 5).length === 1)
  check('minCount=6 → 6회 이상 (0개)',       filterByWrongCount(questions, 6).length === 0)
  check('빈 배열 → 빈 배열',                 filterByWrongCount([], 3).length === 0)
  check('null → 빈 배열',                    filterByWrongCount(null, 3).length === 0)
}

// ── 시나리오 9: classifyResults — reclassifyResults 분류 로직 ────────────────
console.log('\n[ 시나리오 9 ] classifyResults — reclassifyResults 입력 분류')
{
  const results = [
    { id: 'MCQ-1', source: 'MCQ', isCorrect: true  },
    { id: 'MCQ-2', source: 'MCQ', isCorrect: false },
    { id: 'OX-1',  source: 'OX',  isCorrect: true  },
    { id: 'OX-2',  source: 'OX',  isCorrect: false },
    { id: 'MOCK-1', source: 'MOCK', isCorrect: true  }, // MOCK → skip
    { id: 'CUSTOM-1', source: 'CUSTOM', isCorrect: false }, // CUSTOM → skip
  ]
  const { mcqCorrect, mcqWrong, oxCorrect, oxWrong } = classifyResults(results)

  check('MCQ 정답 1개', mcqCorrect.length === 1 && mcqCorrect[0] === 'MCQ-1')
  check('MCQ 오답 1개', mcqWrong.length === 1   && mcqWrong[0]  === 'MCQ-2')
  check('OX 정답 1개',  oxCorrect.length === 1  && oxCorrect[0] === 'OX-1')
  check('OX 오답 1개',  oxWrong.length === 1    && oxWrong[0]   === 'OX-2')
  check('MOCK/CUSTOM skip (mcqCorrect에 없음)', !mcqCorrect.includes('MOCK-1'))
}

// ── 시나리오 10: classifyResults — 빈/엣지 케이스 ────────────────────────────
console.log('\n[ 시나리오 10 ] classifyResults — 빈 / 전체 정답 / 전체 오답')
{
  const { mcqCorrect: c1, mcqWrong: w1 } = classifyResults([])
  check('빈 results → 모든 배열 0', c1.length === 0 && w1.length === 0)

  const allCorrect = [
    { id: 'MCQ-A', source: 'MCQ', isCorrect: true },
    { id: 'MCQ-B', source: 'MCQ', isCorrect: true },
  ]
  const { mcqCorrect: c2, mcqWrong: w2 } = classifyResults(allCorrect)
  check('전체 정답 → mcqCorrect=2, mcqWrong=0', c2.length === 2 && w2.length === 0)

  const allWrong = [
    { id: 'OX-A', source: 'OX', isCorrect: false },
    { id: 'OX-B', source: 'OX', isCorrect: false },
  ]
  const { oxCorrect: c3, oxWrong: w3 } = classifyResults(allWrong)
  check('전체 오답 → oxCorrect=0, oxWrong=2', c3.length === 0 && w3.length === 2)
}

// ── 시나리오 11: invalidateCache ─────────────────────────────────────────────
console.log('\n[ 시나리오 11 ] invalidateCache — 캐시 무효화')
{
  const userId = 'user-inv'
  localStorage.setItem(cacheKey(userId), JSON.stringify({ timestamp: Date.now(), data: [1, 2, 3] }))
  sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ count: 3, dist: {} }))

  check('무효화 전 캐시 존재', getCachedWrongQuestions(userId) !== null)
  check('무효화 전 stats 캐시 존재', sessionStorage.getItem(STATS_CACHE_KEY) !== null)

  invalidateCache(userId)

  check('무효화 후 캐시 null', getCachedWrongQuestions(userId) === null)
  check('무효화 후 stats 캐시 null', sessionStorage.getItem(STATS_CACHE_KEY) === null)
}

// ── 시나리오 12: 파일 구조 검증 ──────────────────────────────────────────────
console.log('\n[ 시나리오 12 ] 파일 구조 — 함수 export 확인')
{
  import('fs').then(fs => {
    const src = fs.readFileSync('src/services/unifiedWrongService.js', 'utf8')

    check('fetchAllWrongQuestions export',    src.includes('export async function fetchAllWrongQuestions'))
    check('getCachedWrongQuestions export',   src.includes('export function getCachedWrongQuestions'))
    check('calculateWrongCountStats export',  src.includes('export function calculateWrongCountStats'))
    check('reclassifyResults export',         src.includes('export async function reclassifyResults'))
    check('filterByWrongCount export',        src.includes('export function filterByWrongCount'))
    check('CACHE_TTL_MS = 1시간',             src.includes('60 * 60 * 1000'))
    check('localStorage TTL 캐시 저장',       src.includes("cacheKey(userId), JSON.stringify"))
    check('Promise.all 4-fetch',              src.includes("Promise.all(["))
    check('wrong_questions 조회',             src.includes("from('wrong_questions')"))
    check('ox_wrong_questions 조회',          src.includes("from('ox_wrong_questions')"))
    check('mock_exam_attempts 조회',          src.includes("from('mock_exam_attempts')"))
    check('custom_mock_attempts 조회',        src.includes("from('custom_mock_attempts')"))
    check('is_correct=false 필터',            src.includes(".eq('is_correct', false)"))
    check('wrong_count 내림차순 정렬',        src.includes('b.wrong_count - a.wrong_count'))
    check('sessionStorage stats 캐시',        src.includes('STATS_CACHE_KEY'))
    check('invalidateCache 함수',             src.includes('function invalidateCache'))
    check('supabase import',                  src.includes("from '../lib/supabase'"))

    // 최종 결과 출력
    console.log(`\n${'='.repeat(50)}`)
    console.log(`  결과: ${pass} PASS / ${fail} FAIL`)
    console.log('='.repeat(50))
    process.exit(fail === 0 ? 0 : 1)
  })
}
