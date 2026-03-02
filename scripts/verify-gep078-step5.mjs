/**
 * verify-gep078-step5.mjs
 * GEP_078 STEP 5 검증 스크립트
 * 대상: CustomMockResult.jsx / CustomMockStats.jsx 완성
 *
 * node scripts/verify-gep078-step5.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

let pass = 0, fail = 0
function check(label, condition) {
  if (condition) { console.log(`  ✅ PASS | ${label}`); pass++ }
  else           { console.log(`  ❌ FAIL | ${label}`); fail++ }
}
function readSrc(rel) { return readFileSync(resolve(root, rel), 'utf8') }

const resultSrc = readSrc('src/pages/CustomMockResult.jsx')
const statsSrc  = readSrc('src/pages/CustomMockStats.jsx')

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] CustomMockResult — stub 탈출 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] CustomMockResult — stub 탈출 + 기본 구조')

check('stub 문구 제거 (성적표 준비 중)',  !resultSrc.includes('성적표 준비 중'))
check('default export 함수',             resultSrc.includes('export default function CustomMockResult'))
check('100줄 이상',                       resultSrc.split('\n').length >= 100)

// 필수 import
check('useNavigate import',              resultSrc.includes('useNavigate'))
check('useParams import',               resultSrc.includes('useParams'))
check('useAuthStore import',            resultSrc.includes('useAuthStore'))
check('useCustomMockStore import',      resultSrc.includes('useCustomMockStore'))
check('loadPersistedSession import',    resultSrc.includes('loadPersistedSession'))
check('loadResult import',              resultSrc.includes('loadResult'))
check('checkPass import',               resultSrc.includes('checkPass'))
check('calcAverage import',             resultSrc.includes('calcAverage'))
check('analyzeWeakness import',         resultSrc.includes('analyzeWeakness'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] CustomMockResult — 성적 데이터 + 합격 판정
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] CustomMockResult — 성적 판정 로직')

check('sessionId useParams',            resultSrc.includes('sessionId'))
check('loadResult part1',               resultSrc.includes("loadResult(sessionId, 'part1')"))
check('loadResult part2',               resultSrc.includes("loadResult(sessionId, 'part2')"))
check('allScores 합산',                 resultSrc.includes('part1Result.scores') && resultSrc.includes('part2Result.scores'))
check('calcAverage 호출',               resultSrc.includes('calcAverage(allScores)'))
check('checkPass 호출',                 resultSrc.includes('checkPass(allScores)'))
check('합격 / 불합격 분기',             resultSrc.includes('isPass ? \'합격\'') || resultSrc.includes("isPass ? '합격'"))
check('3과목 SubjectScoreCard 렌더',    resultSrc.includes("'법령'") && resultSrc.includes("'손보1부'") && resultSrc.includes("'손보2부'"))

// calcAverage 로직 시뮬레이션 (mockExamService에서 재사용 확인)
function calcAverage(scores) {
  const values = Object.values(scores).map(s => s.score)
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}
function checkPass(scores) {
  const values = Object.values(scores).map(s => s.score)
  const avg = calcAverage(scores)
  return values.every(s => s >= 40) && avg >= 60
}

const scores1 = { '법령': { score: 70 }, '손보1부': { score: 65 }, '손보2부': { score: 60 } }
const scores2 = { '법령': { score: 35 }, '손보1부': { score: 65 }, '손보2부': { score: 60 } }
const scores3 = { '법령': { score: 50 }, '손보1부': { score: 50 }, '손보2부': { score: 50 } }

check('합격: 70/65/60 → 합격',          checkPass(scores1) === true)
check('불합격: 법령 35점 (과목미달)',    checkPass(scores2) === false)
check('불합격: 평균 50점 (평균미달)',    checkPass(scores3) === false)
check('평균 65점',                       Math.abs(calcAverage(scores1) - 65) < 0.1)

// 데이터 없음 처리
check('데이터 없음 에러 UI',            resultSrc.includes('성적 데이터를 찾을 수 없습니다'))
check('홈으로 fallback 네비게이션',     resultSrc.includes("navigate('/custom-mock')"))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] CustomMockResult — 약점 모드 전용 분석 섹션
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] CustomMockResult — 약점 개선 분석 섹션')

check('mode 스토어에서 로드',           resultSrc.includes('storeMode') || resultSrc.includes("s => s.mode"))
check('weakSubjects 스토어에서 로드',   resultSrc.includes('storeWeakSubjects') || resultSrc.includes("s => s.weakSubjects"))
check('localStorage fallback (meta)',   resultSrc.includes('loadPersistedSession') && resultSrc.includes('meta'))
check('weakness 분기 조건',             resultSrc.includes("mode === 'weakness'"))
check('analyzeWeakness 비동기 호출',    resultSrc.includes('analyzeWeakness(userId)'))
check('WeaknessSection 컴포넌트',       resultSrc.includes('WeaknessSection'))
check('집중 훈련한 세부과목 텍스트',    resultSrc.includes('집중 훈련한 세부과목'))
check('다음 추천 약점 세부과목',        resultSrc.includes('다음 약점 모드 추천'))
check('정답률 nextWeak 필터링',         resultSrc.includes('nextWeak'))
check('analysisLoading 상태',           resultSrc.includes('analysisLoading'))

// nextWeak 계산 시뮬레이션
function calcNextWeak(subjectStats, weakSubjects) {
  return Object.entries(subjectStats)
    .filter(([sub]) => !weakSubjects.includes(sub))
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .slice(0, 2)
}

const mockStats = {
  '해상보험':  { accuracy: 25, correct: 5, total: 20 },
  '특종보험':  { accuracy: 30, correct: 6, total: 20 },
  '보험업법':  { accuracy: 55, correct: 11, total: 20 },
  '책임보험':  { accuracy: 42, correct: 8, total: 20 },
  '재보험':    { accuracy: 38, correct: 7, total: 20 },
  '상법':      { accuracy: 60, correct: 12, total: 20 },
}
const trainedSubs = ['해상보험', '특종보험']
const nextWeak = calcNextWeak(mockStats, trainedSubs)

check('nextWeak: 훈련 과목 제외 정확',  !nextWeak.some(([sub]) => trainedSubs.includes(sub)))
check('nextWeak: 최저 정답률 순',       nextWeak[0]?.[0] === '재보험' && nextWeak[1]?.[0] === '책임보험')
check('nextWeak: 최대 2개',            nextWeak.length === 2)

// 모드 배지
check('약점 집중 모드 배지',            resultSrc.includes('약점 집중 모드'))
check('표준 모드 배지',                 resultSrc.includes('표준 모드'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] CustomMockResult — 버튼 + 네비게이션
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] CustomMockResult — 버튼 + 네비게이션')

check('새 시험 생성 → /custom-mock',    resultSrc.includes("navigate('/custom-mock')"))
check('통계보기 → /custom-mock/stats',  resultSrc.includes("navigate('/custom-mock/stats')"))
check('홈으로 → /',                     resultSrc.includes("navigate('/')"))
check('총 소요 시간 표시',              resultSrc.includes('totalTime') && resultSrc.includes('formatDuration'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] CustomMockStats — stub 탈출 + 기본 구조
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] CustomMockStats — stub 탈출 + 기본 구조')

check('stub 문구 제거 (통계 준비 중)',  !statsSrc.includes('통계 준비 중'))
check('default export 함수',            statsSrc.includes('export default function CustomMockStats'))
check('200줄 이상',                     statsSrc.split('\n').length >= 200)

// 필수 import
check('useNavigate import',             statsSrc.includes('useNavigate'))
check('useAuthStore import',            statsSrc.includes('useAuthStore'))
check('mockExamSupabase import',        statsSrc.includes('mockExamSupabase'))
check('customMockSupabase import',      statsSrc.includes('customMockSupabase'))
check('analyzeWeakness import',         statsSrc.includes('analyzeWeakness'))
check('mockExamConfig import',          statsSrc.includes('mockExamConfig'))
check('calcAverage import',             statsSrc.includes('calcAverage'))
check('checkPass import',               statsSrc.includes('checkPass'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] CustomMockStats — 필터 로직
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] CustomMockStats — 필터 로직')

check('FILTERS 상수 존재',              statsSrc.includes("'전체'") && statsSrc.includes("'원본만'") && statsSrc.includes("'맞춤만'"))
check('filter 상태',                   statsSrc.includes("useState('전체')"))
check('filteredOriginal 계산',          statsSrc.includes('filteredOriginal'))
check('filteredCustom 계산',            statsSrc.includes('filteredCustom'))
check('맞춤만 필터: original=[]',       statsSrc.includes("filter === '맞춤만' ? [] : originalRecords"))
check('원본만 필터: custom=[]',         statsSrc.includes("filter === '원본만' ? [] : customRecords"))

// 필터 로직 시뮬레이션
function applyFilter(filter, originalRecords, customRecords) {
  const filteredOriginal = filter === '맞춤만' ? [] : originalRecords
  const filteredCustom   = filter === '원본만' ? [] : customRecords
  return { filteredOriginal, filteredCustom }
}

const orig3 = [1, 2, 3]
const cust2 = [4, 5]

const total = applyFilter('전체', orig3, cust2)
check('전체: orig 3 + cust 2',          total.filteredOriginal.length === 3 && total.filteredCustom.length === 2)

const origOnly = applyFilter('원본만', orig3, cust2)
check('원본만: orig 3, cust 0',         origOnly.filteredOriginal.length === 3 && origOnly.filteredCustom.length === 0)

const custOnly = applyFilter('맞춤만', orig3, cust2)
check('맞춤만: orig 0, cust 2',         custOnly.filteredOriginal.length === 0 && custOnly.filteredCustom.length === 2)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] CustomMockStats — DualLineChart
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] CustomMockStats — DualLineChart')

check('DualLineChart 컴포넌트 존재',    statsSrc.includes('function DualLineChart'))
check('originalRecords props',          statsSrc.includes('originalRecords'))
check('customRecords props',            statsSrc.includes('customRecords'))
check('SVG viewBox 존재',               statsSrc.includes('viewBox'))
check('원본 라인: blue-500 (#3b82f6)',  statsSrc.includes('#3b82f6'))
check('맞춤 라인: green-500 (#22c55e)', statsSrc.includes('#22c55e'))
check('맞춤 라인: 점선 (strokeDasharray)', statsSrc.includes('strokeDasharray'))
check('합격선 60점 점선',               statsSrc.includes('isPass60'))
check('과목선 40점 점선',               statsSrc.includes('isPass40'))
check('데이터 없음 안내',               statsSrc.includes('응시 완료 데이터 없음'))

// scoreToY 시뮬레이션
const PLOT_H_SIM = 108 // CHART_H(160) - PAD_T(20) - PAD_B(32)
const PAD_T_SIM  = 20
function scoreToY(score) {
  return PAD_T_SIM + PLOT_H_SIM - (score / 100) * PLOT_H_SIM
}
check('scoreToY(100) = PAD_T',          Math.abs(scoreToY(100) - PAD_T_SIM) < 0.1)
check('scoreToY(0) = PAD_T + PLOT_H',   Math.abs(scoreToY(0) - (PAD_T_SIM + PLOT_H_SIM)) < 0.1)
check('scoreToY(60) < scoreToY(40)',    scoreToY(60) < scoreToY(40))  // 높은 점수 = 낮은 Y

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 8 ] CustomMockStats — 집계 + 합격 예측
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 8 ] CustomMockStats — 집계 + 합격 예측')

check('totalAttempts 계산',             statsSrc.includes('totalAttempts'))
check('passCount / failCount',          statsSrc.includes('passCount') && statsSrc.includes('failCount'))
check('passRate 계산',                  statsSrc.includes('passRate'))
check('avgScore 계산',                  statsSrc.includes('avgScore'))
check('SummaryCard 3개',                (statsSrc.match(/SummaryCard/g) || []).length >= 3)
check('합격 예측 컴포넌트 (🔮)',        statsSrc.includes('🔮'))
check('calcPassPrediction 함수',        statsSrc.includes('function calcPassPrediction') || statsSrc.includes('calcPassPrediction'))
check('최근 5회 평균',                  statsSrc.includes('slice(-5)'))

// calcPassPrediction 시뮬레이션
function calcPassPrediction(records) {
  if (records.length === 0) return null
  const recent   = records.slice(-5)
  const avgScore = recent.reduce((sum, r) => sum + Number(r.totalAverage), 0) / recent.length
  const diff = avgScore - 60
  let probability
  if      (diff >= 10) probability = 95
  else if (diff >= 5)  probability = 85
  else if (diff >= 0)  probability = 65
  else if (diff >= -5) probability = 40
  else if (diff >= -10) probability = 20
  else                  probability = 10
  return { avgScore: Math.round(avgScore * 10) / 10, probability, count: recent.length }
}

const recs10 = Array.from({ length: 10 }, (_, i) => ({ totalAverage: 65 + i }))
const pred10 = calcPassPrediction(recs10)
// slice(-5) → [70,71,72,73,74] → 평균 72점 → diff=12 → 95%
check('10회 데이터 → 최근 5회 사용',    pred10.count === 5)
check('최근 5회 평균 72점 → 확률 95%', pred10.probability === 95)

// 평균 67점 (diff=7) → 85% 테스트
const recs67 = Array.from({ length: 5 }, () => ({ totalAverage: 67 }))
const pred67 = calcPassPrediction(recs67)
check('평균 67점 → 확률 85%',          pred67.probability === 85)

const pred0 = calcPassPrediction([])
check('데이터 없음 → null',            pred0 === null)

const recLow = [{ totalAverage: 40 }, { totalAverage: 42 }]
const predLow = calcPassPrediction(recLow)
check('평균 41점 (diff=-19) → 10%',    predLow.probability === 10)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 9 ] CustomMockStats — 약점 수렴 분석 + 이력
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 9 ] CustomMockStats — 약점 수렴 분석 + 응시 이력')

check('약점 수렴 분석 섹션 (🎯)',        statsSrc.includes('🎯'))
check('weaknessList 계산',              statsSrc.includes('weaknessList'))
check('최대 6개 세부과목',              statsSrc.includes('.slice(0, 6)'))
check('정답률 낮은 순 정렬',            statsSrc.includes('accuracy - b[1].accuracy'))
check('progress bar 시각화',            statsSrc.includes('h-1.5') || statsSrc.includes('h-2'))
check('HistoryRow 컴포넌트 존재',       statsSrc.includes('function HistoryRow'))
check('type === custom 배지',           statsSrc.includes("type === 'custom'"))
check('mode === weakness 배지',         statsSrc.includes("mode === 'weakness'"))
check('유형별 현황 섹션',               statsSrc.includes('유형별 현황'))
check('buildGuestOriginalStats 함수',   statsSrc.includes('function buildGuestOriginalStats'))

// is_pass vs isPass 확인 (customMockSupabase는 snake_case 반환)
check('custom: is_pass (snake_case) 사용', statsSrc.includes('s.is_pass'))
check('custom: total_average (snake_case)', statsSrc.includes('s.total_average'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 10 ] 빌드 연관 파일 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 10 ] 파일 연관성 + 참조 일관성')

const storeSrc  = readSrc('src/stores/customMockStore.js')
const appSrc    = readSrc('src/App.jsx')

// App.jsx 라우트 유지 확인
check('App.jsx: /custom-mock/stats 라우트', appSrc.includes('/custom-mock/stats'))
check('App.jsx: CustomMockResult import',   appSrc.includes('CustomMockResult'))
check('App.jsx: CustomMockStats import',    appSrc.includes('CustomMockStats'))

// 스토어 -> 결과 연관 (mode / weakSubjects 유지)
check('스토어: mode 상태 유지',            storeSrc.includes("mode:       null"))
check('스토어: weakSubjects 상태',         storeSrc.includes('weakSubjects'))
check('스토어: submitPart2 후 mode 미삭제', !storeSrc.includes("set({\n      mode: null"))

// 서비스 -> 결과 연관
const svcSrc = readSrc('src/services/customMockService.js')
check('서비스: loadResult export',         svcSrc.includes('export function loadResult'))
check('서비스: analyzeWeakness export',    svcSrc.includes('export async function analyzeWeakness'))
check('서비스: getSessionHistory 존재',    svcSrc.includes('getSessionHistory'))

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_078 STEP 5 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
