/**
 * verify-gep088-step3.mjs
 * GEP_088 STEP 3 검증 스크립트
 * 대상: CustomMockStats.jsx, MockExamStats.jsx 통합
 *
 * node scripts/verify-gep088-step3.mjs
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

// ─────────────────────────────────────────────────────────────────────────────
// 핵심 로직 인라인 시뮬레이션
// ─────────────────────────────────────────────────────────────────────────────

// buildSyntheticAttempts 시뮬레이션
function buildSyntheticAttempts(weaknessAnalysis) {
  if (!weaknessAnalysis?.subjectStats) return []
  return Object.entries(weaknessAnalysis.subjectStats).flatMap(([sub, stat]) => [
    ...Array.from({ length: stat.correct              }, () => ({ sub_subject: sub, is_correct: true  })),
    ...Array.from({ length: stat.total - stat.correct }, () => ({ sub_subject: sub, is_correct: false })),
  ])
}

// 레이아웃 순서 검증용 헬퍼 (소스에서 출현 순서 확인)
function indexOrder(src, patterns) {
  return patterns.map(p => ({ p, idx: src.indexOf(p) }))
}

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 0 ] 파일 구조 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 0 ] 파일 구조 확인')

const customSrc = readSrc('src/pages/CustomMockStats.jsx')
const mockSrc   = readSrc('src/pages/MockExamStats.jsx')

check('CustomMockStats.jsx 읽기 성공',   customSrc.length > 0)
check('MockExamStats.jsx 읽기 성공',     mockSrc.length   > 0)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] CustomMockStats — import 추가 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] CustomMockStats — import 확인')

check('PredictionCard import',           customSrc.includes("import PredictionCard"))
check('PassProbabilityCard import',      customSrc.includes("import PassProbabilityCard"))
check('WeaknessHeatmap import',          customSrc.includes("import WeaknessHeatmap"))
check('DifficultyAnalysis import',       customSrc.includes("import DifficultyAnalysis"))
check('StudyRoadmap import',             customSrc.includes("import StudyRoadmap"))
check('stats/ 경로 참조',               customSrc.includes("'../components/stats/"))
check('기존 mockExamSupabase import 유지', customSrc.includes('mockExamSupabase'))
check('기존 customMockSupabase import 유지', customSrc.includes('customMockSupabase'))
check('기존 analyzeWeakness import 유지', customSrc.includes('analyzeWeakness'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] CustomMockStats — 신규 컴포넌트 사용 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] CustomMockStats — 신규 컴포넌트 JSX 사용')

check('<PredictionCard 사용',            customSrc.includes('<PredictionCard'))
check('<PassProbabilityCard 사용',       customSrc.includes('<PassProbabilityCard'))
check('<WeaknessHeatmap 사용',           customSrc.includes('<WeaknessHeatmap'))
check('<DifficultyAnalysis 사용',        customSrc.includes('<DifficultyAnalysis'))
check('<StudyRoadmap 사용',              customSrc.includes('<StudyRoadmap'))

// records prop 전달
check('PredictionCard records={allFiltered}',      customSrc.includes('records={allFiltered}'))
check('PassProbabilityCard records={allFiltered}', (customSrc.match(/records=\{allFiltered\}/g) ?? []).length >= 2)

// questionAttempts prop 전달
check('WeaknessHeatmap questionAttempts={syntheticAttempts}', customSrc.includes('questionAttempts={syntheticAttempts}'))
check('StudyRoadmap questionAttempts={syntheticAttempts}',    (customSrc.match(/questionAttempts=\{syntheticAttempts\}/g) ?? []).length >= 2)

// DifficultyAnalysis props 없음
check('DifficultyAnalysis props 없음',   customSrc.includes('<DifficultyAnalysis />') || customSrc.includes('<DifficultyAnalysis/>'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] CustomMockStats — buildSyntheticAttempts 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] CustomMockStats — buildSyntheticAttempts 로직')

check('buildSyntheticAttempts 함수 존재',  customSrc.includes('function buildSyntheticAttempts'))
check('syntheticAttempts 파생 값 선언',    customSrc.includes('syntheticAttempts'))
check('buildSyntheticAttempts 호출',       customSrc.includes('buildSyntheticAttempts(weaknessAnalysis)'))

// 변환 로직 시뮬레이션
const mockWeakness = {
  subjectStats: {
    '보험업법': { accuracy: 80, total: 10, correct: 8 },
    '상법':     { accuracy: 50, total: 20, correct: 10 },
    '위험관리': { accuracy: 0,  total: 5,  correct: 0  },
  }
}
const synthetic = buildSyntheticAttempts(mockWeakness)
check('총 시도수 = 10+20+5 = 35',             synthetic.length === 35)
check('보험업법 correct=8 개수',              synthetic.filter(a => a.sub_subject === '보험업법' && a.is_correct).length === 8)
check('보험업법 incorrect=2 개수',            synthetic.filter(a => a.sub_subject === '보험업법' && !a.is_correct).length === 2)
check('상법 correct=10 개수',                 synthetic.filter(a => a.sub_subject === '상법' && a.is_correct).length === 10)
check('위험관리 correct=0 개수',              synthetic.filter(a => a.sub_subject === '위험관리' && a.is_correct).length === 0)
check('위험관리 incorrect=5 개수',            synthetic.filter(a => a.sub_subject === '위험관리' && !a.is_correct).length === 5)
check('null 입력 → 빈 배열',                  buildSyntheticAttempts(null).length === 0)
check('subjectStats 없음 → 빈 배열',          buildSyntheticAttempts({}).length === 0)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] CustomMockStats — 레이아웃 순서
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] CustomMockStats — 레이아웃 순서 검증')

// DualLineChart: 함수 정의가 아닌 JSX 사용 위치 검색
// '응시 이력': 함수 정의 주석이 아닌 JSX 섹션 헤더 위치 검색
const layoutOrder = indexOrder(customSrc, [
  '<PredictionCard',
  '<PassProbabilityCard',
  '<DualLineChart',            // JSX 사용 위치
  '<WeaknessHeatmap',
  '<DifficultyAnalysis',
  '<StudyRoadmap',
  'px-1">응시 이력',           // JSX 섹션 헤더 위치 (함수 주석 제외)
])

const idxPred   = layoutOrder[0].idx
const idxPass   = layoutOrder[1].idx
const idxChart  = layoutOrder[2].idx
const idxHeat   = layoutOrder[3].idx
const idxDiff   = layoutOrder[4].idx
const idxRoad   = layoutOrder[5].idx
const idxHist   = layoutOrder[6].idx

check('PredictionCard가 DualLineChart보다 앞',  idxPred  < idxChart)
check('PassProbabilityCard가 DualLineChart보다 앞', idxPass < idxChart)
check('DualLineChart가 WeaknessHeatmap보다 앞', idxChart < idxHeat)
check('WeaknessHeatmap이 DifficultyAnalysis보다 앞', idxHeat < idxDiff)
check('DifficultyAnalysis가 StudyRoadmap보다 앞', idxDiff < idxRoad)
check('StudyRoadmap이 응시 이력 헤더보다 앞',   idxRoad < idxHist)
check('PredictionCard + PassProbabilityCard 2열 grid', customSrc.includes('grid-cols-2'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] CustomMockStats — 기존 기능 유지 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] CustomMockStats — 기존 기능 유지')

check('필터 탭 FILTERS 상수',             customSrc.includes("const FILTERS = ['전체', '원본만', '맞춤만']"))
check('DualLineChart 컴포넌트 유지',      customSrc.includes('function DualLineChart'))
check('SummaryCard 컴포넌트 유지',        customSrc.includes('function SummaryCard'))
check('HistoryRow 컴포넌트 유지',         customSrc.includes('function HistoryRow'))
check('전체 요약 섹션 유지',              customSrc.includes('전체 요약'))
check('응시 이력 섹션 유지',              customSrc.includes('응시 이력'))
check('buildGuestOriginalStats 유지',     customSrc.includes('function buildGuestOriginalStats'))
check('weaknessAnalysis 상태 유지',       customSrc.includes('weaknessAnalysis'))
check('analyzeWeakness 호출 유지',        customSrc.includes('analyzeWeakness(userId)'))
check('filter 상태 유지',                 customSrc.includes("useState('전체')"))
check('filteredOriginal / filteredCustom', customSrc.includes('filteredOriginal') && customSrc.includes('filteredCustom'))

// 제거된 섹션 확인 (기존 단순 합격예측 / 약점수렴분석)
check('기존 단순 합격 예측 섹션 제거',   !customSrc.includes('calcPassPrediction'))
check('기존 약점 수렴 분석 섹션 제거',   !customSrc.includes('weaknessList'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] MockExamStats — import 추가 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] MockExamStats — import 확인')

check('PredictionCard import',            mockSrc.includes("import PredictionCard"))
check('PassProbabilityCard import',       mockSrc.includes("import PassProbabilityCard"))
check('stats/ 경로 참조',                mockSrc.includes("'../components/stats/"))
check('WeaknessHeatmap import 없음 (불필요)', !mockSrc.includes("import WeaknessHeatmap"))
check('StudyRoadmap import 없음 (불필요)',    !mockSrc.includes("import StudyRoadmap"))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] MockExamStats — 신규 컴포넌트 사용 + 레이아웃
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] MockExamStats — 신규 컴포넌트 사용 + 레이아웃')

check('<PredictionCard 사용',             mockSrc.includes('<PredictionCard'))
check('<PassProbabilityCard 사용',        mockSrc.includes('<PassProbabilityCard'))
check('records={records} prop',          mockSrc.includes('records={records}'))
check('2열 grid-cols-2',                 mockSrc.includes('grid-cols-2'))

// 레이아웃 순서: PredictionCard → 전체 요약 → LineChart → 응시 이력
// '전체 요약': 파일 상단 JSDoc 주석이 아닌 JSX 섹션 헤더 위치 검색
const mockLayout = indexOrder(mockSrc, [
  '<PredictionCard',
  'px-1">전체 요약',   // JSX 섹션 헤더 위치 (function 정의 제외)
  '<LineChart ',       // JSX 사용 위치 (function 정의 제외)
  '회차별 이력',
])
check('PredictionCard가 전체 요약 섹션보다 앞',    mockLayout[0].idx < mockLayout[1].idx)
check('전체 요약이 LineChart 사용보다 앞',    mockLayout[1].idx < mockLayout[2].idx)
check('LineChart가 회차별 이력보다 앞',       mockLayout[2].idx < mockLayout[3].idx)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 8 ] MockExamStats — 기존 기능 유지 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 8 ] MockExamStats — 기존 기능 유지')

check('LineChart 컴포넌트 유지',          mockSrc.includes('function LineChart'))
check('SummaryCard 컴포넌트 유지',        mockSrc.includes('function SummaryCard'))
check('HistoryRow 컴포넌트 유지',         mockSrc.includes('function HistoryRow'))
check('buildGuestStats 유지',             mockSrc.includes('function buildGuestStats'))
check('mockExamSupabase.getSessionHistory 호출', mockSrc.includes('getSessionHistory'))
check('전체 요약 3 카드 유지',            mockSrc.includes('총 응시') && mockSrc.includes('합격률') && mockSrc.includes('평균 점수'))
check('데이터 없음 안내 유지',            mockSrc.includes('아직 완료한 모의고사가 없습니다'))
check('회차별 이력 유지',                 mockSrc.includes('회차별 이력'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 9 ] 데이터 연결 일관성
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 9 ] 데이터 연결 일관성')

// CustomMockStats: allFiltered가 records prop으로 정확히 연결되는지
check('CustomMockStats allFiltered 선언',  customSrc.includes('const allFiltered'))
check('allFiltered = filteredOriginal + filteredCustom', customSrc.includes('[...filteredOriginal, ...filteredCustom]'))

// syntheticAttempts이 메인 컴포넌트 return 이전에 선언되는지
// 메인 컴포넌트 시작점 기준으로 확인 (최초 return 은 helper 함수일 수 있음)
const idxMainComp    = customSrc.indexOf('export default function CustomMockStats')
const idxSynthDecl   = customSrc.indexOf('const syntheticAttempts', idxMainComp)
const idxRenderStart = customSrc.indexOf('return (', idxMainComp)
check('syntheticAttempts 선언이 메인 컴포넌트 return 이전',
  idxMainComp > 0 && idxSynthDecl > idxMainComp && idxSynthDecl < idxRenderStart)

// MockExamStats: records state가 prop으로 연결
check('MockExamStats records state 선언',  mockSrc.includes("useState([])") && mockSrc.includes('setRecords'))
check('records prop 전달',                 mockSrc.includes('records={records}'))

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_088 STEP 3 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
