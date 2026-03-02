/**
 * verify-gep070-step1.mjs
 * GEP_070 STEP 1 검증 스크립트
 * 대상: customMockConfig.js + customMockService.js 핵심 로직
 *
 * node scripts/verify-gep070-step1.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── 카운터 ─────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0
function check(label, condition) {
  if (condition) { console.log(`  ✅ PASS | ${label}`); pass++ }
  else           { console.log(`  ❌ FAIL | ${label}`); fail++ }
}

// ── 핵심 로직 인라인 (browser import 없이) ─────────────────────────────────────

// customMockConfig 직접 파싱
const configSrc = readFileSync(resolve(__dir, '../src/config/customMockConfig.js'), 'utf8')
// export const customMockConfig = { ... } 를 eval로 추출
const configObj = eval(
  configSrc
    .replace(/export const customMockConfig =/, 'const customMockConfig =')
    .replace(/export default.*/, '')
    + '\ncustomMockConfig'
)

// customMockService 핵심 로직 인라인
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomPick(pool, count) {
  if (pool.length === 0) return []
  if (pool.length >= count) return shuffle(pool).slice(0, count)
  const result = []
  while (result.length < count) {
    const need = count - result.length
    result.push(...shuffle(pool).slice(0, Math.min(need, pool.length)))
  }
  return result
}

function calcAllocation(subSubjects, weakSubjects, totalCount, weakWeightMultiplier = 2) {
  const weights = subSubjects.map(s => weakSubjects.includes(s) ? weakWeightMultiplier : 1)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const allocs = weights.map(w => Math.floor((w / totalWeight) * totalCount))
  const remainder = totalCount - allocs.reduce((a, b) => a + b, 0)
  const fracs = weights
    .map((w, i) => ({ i, frac: (w / totalWeight) * totalCount - allocs[i] }))
    .sort((a, b) => b.frac - a.frac)
  for (let r = 0; r < remainder; r++) allocs[fracs[r].i]++
  const result = {}
  subSubjects.forEach((sub, i) => { result[sub] = allocs[i] })
  return result
}

// exams.json 로드
const examsData = JSON.parse(readFileSync(resolve(__dir, '../public/data/exams.json'), 'utf8'))
const allQuestions = examsData.questions

// 문제 생성 시뮬레이션 (generateQuestions 동기 버전)
function simulateGenerate(mode, weakSubjects = []) {
  const { distribution, MODES, weakness } = configObj
  const part1 = [], part2s1 = [], part2s2 = []

  for (const [subject, { count, subSubjects }] of Object.entries(distribution)) {
    const allocation = calcAllocation(subSubjects, weakSubjects, count, weakness.weakWeightMultiplier)
    for (const [sub, needed] of Object.entries(allocation)) {
      if (needed === 0) continue
      const pool = allQuestions.filter(q => q.subject === subject && q.subSubject === sub)
      const picks = randomPick(pool, needed)
      if (subject === '법령')    part1.push(...picks)
      if (subject === '손보1부') part2s1.push(...picks)
      if (subject === '손보2부') part2s2.push(...picks)
    }
  }
  return [...shuffle(part1), ...shuffle(part2s1), ...shuffle(part2s2)]
}

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] customMockConfig 구조 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] customMockConfig 구조 검증')

check('MODES.STANDARD = "standard"', configObj.MODES.STANDARD === 'standard')
check('MODES.WEAKNESS = "weakness"', configObj.MODES.WEAKNESS === 'weakness')
check('TIMER_TYPES.FULL = "full"',   configObj.TIMER_TYPES.FULL === 'full')
check('TIMER_TYPES.SHORT = "short"', configObj.TIMER_TYPES.SHORT === 'short')

check('timers.full.part1 = 2400초 (40분)',  configObj.timers.full.part1  === 40 * 60)
check('timers.full.part2 = 4800초 (80분)',  configObj.timers.full.part2  === 80 * 60)
check('timers.short.part1 = 1920초 (32분)', configObj.timers.short.part1 === 32 * 60)
check('timers.short.part2 = 3840초 (64분)', configObj.timers.short.part2 === 64 * 60)

check('distribution 과목 3개',         Object.keys(configObj.distribution).length === 3)
check('법령 배분 40문제',               configObj.distribution['법령'].count === 40)
check('손보1부 배분 40문제',            configObj.distribution['손보1부'].count === 40)
check('손보2부 배분 40문제',            configObj.distribution['손보2부'].count === 40)
check('법령 세부과목 4개',              configObj.distribution['법령'].subSubjects.length === 4)
check('손보1부 세부과목 4개',           configObj.distribution['손보1부'].subSubjects.length === 4)
check('손보2부 세부과목 4개',           configObj.distribution['손보2부'].subSubjects.length === 4)
check('subjectMap S1~S12 = 12개',       Object.keys(configObj.subjectMap).length === 12)
check('weakness.minAttempts = 10',      configObj.weakness.minAttempts === 10)
check('weakness.topWeakCount = 3',      configObj.weakness.topWeakCount === 3)
check('weakness.weakWeightMultiplier = 2', configObj.weakness.weakWeightMultiplier === 2)
check('minLevel = 5',                   configObj.minLevel === 5)
check('studyMode = "custom_mock"',      configObj.studyMode === 'custom_mock')

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] S1~S12 매핑 정합성 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] S1~S12 매핑 정합성 검증')

const allSubKeys = Object.values(configObj.subjectMap).map(v => v.key)
const distribSubKeys = Object.values(configObj.distribution).flatMap(d => d.subSubjects)

check('subjectMap의 모든 key가 distribution에 존재',
  allSubKeys.every(k => distribSubKeys.includes(k)))

check('distribution의 모든 세부과목이 subjectMap에 존재',
  distribSubKeys.every(k => allSubKeys.includes(k)))

check('exams.json subSubjects와 distribution 세부과목 일치',
  distribSubKeys.every(k => examsData.subSubjects.includes(k)))

// S1~S12 parent 검증
const parentMap = {
  S1: '법령', S2: '법령', S3: '법령', S4: '법령',
  S5: '손보1부', S6: '손보1부', S7: '손보1부', S8: '손보1부',
  S9: '손보2부', S10: '손보2부', S11: '손보2부', S12: '손보2부',
}
const parentOk = Object.entries(parentMap).every(
  ([s, p]) => configObj.subjectMap[s]?.parent === p
)
check('S1~S12 parent 매핑 정확', parentOk)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] calcAllocation — 표준 모드 (약점 없음)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] calcAllocation — 표준 모드 (균등 분배)')

const lawSubs = ['보험업법', '상법', '위험관리', '세제재무']
const stdAlloc = calcAllocation(lawSubs, [], 40)

check('표준 모드: 할당 합계 = 40',       Object.values(stdAlloc).reduce((a, b) => a + b, 0) === 40)
check('표준 모드: 보험업법 = 10',        stdAlloc['보험업법'] === 10)
check('표준 모드: 상법 = 10',            stdAlloc['상법'] === 10)
check('표준 모드: 위험관리 = 10',        stdAlloc['위험관리'] === 10)
check('표준 모드: 세제재무 = 10',        stdAlloc['세제재무'] === 10)

// 손보1부 균등 분배
const p1Subs = ['자동차보험', '특종보험', '보증보험', '연금저축']
const p1Alloc = calcAllocation(p1Subs, [], 40)
check('손보1부 표준 모드: 합계 = 40',    Object.values(p1Alloc).reduce((a, b) => a + b, 0) === 40)
check('손보1부 표준 모드: 균등 10씩',    Object.values(p1Alloc).every(v => v === 10))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] calcAllocation — 약점 모드 (1개 약점)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] calcAllocation — 약점 모드 (법령 중 1개 약점)')

// 보험업법이 약점: 가중치 2 / 나머지 1 → 총 5w=40 → w=8, 보험업법=16
const weak1 = calcAllocation(lawSubs, ['보험업법'], 40)
check('약점1개: 합계 = 40',              Object.values(weak1).reduce((a, b) => a + b, 0) === 40)
check('약점1개: 보험업법 > 나머지 각각', weak1['보험업법'] > weak1['상법'])
check('약점1개: 보험업법 = 16',          weak1['보험업법'] === 16)
check('약점1개: 나머지 = 8씩',           weak1['상법'] === 8 && weak1['위험관리'] === 8 && weak1['세제재무'] === 8)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] calcAllocation — 약점 모드 (2개 약점)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] calcAllocation — 약점 모드 (법령 중 2개 약점)')

// 보험업법+상법 약점: 가중치 2+2+1+1=6w → w=40/6≈6.67
const weak2 = calcAllocation(lawSubs, ['보험업법', '상법'], 40)
check('약점2개: 합계 = 40',              Object.values(weak2).reduce((a, b) => a + b, 0) === 40)
check('약점2개: 약점 과목이 일반 과목보다 큼',
  weak2['보험업법'] > weak2['위험관리'] && weak2['상법'] > weak2['위험관리'])

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] 표준 모드 — 전체 생성 (120문제, 과목별 40)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] 표준 모드 — 120문제 생성')

const std = simulateGenerate('standard', [])
const stdLaw  = std.filter(q => q.subject === '법령')
const stdP1   = std.filter(q => q.subject === '손보1부')
const stdP2   = std.filter(q => q.subject === '손보2부')

check('표준 모드: 총 120문제',           std.length === 120)
check('표준 모드: 법령 40문제',          stdLaw.length === 40)
check('표준 모드: 손보1부 40문제',       stdP1.length === 40)
check('표준 모드: 손보2부 40문제',       stdP2.length === 40)

// 법령 순서 검증: 0~39번이 전부 법령
check('표준 모드: 앞 40개가 법령',       std.slice(0, 40).every(q => q.subject === '법령'))
check('표준 모드: 40~79번이 손보1부',    std.slice(40, 80).every(q => q.subject === '손보1부'))
check('표준 모드: 80~119번이 손보2부',   std.slice(80, 120).every(q => q.subject === '손보2부'))

// 중복 ID 검증
const stdIds = std.map(q => q.id)
const stdUniq = new Set(stdIds)
check('표준 모드: 중복 문제 0개',        stdUniq.size === std.length)

// 모든 문제에 필수 필드 존재
check('표준 모드: 모든 문제에 id 존재',  std.every(q => q.id))
check('표준 모드: 모든 문제에 answer 존재', std.every(q => q.answer != null))
check('표준 모드: 모든 문제에 subSubject 존재', std.every(q => q.subSubject))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] 약점 모드 — 약점 세부과목 비중 증가 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] 약점 모드 — 약점 세부과목 비중 증가 확인')

// 해상보험·특종보험·보험업법 약점 가정
const weakSubjects = ['해상보험', '특종보험', '보험업법']

// 10회 반복으로 통계적 안정성 확인
const weakCounts = { '해상보험': 0, '특종보험': 0, '보험업법': 0,
                     '화재보험': 0, '자동차보험': 0, '상법': 0 }
const TRIALS = 10
for (let t = 0; t < TRIALS; t++) {
  const wq = simulateGenerate('weakness', weakSubjects)
  wq.forEach(q => {
    if (weakCounts[q.subSubject] !== undefined) weakCounts[q.subSubject]++
  })
}

// 약점 과목 평균 > 일반 과목 평균
const avgWeak = (weakCounts['해상보험'] + weakCounts['특종보험'] + weakCounts['보험업법']) / 3
const avgNorm = (weakCounts['화재보험'] + weakCounts['자동차보험'] + weakCounts['상법']) / 3

check(`약점 모드: 약점 과목 평균(${(avgWeak/TRIALS).toFixed(1)}) > 일반 과목 평균(${(avgNorm/TRIALS).toFixed(1)})`,
  avgWeak > avgNorm)

// 단일 실행으로 총 120문제 확인
const weakQ = simulateGenerate('weakness', weakSubjects)
check('약점 모드: 총 120문제',           weakQ.length === 120)
check('약점 모드: 법령 40문제',          weakQ.filter(q => q.subject === '법령').length === 40)
check('약점 모드: 손보1부 40문제',       weakQ.filter(q => q.subject === '손보1부').length === 40)
check('약점 모드: 손보2부 40문제',       weakQ.filter(q => q.subject === '손보2부').length === 40)

// 중복 검증
const weakIds = weakQ.map(q => q.id)
check('약점 모드: 중복 문제 0개',        new Set(weakIds).size === weakQ.length)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 8 ] randomPick 엣지 케이스
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 8 ] randomPick 엣지 케이스')

check('빈 pool → 빈 배열',              randomPick([], 10).length === 0)
check('pool=5, count=5 → 5개',          randomPick([1,2,3,4,5], 5).length === 5)
check('pool=5, count=3 → 3개',          randomPick([1,2,3,4,5], 3).length === 3)
check('pool=3, count=10 → 10개 (중복 허용)', randomPick([1,2,3], 10).length === 10)
check('pool=1, count=5 → 5개 (중복 허용)',   randomPick(['a'], 5).length === 5)
check('pool=1, count=5 → 모두 같은 값',  randomPick(['a'], 5).every(v => v === 'a'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 9 ] exams.json 풀 규모 확인 (각 세부과목 >= 10)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 9 ] exams.json 풀 규모 — 표준 모드 충분 여부')

const allSubs = Object.values(configObj.distribution).flatMap(d => d.subSubjects)
let allPoolOk = true
for (const parent of ['법령', '손보1부', '손보2부']) {
  const subs = configObj.distribution[parent].subSubjects
  for (const sub of subs) {
    const cnt = allQuestions.filter(q => q.subject === parent && q.subSubject === sub).length
    check(`${parent}/${sub}: 풀 ${cnt}문제 (≥10 필요)`, cnt >= 10)
    if (cnt < 10) allPoolOk = false
  }
}
check('모든 세부과목 풀 10문제 이상 보유', allPoolOk)

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_070 STEP 1 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
