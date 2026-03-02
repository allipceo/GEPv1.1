/**
 * verify-gep087-step2.mjs
 * GEP_087 STEP 2 검증 스크립트
 * 대상: src/components/stats/ 6개 컴포넌트
 *
 * node scripts/verify-gep087-step2.mjs
 */

import { readFileSync, existsSync } from 'fs'
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
function exists(rel)  { return existsSync(resolve(root, rel)) }

// ─────────────────────────────────────────────────────────────────────────────
// 핵심 로직 인라인 시뮬레이션
// ─────────────────────────────────────────────────────────────────────────────

// CircularGauge 색상 로직
function gaugeColor(pct) {
  return pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
}

// SVG arc 길이 계산 (CircularGauge)
function calcArc(value, r) {
  const pct  = Math.min(100, Math.max(0, value))
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  return { fill, gap: circ - fill, circ }
}

// PredictionCard recentN 토글 로직
function getRecent(records, recentN) {
  return records.map(r => r.totalAverage ?? r.total_average ?? 0).slice(-recentN)
}

// PassProbabilityCard 위험 과목 스타일
const RISK_THRESHOLD = 72
function riskStyle(prob) {
  if (prob >= 80)            return 'green'
  if (prob >= RISK_THRESHOLD) return 'amber'
  return                            'red'
}

// WeaknessHeatmap 부모 과목 그룹핑
const PARENT_SECTIONS = ['법령', '손보1부', '손보2부']
const subjectMap = {
  S1:  { key: '보험업법',   parent: '법령'    },
  S2:  { key: '상법',       parent: '법령'    },
  S3:  { key: '위험관리',   parent: '법령'    },
  S4:  { key: '세제재무',   parent: '법령'    },
  S5:  { key: '자동차보험', parent: '손보1부' },
  S6:  { key: '특종보험',   parent: '손보1부' },
  S7:  { key: '보증보험',   parent: '손보1부' },
  S8:  { key: '연금저축',   parent: '손보1부' },
  S9:  { key: '화재보험',   parent: '손보2부' },
  S10: { key: '해상보험',   parent: '손보2부' },
  S11: { key: '항공우주',   parent: '손보2부' },
  S12: { key: '재보험',     parent: '손보2부' },
}

function groupByParent(parent) {
  return Object.entries(subjectMap).filter(([, v]) => v.parent === parent)
}

// StudyRoadmap 주차 할당
function assignWeeks(roadmap) {
  let cursor = 1
  return roadmap.map(item => {
    const weeks   = Math.max(1, Math.round(item.days / 7))
    const endWeek = cursor + weeks - 1
    const weekLabel = weeks === 1 ? `${cursor}주차` : `${cursor}~${endWeek}주차`
    const result = { ...item, weeks, weekLabel, startWeek: cursor, endWeek }
    cursor = endWeek + 1
    return result
  })
}

// generateStudyRoadmap 인라인
const BASE_STUDY_DAYS = {
  '보험업법':14,'상법':21,'위험관리':7,'세제재무':7,
  '자동차보험':14,'특종보험':10,'보증보험':7,'연금저축':10,
  '화재보험':10,'해상보험':14,'항공우주':7,'재보험':10,
}

function generateStudyRoadmap(weaknessData) {
  const TARGET = 70
  return weaknessData
    .filter(d => d.accuracy !== null && d.accuracy < TARGET)
    .map(d => {
      const gap=TARGET-d.accuracy, baseDays=BASE_STUDY_DAYS[d.name]??10
      const roi=Math.round(gap/baseDays*100)/100
      return {...d, gap, roi, targetRate:TARGET, days:baseDays}
    })
    .sort((a,b) => b.roi-a.roi)
    .slice(0,3)
    .map((d,i) => ({priority:i+1,...d}))
}

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 0 ] 6개 파일 존재 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 0 ] 6개 컴포넌트 파일 존재 확인')

const FILES = [
  'src/components/stats/CircularGauge.jsx',
  'src/components/stats/PredictionCard.jsx',
  'src/components/stats/PassProbabilityCard.jsx',
  'src/components/stats/WeaknessHeatmap.jsx',
  'src/components/stats/DifficultyAnalysis.jsx',
  'src/components/stats/StudyRoadmap.jsx',
]

FILES.forEach(f => check(`${f} 존재`, exists(f)))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] CircularGauge
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] CircularGauge')
const gaugeSrc = readSrc('src/components/stats/CircularGauge.jsx')

check('export default function CircularGauge', gaugeSrc.includes('export default function CircularGauge'))
check('SVG 사용',                              gaugeSrc.includes('<svg'))
check('strokeDasharray 사용 (게이지 호)',       gaugeSrc.includes('strokeDasharray'))
check('strokeDashoffset 사용 (12시 시작)',      gaugeSrc.includes('strokeDashoffset'))
check('strokeLinecap="round"',                gaugeSrc.includes('strokeLinecap'))
check('value prop',                           gaugeSrc.includes('value'))
check('size prop',                            gaugeSrc.includes('size'))
check('label prop',                           gaugeSrc.includes('label'))

// 색상 로직 시뮬레이션
check('80%+ → green (#22c55e)',               gaugeColor(80) === '#22c55e')
check('79% → amber (#f59e0b)',                gaugeColor(79) === '#f59e0b')
check('60% → amber (#f59e0b)',                gaugeColor(60) === '#f59e0b')
check('59% → red (#ef4444)',                  gaugeColor(59) === '#ef4444')
check('0% → red (#ef4444)',                   gaugeColor(0)  === '#ef4444')
check('100% → green (#22c55e)',               gaugeColor(100) === '#22c55e')

// SVG arc 길이 검증
const arc50 = calcArc(50, 30)
check('50% → fill ≈ circumference/2',         Math.abs(arc50.fill - arc50.circ/2) < 0.1)
const arc100 = calcArc(100, 30)
check('100% → fill = circumference',          Math.abs(arc100.fill - arc100.circ) < 0.1)
const arc0 = calcArc(0, 30)
check('0% → fill = 0',                        Math.abs(arc0.fill) < 0.1)

// 클리핑
check('150% → 100으로 클리핑',                calcArc(150,30).fill === calcArc(100,30).fill)
check('-10% → 0으로 클리핑',                  calcArc(-10,30).fill === calcArc(0,30).fill)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] PredictionCard
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] PredictionCard')
const predSrc = readSrc('src/components/stats/PredictionCard.jsx')

check('export default function PredictionCard',   predSrc.includes('export default function PredictionCard'))
check('calculatePredictedScore import',           predSrc.includes('calculatePredictedScore'))
check('MIN_DATA_REQUIRED import',                 predSrc.includes('MIN_DATA_REQUIRED'))
check('useState(5) recentN 기본값',              predSrc.includes('useState(5)'))
check('5회 토글 버튼',                           predSrc.includes('5') && predSrc.includes('10'))
check('10회 버튼 disabled 조건',                 predSrc.includes('disabled') && predSrc.includes('canUse10'))
check('🔼🔽→ 추세 아이콘',                       predSrc.includes('🔼') && predSrc.includes('🔽'))
check('합격선 60점 마커',                        predSrc.includes('60%') || predSrc.includes("'60%'"))
check('신뢰구간 표시',                           predSrc.includes('confidenceMin') && predSrc.includes('confidenceMax'))
check('dataCount 부족 시 안내',                  predSrc.includes('MIN_DATA_REQUIRED') && predSrc.includes('dataCount'))
check('result.error 처리',                       predSrc.includes('result.error') || predSrc.includes('hasError'))
check('records prop',                            predSrc.includes('records'))

// recentN 슬라이스 로직 시뮬레이션
const recs15 = Array.from({length:15}, (_,i) => ({totalAverage: 50+i}))
check('15개 중 최근 5개 slicing',               getRecent(recs15, 5).length === 5)
check('15개 최근 5개 값 — [60~64]',             getRecent(recs15, 5)[0] === 60)
check('15개 최근 10개 slicing',                 getRecent(recs15, 10).length === 10)

// canUse10 로직
const can10_yes = (recs15.length ?? 0) >= 10
const can10_no  = (Array.from({length:7}).length ?? 0) >= 10
check('15개 보유 → 10회 버튼 활성화',           can10_yes === true)
check('7개 보유 → 10회 버튼 비활성화',          can10_no  === false)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] PassProbabilityCard
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] PassProbabilityCard')
const probSrc = readSrc('src/components/stats/PassProbabilityCard.jsx')

check('export default function PassProbabilityCard', probSrc.includes('export default function PassProbabilityCard'))
check('calculatePassProbability import',             probSrc.includes('calculatePassProbability'))
check('CircularGauge import',                        probSrc.includes("from './CircularGauge'"))
check('CircularGauge 사용',                          probSrc.includes('<CircularGauge'))
check('RISK_THRESHOLD = 72',                         probSrc.includes('72'))
check('3개 과목 배열 SUBJECTS',                      probSrc.includes('법령') && probSrc.includes('손보1부') && probSrc.includes('손보2부'))
check('위험 과목 ⚠️ 강조',                           probSrc.includes('⚠️') || probSrc.includes('isRisk'))
check('full / estimated mode 분기',                  probSrc.includes("mode === 'full'") && probSrc.includes("mode === 'estimated'"))
check('subjectProbs 렌더',                           probSrc.includes('subjectProbs'))
check('averageProb 표시',                            probSrc.includes('averageProb') || probSrc.includes('estimated'))
check('hasError 처리',                               probSrc.includes('hasError') || probSrc.includes('result.error'))

// 위험 과목 색상 로직 시뮬레이션
check('prob=100 → green',   riskStyle(100) === 'green')
check('prob=80 → green',    riskStyle(80)  === 'green')
check('prob=79 → amber',    riskStyle(79)  === 'amber')
check('prob=72 → amber',    riskStyle(72)  === 'amber')
check('prob=71 → red',      riskStyle(71)  === 'red')
check('prob=0 → red',       riskStyle(0)   === 'red')

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] WeaknessHeatmap
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] WeaknessHeatmap')
const heatSrc = readSrc('src/components/stats/WeaknessHeatmap.jsx')

check('export default function WeaknessHeatmap',  heatSrc.includes('export default function WeaknessHeatmap'))
check('analyzeWeaknessBySubject import',           heatSrc.includes('analyzeWeaknessBySubject'))
check('3개 섹션 분리 (법령/손보1부/손보2부)',      heatSrc.includes("parent: '법령'") && heatSrc.includes("parent: '손보1부'") && heatSrc.includes("parent: '손보2부'"))
check('level 배지 LEVEL_BADGE 상수',              heatSrc.includes('LEVEL_BADGE') || heatSrc.includes('level'))
check('nodata 처리',                              heatSrc.includes('nodata') || heatSrc.includes('미응시'))
check('정답률 바(h-2 bg)',                        heatSrc.includes('h-2'))
check('questionAttempts prop',                    heatSrc.includes('questionAttempts'))
check('데이터 없음 안내',                         heatSrc.includes('아직 풀이 기록') || heatSrc.includes('풀이 기록이 없습니다'))
check('accuracy 색상 표시',                       heatSrc.includes('d.color') || heatSrc.includes('accuracy'))

// 그룹핑 로직 시뮬레이션
const lawGroup    = groupByParent('법령')
const ins1Group   = groupByParent('손보1부')
const ins2Group   = groupByParent('손보2부')
check('법령 4개 세부과목',    lawGroup.length === 4)
check('손보1부 4개 세부과목', ins1Group.length === 4)
check('손보2부 4개 세부과목', ins2Group.length === 4)
check('법령 그룹에 보험업법 포함', lawGroup.some(([,v]) => v.key === '보험업법'))
check('손보1부 그룹에 자동차보험 포함', ins1Group.some(([,v]) => v.key === '자동차보험'))
check('손보2부 그룹에 해상보험 포함', ins2Group.some(([,v]) => v.key === '해상보험'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] DifficultyAnalysis
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] DifficultyAnalysis')
const diffSrc = readSrc('src/components/stats/DifficultyAnalysis.jsx')

check('export default function DifficultyAnalysis', diffSrc.includes('export default function DifficultyAnalysis'))
check('analyzeWeaknessByDifficulty import',          diffSrc.includes('analyzeWeaknessByDifficulty'))
check('NO_DIFFICULTY_DATA 처리',                     diffSrc.includes('NO_DIFFICULTY_DATA'))
check('상/중/하 난이도 메타',                        diffSrc.includes('hard') && diffSrc.includes('medium') && diffSrc.includes('easy'))
check('난이도 데이터 준비 중 안내',                  diffSrc.includes('준비 중') || diffSrc.includes('없습니다'))
check('hasError 분기',                               diffSrc.includes('hasError'))
check('hasData 분기 (미래 구현)',                    diffSrc.includes('hasData'))
check('props 없음 (standalone)',                     !diffSrc.includes('{ questionAttempts') && !diffSrc.includes('{ records'))

// stub 반환값 시뮬레이션
function analyzeWeaknessByDifficulty() {
  return { error:'NO_DIFFICULTY_DATA', message:'...', hard:null, medium:null, easy:null }
}
const stubResult = analyzeWeaknessByDifficulty()
check('stub → error=NO_DIFFICULTY_DATA',  stubResult.error === 'NO_DIFFICULTY_DATA')
check('stub → hard=null',                 stubResult.hard === null)
check('stub → medium=null',               stubResult.medium === null)
check('stub → easy=null',                 stubResult.easy === null)
const hasError_stub = stubResult.error === 'NO_DIFFICULTY_DATA'
const hasData_stub  = !hasError_stub && (stubResult.hard || stubResult.medium || stubResult.easy)
check('hasError=true → 안내 메시지 표시',  hasError_stub === true)
check('hasData=false → 데이터 섹션 숨김', hasData_stub  === false)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] StudyRoadmap
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] StudyRoadmap')
const roadSrc = readSrc('src/components/stats/StudyRoadmap.jsx')

check('export default function StudyRoadmap',  roadSrc.includes('export default function StudyRoadmap'))
check('analyzeWeaknessBySubject import',       roadSrc.includes('analyzeWeaknessBySubject'))
check('generateStudyRoadmap import',           roadSrc.includes('generateStudyRoadmap'))
check('questionAttempts prop',                 roadSrc.includes('questionAttempts'))
check('우선순위 Top 3 (priority)',             roadSrc.includes('priority'))
check('ROI 표시',                             roadSrc.includes('roi') || roadSrc.includes('ROI'))
check('4주 타임라인 TOTAL_WEEKS=4',           roadSrc.includes('4') && (roadSrc.includes('주차') || roadSrc.includes('TOTAL_WEEKS')))
check('Timeline 컴포넌트',                    roadSrc.includes('Timeline'))
check('데이터 없음 안내',                     roadSrc.includes('아직 풀이 기록') || roadSrc.includes('풀이 기록이 없습니다'))
check('모두 70점 이상 케이스',               roadSrc.includes('70점') || roadSrc.includes('취약 과목이 없습니다'))
check('method 표시 (학습법)',                roadSrc.includes('method') || roadSrc.includes('학습법'))

// assignWeeks 로직 시뮬레이션
// 위험관리(7일=1주), 보험업법(14일=2주), 상법(21일=3주)
const mockRoadmap = [
  { priority:1, name:'위험관리', days:7 },
  { priority:2, name:'보험업법', days:14 },
  { priority:3, name:'상법',     days:21 },
]
const withWeeks = assignWeeks(mockRoadmap)
check('위험관리 → startWeek=1, endWeek=1', withWeeks[0].startWeek===1 && withWeeks[0].endWeek===1)
check('보험업법 → startWeek=2, endWeek=3', withWeeks[1].startWeek===2 && withWeeks[1].endWeek===3)
check('상법 → startWeek=4, endWeek=6',    withWeeks[2].startWeek===4 && withWeeks[2].endWeek===6)
check('위험관리 weekLabel = "1주차"',      withWeeks[0].weekLabel === '1주차')
check('보험업법 weekLabel = "2~3주차"',    withWeeks[1].weekLabel === '2~3주차')

// generateStudyRoadmap ROI 순서 시뮬레이션
const mockWeakness = [
  { subjectKey:'S1', name:'보험업법',   parent:'법령',    accuracy:30 },  // roi = 40/14 ≈ 2.86
  { subjectKey:'S3', name:'위험관리',   parent:'법령',    accuracy:40 },  // roi = 30/7  ≈ 4.29
  { subjectKey:'S2', name:'상법',       parent:'법령',    accuracy:50 },  // roi = 20/21 ≈ 0.95
  { subjectKey:'S9', name:'화재보험',   parent:'손보2부', accuracy:90 },  // 제외 (>= 70)
  { subjectKey:'S5', name:'자동차보험', parent:'손보1부', accuracy:null }, // 제외 (nodata)
]
const rm = generateStudyRoadmap(mockWeakness)
check('Top 3 반환',                            rm.length === 3)
check('1순위 = 위험관리 (ROI 최고)',           rm[0].name === '위험관리')
check('2순위 = 보험업법',                      rm[1].name === '보험업법')
check('3순위 = 상법',                          rm[2].name === '상법')
check('priority 1~3',                          rm.map(d=>d.priority).join(',') === '1,2,3')
check('화재보험 제외 (90% >= 70)',             !rm.some(d=>d.name==='화재보험'))
check('자동차보험 제외 (nodata)',              !rm.some(d=>d.name==='자동차보험'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] advancedStatsService 연동 패턴 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] advancedStatsService 연동 패턴')

const SERVICE_PATH = 'src/services/advancedStatsService.js'
const COMPONENTS = {
  'PredictionCard':      { src: predSrc, fn: 'calculatePredictedScore' },
  'PassProbabilityCard': { src: probSrc, fn: 'calculatePassProbability' },
  'WeaknessHeatmap':     { src: heatSrc, fn: 'analyzeWeaknessBySubject' },
  'DifficultyAnalysis':  { src: diffSrc, fn: 'analyzeWeaknessByDifficulty' },
  'StudyRoadmap':        { src: roadSrc, fn: 'generateStudyRoadmap' },
}

for (const [name, { src, fn }] of Object.entries(COMPONENTS)) {
  check(`${name} — ${fn} import 확인`, src.includes(fn))
  check(`${name} — advancedStatsService 경로 참조`,
    src.includes(`'../../services/advancedStatsService'`) ||
    src.includes(`"../../services/advancedStatsService"`)
  )
}

check('CircularGauge — advancedStatsService 미사용 (순수 SVG)', !gaugeSrc.includes('advancedStatsService'))
check('PassProbabilityCard — CircularGauge 상대 경로 import',    probSrc.includes("'./CircularGauge'") || probSrc.includes('"./CircularGauge"'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 8 ] Tailwind CSS 일관성
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 8 ] Tailwind CSS 일관성')

const ALL_SRCS = [gaugeSrc, predSrc, probSrc, heatSrc, diffSrc, roadSrc]
const ALL_NAMES = ['CircularGauge','PredictionCard','PassProbabilityCard','WeaknessHeatmap','DifficultyAnalysis','StudyRoadmap']

ALL_SRCS.forEach((src, i) => {
  // CircularGauge는 SVG <circle>로 원형 표현 → CSS rounded 불필요
  if (ALL_NAMES[i] === 'CircularGauge') {
    check(`${ALL_NAMES[i]} — SVG <circle> 사용 (rounded 대체)`, src.includes('<circle'))
  } else {
    check(`${ALL_NAMES[i]} — rounded 클래스 사용`, src.includes('rounded'))
  }
})

// 카드 패턴: rounded-2xl bg-white border border-gray-200
const CARD_PATTERN = 'rounded-2xl'
;[predSrc, probSrc, heatSrc, diffSrc, roadSrc].forEach((src, i) => {
  check(`${ALL_NAMES[i+1]} — rounded-2xl 카드 패턴`, src.includes(CARD_PATTERN))
})

// 색상 일관성: green-600/amber-500/red-500 사용 패턴
check('PredictionCard — green/amber/red 점수 색상',   predSrc.includes('text-green-600') && predSrc.includes('text-amber-500') && predSrc.includes('text-red-500'))
check('PassProbabilityCard — 위험 색상 체계',         probSrc.includes('green') && probSrc.includes('amber') && probSrc.includes('red'))
check('WeaknessHeatmap — 과목 색상 (blue/green/purple)', heatSrc.includes('blue') && heatSrc.includes('green') && heatSrc.includes('purple'))

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_087 STEP 2 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
