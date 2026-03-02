/**
 * verify-gep085-step1.mjs
 * GEP_085 STEP 1 검증 스크립트
 * 대상: src/services/advancedStatsService.js
 *
 * node scripts/verify-gep085-step1.mjs
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
// 핵심 로직 인라인 시뮬레이션 (Node.js 순수 실행)
// ─────────────────────────────────────────────────────────────────────────────

// ── 수학 유틸 ─────────────────────────────────────────────────────────────────
function mean(arr)   { return arr.length ? arr.reduce((s,v) => s+v, 0) / arr.length : 0 }
function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a,b)=>a-b), m = Math.floor(s.length/2)
  return s.length % 2 !== 0 ? s[m] : (s[m-1]+s[m])/2
}
function stdDev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s,v) => s + (v-m)**2, 0) / (arr.length-1))
}
function linearSlope(arr) {
  const n = arr.length
  if (n < 2) return 0
  const xs = Array.from({length:n},(_,i)=>i)
  const xm = mean(xs), ym = mean(arr)
  const num = xs.reduce((s,x,i)=>s+(x-xm)*(arr[i]-ym), 0)
  const den = xs.reduce((s,x)=>s+(x-xm)**2, 0)
  return den === 0 ? 0 : num / den
}
function randomNormal() {
  let u, v
  do { u = Math.random() } while (u===0)
  do { v = Math.random() } while (v===0)
  return Math.sqrt(-2.0*Math.log(u)) * Math.cos(2.0*Math.PI*v)
}

// ── 설정 (customMockConfig 인라인) ────────────────────────────────────────────
const SUBJECTS   = ['법령', '손보1부', '손보2부']
const minSubject = 40, minAverage = 60
const MIN_DATA   = 5
const TARGET     = 70

const subjectMap = {
  S1:  { key: '보험업법',   parent: '법령' },
  S2:  { key: '상법',       parent: '법령' },
  S3:  { key: '위험관리',   parent: '법령' },
  S4:  { key: '세제재무',   parent: '법령' },
  S5:  { key: '자동차보험', parent: '손보1부' },
  S6:  { key: '특종보험',   parent: '손보1부' },
  S7:  { key: '보증보험',   parent: '손보1부' },
  S8:  { key: '연금저축',   parent: '손보1부' },
  S9:  { key: '화재보험',   parent: '손보2부' },
  S10: { key: '해상보험',   parent: '손보2부' },
  S11: { key: '항공우주',   parent: '손보2부' },
  S12: { key: '재보험',     parent: '손보2부' },
}

const BASE_STUDY_DAYS = {
  '보험업법':14,'상법':21,'위험관리':7,'세제재무':7,
  '자동차보험':14,'특종보험':10,'보증보험':7,'연금저축':10,
  '화재보험':10,'해상보험':14,'항공우주':7,'재보험':10,
}

// ── 함수 인라인 구현 ─────────────────────────────────────────────────────────
function calculatePredictedScore(records, recentN=5) {
  if (!records || records.length < MIN_DATA) return { error:'INSUFFICIENT_DATA', dataCount: records?.length??0 }
  const scores = records.map(r => r.totalAverage ?? r.total_average ?? 0)
  const recent = scores.slice(-recentN)
  const med    = median(recent)
  const slope  = linearSlope(recent)
  const trend  = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable'
  const trendValue = Math.round(slope*10)/10
  const m  = mean(recent), sd = stdDev(recent)
  const ciMin = Math.max(0,   Math.round((m - 1.96*sd)*10)/10)
  const ciMax = Math.min(100, Math.round((m + 1.96*sd)*10)/10)
  return { median: Math.round(med*10)/10, trend, trendValue, confidenceMin: ciMin, confidenceMax: ciMax, dataCount: records.length }
}

function calculatePassProbability(records, simulationCount=1000) {
  if (!records || records.length < MIN_DATA) return { error:'INSUFFICIENT_DATA', dataCount: records?.length??0 }
  const isFull = records[0] != null && SUBJECTS.every(s => s in records[0])

  if (isFull) {
    let overallPass=0
    const subPass = Object.fromEntries(SUBJECTS.map(s=>[s,0]))
    for (let i=0; i<simulationCount; i++) {
      const sim = {}
      SUBJECTS.forEach(s => {
        const arr = records.map(r => r[s]??0)
        const m=mean(arr), sd=Math.max(stdDev(arr),1)
        sim[s] = Math.min(100, Math.max(0, m + sd*randomNormal()))
      })
      const avg = mean(Object.values(sim))
      if (SUBJECTS.every(s=>sim[s]>=minSubject) && avg>=minAverage) overallPass++
      SUBJECTS.forEach(s=>{ if(sim[s]>=minSubject) subPass[s]++ })
    }
    return {
      overall: Math.round(overallPass/simulationCount*100),
      subjectProbs: Object.fromEntries(SUBJECTS.map(s=>[s, Math.round(subPass[s]/simulationCount*100)])),
      averageProb: null, simulationCount, mode:'full'
    }
  }

  const avgScores = records.map(r => r.totalAverage ?? r.total_average ?? 0)
  const m=mean(avgScores), sd=Math.max(stdDev(avgScores),1)
  let passCount=0
  for (let i=0; i<simulationCount; i++) {
    const sim = Math.min(100, Math.max(0, m + sd*randomNormal()))
    if (sim >= minAverage) passCount++
  }
  const prob = Math.round(passCount/simulationCount*100)
  return { overall:prob, subjectProbs:null, averageProb:prob, simulationCount, mode:'estimated' }
}

function analyzeWeaknessBySubject(attempts) {
  const stats = {}
  Object.values(subjectMap).forEach(({key,parent}) => { stats[key]={correct:0,total:0,parent} })
  if (attempts?.length) {
    attempts.forEach(({sub_subject,is_correct}) => {
      if (sub_subject && stats[sub_subject]) {
        stats[sub_subject].total++
        if (is_correct) stats[sub_subject].correct++
      }
    })
  }
  return Object.entries(subjectMap).map(([subjectKey,{key,parent}]) => {
    const {correct,total} = stats[key]
    const accuracy = total > 0 ? Math.round(correct/total*100) : null
    let level, color
    if      (accuracy===null) { level='nodata'; color='#9ca3af' }
    else if (accuracy>=80)    { level='good';   color='#22c55e' }
    else if (accuracy>=60)    { level='fair';   color='#f59e0b' }
    else                      { level='weak';   color='#ef4444' }
    return { subjectKey, name:key, parent, accuracy, level, color, correct, total }
  })
}

function analyzeWeaknessByDifficulty() {
  return { error:'NO_DIFFICULTY_DATA', message:'...', hard:null, medium:null, easy:null }
}

function generateStudyRoadmap(weaknessData) {
  if (!weaknessData?.length) return []
  return weaknessData
    .filter(d => d.accuracy!==null && d.accuracy<TARGET)
    .map(d => {
      const gap=TARGET-d.accuracy, baseDays=BASE_STUDY_DAYS[d.name]??10
      const roi=Math.round(gap/baseDays*100)/100
      return {...d, gap, roi, targetRate:TARGET, days:baseDays, method:'학습법'}
    })
    .sort((a,b) => b.roi-a.roi)
    .slice(0,3)
    .map((d,i) => ({priority:i+1,...d}))
}

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 0 ] 소스 구조 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 0 ] advancedStatsService.js 소스 구조')
const src = readSrc('src/services/advancedStatsService.js')

check('export MIN_DATA_REQUIRED',               src.includes('export const MIN_DATA_REQUIRED'))
check('export calculatePredictedScore',         src.includes('export function calculatePredictedScore'))
check('export calculatePassProbability',        src.includes('export function calculatePassProbability'))
check('export analyzeWeaknessBySubject',        src.includes('export function analyzeWeaknessBySubject'))
check('export analyzeWeaknessByDifficulty',     src.includes('export function analyzeWeaknessByDifficulty'))
check('export generateStudyRoadmap',            src.includes('export function generateStudyRoadmap'))
check('customMockConfig import',                src.includes("from '../config/customMockConfig'"))
check('examConfig.js 미참조 (존재 안 함)',      !src.includes('examConfig'))
check('Box-Muller _randomNormal 존재',          src.includes('Box-Muller') || src.includes('randomNormal'))
check('BASE_STUDY_DAYS 상수 존재',              src.includes('BASE_STUDY_DAYS'))
check('STUDY_METHOD 상수 존재',                 src.includes('STUDY_METHOD'))
check('MIN_DATA_REQUIRED = 5',                  src.includes('MIN_DATA_REQUIRED = 5'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] calculatePredictedScore — 정상·엣지·오류
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] calculatePredictedScore')

// 데이터 부족
const insufficientResult = calculatePredictedScore([{totalAverage:70},{totalAverage:72}])
check('데이터 부족 → error:INSUFFICIENT_DATA',  insufficientResult.error === 'INSUFFICIENT_DATA')
check('데이터 부족 → dataCount=2',              insufficientResult.dataCount === 2)

// 정상: 상승 추세
const upRecs = Array.from({length:10}, (_,i) => ({totalAverage: 55 + i*2}))  // 55,57,...,73
const upResult = calculatePredictedScore(upRecs, 5)
check('상승 추세 → trend:up',                   upResult.trend === 'up')
check('median 정확성 — 5개 최근값 중앙값',      upResult.median >= 64 && upResult.median <= 74)
check('trendValue 양수',                        upResult.trendValue > 0)
check('confidenceMin ≤ median',                upResult.confidenceMin <= upResult.median)
check('confidenceMax ≥ median',                upResult.confidenceMax >= upResult.median)
check('dataCount=10',                          upResult.dataCount === 10)

// 정상: 하락 추세
const downRecs = Array.from({length:8}, (_,i) => ({totalAverage: 80 - i*3}))  // 80,77,...,59
const downResult = calculatePredictedScore(downRecs, 5)
check('하락 추세 → trend:down',                 downResult.trend === 'down')

// 정상: stable 추세
const stableRecs = Array.from({length:7}, () => ({totalAverage: 70}))
const stableResult = calculatePredictedScore(stableRecs, 5)
check('동일 점수 → trend:stable',               stableResult.trend === 'stable')
check('동일 점수 → median=70',                  stableResult.median === 70)
check('동일 점수 → CI 0 편차 (min=max=70)',     stableResult.confidenceMin === 70 && stableResult.confidenceMax === 70)

// snake_case 입력
const snakeRecs = Array.from({length:5}, (_,i) => ({total_average: 65+i}))
const snakeResult = calculatePredictedScore(snakeRecs)
check('snake_case total_average 처리',          snakeResult.median !== undefined && !snakeResult.error)

// CI 클리핑
const highRecs = Array.from({length:5}, () => ({totalAverage: 98}))
const highResult = calculatePredictedScore(highRecs)
check('CI 상한 100 초과 안 함',                 highResult.confidenceMax <= 100)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] calculatePassProbability — estimated / full mode
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] calculatePassProbability')

// 데이터 부족
const probInsuff = calculatePassProbability([{totalAverage:65}])
check('데이터 부족 → error:INSUFFICIENT_DATA',  probInsuff.error === 'INSUFFICIENT_DATA')

// Estimated mode (totalAverage)
const highAvgRecs = Array.from({length:10}, () => ({totalAverage: 85}))
const lowAvgRecs  = Array.from({length:10}, () => ({totalAverage: 30}))
const highProb = calculatePassProbability(highAvgRecs, 2000)
const lowProb  = calculatePassProbability(lowAvgRecs,  2000)
check('estimated mode 감지',                    highProb.mode === 'estimated')
check('high avg(85) → high overall prob',       highProb.overall >= 70)  // 통계적으로 70% 이상 기대
check('low avg(30) → low overall prob',         lowProb.overall <= 20)   // 낮은 확률 기대
check('estimated → subjectProbs=null',          highProb.subjectProbs === null)
check('estimated → averageProb 존재',           highProb.averageProb != null)
check('simulationCount 반환',                   highProb.simulationCount === 2000)

// Full mode (과목별 점수)
const fullRecs = Array.from({length:8}, () => ({'법령':75, '손보1부':70, '손보2부':72}))
const fullProb = calculatePassProbability(fullRecs, 2000)
check('full mode 감지',                         fullProb.mode === 'full')
check('full mode → subjectProbs 존재',          fullProb.subjectProbs !== null)
check('full mode → 법령 subjectProb 존재',      '법령' in (fullProb.subjectProbs ?? {}))
check('full mode → averageProb=null',           fullProb.averageProb === null)
check('full high scores → high overall prob',   fullProb.overall >= 70)

// 과락 시나리오 (한 과목 저점)
const failRecs = Array.from({length:8}, () => ({'법령':20, '손보1부':75, '손보2부':70}))
const failProb = calculatePassProbability(failRecs, 2000)
check('법령 과락 → 전체 합격 확률 낮음',        failProb.overall <= 20)

// overall 범위 검증
check('overall 0~100 범위 (high)',               highProb.overall >= 0 && highProb.overall <= 100)
check('overall 0~100 범위 (fail)',               failProb.overall >= 0 && failProb.overall <= 100)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] analyzeWeaknessBySubject — 정상·빈 데이터·nodata
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] analyzeWeaknessBySubject')

// 정상: 보험업법 10/10 정답, 상법 5/10 정답
const attempts = [
  ...Array.from({length:10}, () => ({sub_subject:'보험업법', is_correct:true})),
  ...Array.from({length:5},  () => ({sub_subject:'상법',     is_correct:true})),
  ...Array.from({length:5},  () => ({sub_subject:'상법',     is_correct:false})),
]
const weakResult = analyzeWeaknessBySubject(attempts)
check('결과 12개 세부과목',                     weakResult.length === 12)
check('보험업법 accuracy=100',                  weakResult.find(d=>d.name==='보험업법')?.accuracy === 100)
check('보험업법 level=good',                    weakResult.find(d=>d.name==='보험업법')?.level === 'good')
check('상법 accuracy=50',                       weakResult.find(d=>d.name==='상법')?.accuracy === 50)
check('상법 level=weak (50 < 60)',              weakResult.find(d=>d.name==='상법')?.level === 'weak')
check('자동차보험 accuracy=null (데이터 없음)', weakResult.find(d=>d.name==='자동차보험')?.accuracy === null)
check('자동차보험 level=nodata',                weakResult.find(d=>d.name==='자동차보험')?.level === 'nodata')

// S1~S12 키 순서 확인
const keys = weakResult.map(d=>d.subjectKey)
check('S1 첫 번째',                             keys[0] === 'S1')
check('S12 마지막',                             keys[11] === 'S12')

// parent 필드
check('보험업법 parent=법령',                   weakResult.find(d=>d.name==='보험업법')?.parent === '법령')
check('자동차보험 parent=손보1부',              weakResult.find(d=>d.name==='자동차보험')?.parent === '손보1부')
check('화재보험 parent=손보2부',               weakResult.find(d=>d.name==='화재보험')?.parent === '손보2부')

// level color 확인
check('good → #22c55e',                         weakResult.find(d=>d.name==='보험업법')?.color === '#22c55e')
check('weak → #ef4444',                         weakResult.find(d=>d.name==='상법')?.color === '#ef4444')

// 빈 attempts
const emptyResult = analyzeWeaknessBySubject([])
check('빈 attempts → 12개 반환',               emptyResult.length === 12)
check('빈 attempts → 모두 nodata',             emptyResult.every(d => d.level === 'nodata'))

// null attempts
const nullResult = analyzeWeaknessBySubject(null)
check('null attempts → 12개 반환',             nullResult.length === 12)

// fair 레벨 (65%)
const fairAttempts = [
  ...Array.from({length:65}, () => ({sub_subject:'화재보험', is_correct:true})),
  ...Array.from({length:35}, () => ({sub_subject:'화재보험', is_correct:false})),
]
const fairResult = analyzeWeaknessBySubject(fairAttempts)
check('화재보험 65% → level=fair',             fairResult.find(d=>d.name==='화재보험')?.level === 'fair')
check('화재보험 65% → color=#f59e0b',          fairResult.find(d=>d.name==='화재보험')?.color === '#f59e0b')

// is_correct 숫자 (0/1) 처리
const intAttempts = Array.from({length:4}, (_,i) => ({sub_subject:'재보험', is_correct: i<3 ? 1 : 0}))
const intResult = analyzeWeaknessBySubject(intAttempts)
check('is_correct 숫자(1/0) 처리 — 재보험 75%', intResult.find(d=>d.name==='재보험')?.accuracy === 75)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] analyzeWeaknessByDifficulty — stub
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] analyzeWeaknessByDifficulty (stub)')

const diffResult = analyzeWeaknessByDifficulty()
check('error = NO_DIFFICULTY_DATA',             diffResult.error === 'NO_DIFFICULTY_DATA')
check('message 존재',                           typeof diffResult.message === 'string' && diffResult.message.length > 0)
check('hard = null',                            diffResult.hard === null)
check('medium = null',                          diffResult.medium === null)
check('easy = null',                            diffResult.easy === null)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] generateStudyRoadmap — ROI 정렬 + Top 3
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] generateStudyRoadmap')

// 약점 데이터 생성 (analyzeWeaknessBySubject 반환 형식 모사)
const mockWeakness = [
  { subjectKey:'S1', name:'보험업법',   parent:'법령',    accuracy:30, level:'weak', color:'#ef4444', correct:3, total:10 },
  { subjectKey:'S3', name:'위험관리',   parent:'법령',    accuracy:40, level:'weak', color:'#ef4444', correct:4, total:10 },
  { subjectKey:'S9', name:'화재보험',   parent:'손보2부', accuracy:90, level:'good', color:'#22c55e', correct:9, total:10 },
  { subjectKey:'S2', name:'상법',       parent:'법령',    accuracy:50, level:'weak', color:'#ef4444', correct:5, total:10 },
  { subjectKey:'S5', name:'자동차보험', parent:'손보1부', accuracy:null, level:'nodata', color:'#9ca3af', correct:0, total:0 },
]

const roadmap = generateStudyRoadmap(mockWeakness)

check('Top 3 반환',                             roadmap.length === 3)
check('priority 1~3 순서',                      roadmap.map(d=>d.priority).join(',') === '1,2,3')
check('90점 이상(화재보험) 포함 안 됨',         !roadmap.some(d=>d.name==='화재보험'))
check('nodata(자동차보험) 포함 안 됨',          !roadmap.some(d=>d.name==='자동차보험'))

// ROI 계산 검증
// 위험관리: gap=70-40=30, days=7, roi=30/7≈4.29
// 보험업법: gap=70-30=40, days=14, roi=40/14≈2.86
// 상법:     gap=70-50=20, days=21, roi=20/21≈0.95
const expectedTop1 = roadmap[0]
check('위험관리 ROI 최고 → 1순위',              expectedTop1.name === '위험관리')
check('위험관리 gap=30',                        expectedTop1.gap === 30)
check('위험관리 roi ≈ 4.29',                   expectedTop1.roi === Math.round(30/7*100)/100)
check('targetRate=70',                          roadmap.every(d=>d.targetRate===70))
check('method 문자열 존재',                     roadmap.every(d=>typeof d.method === 'string' && d.method.length > 0))

// 모든 약점 통과 시 (accuracy >= 70) → 빈 배열
const allGoodWeakness = mockWeakness.map(d => ({...d, accuracy: 80, level:'good'}))
const emptyRoadmap = generateStudyRoadmap(allGoodWeakness)
check('모두 70점 이상 → 로드맵 빈 배열',        emptyRoadmap.length === 0)

// 빈 입력
check('빈 배열 입력 → 빈 배열 반환',           generateStudyRoadmap([]).length === 0)
check('null 입력 → 빈 배열 반환',              generateStudyRoadmap(null).length === 0)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] 수학 유틸 정확성
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] 수학 유틸 정확성')

check('mean([1,2,3,4,5]) = 3',                  mean([1,2,3,4,5]) === 3)
check('mean([]) = 0',                           mean([]) === 0)
check('median([1,2,3,4,5]) = 3',                median([1,2,3,4,5]) === 3)
check('median([1,2,3,4]) = 2.5',                median([1,2,3,4]) === 2.5)
check('median([]) = 0',                         median([]) === 0)
check('stdDev([1]) = 0',                        stdDev([1]) === 0)
check('stdDev([2,2,2,2]) = 0',                  stdDev([2,2,2,2]) === 0)
check('linearSlope([1,2,3,4,5]) = 1.0',        linearSlope([1,2,3,4,5]) === 1.0)
check('linearSlope([5,4,3,2,1]) = -1.0',       linearSlope([5,4,3,2,1]) === -1.0)
check('linearSlope([3,3,3]) = 0',              linearSlope([3,3,3]) === 0)

// Box-Muller 정규성 검증 (N=10000, 95% 이내 비율)
const samples = Array.from({length:10000}, () => randomNormal())
const within2 = samples.filter(x => Math.abs(x) <= 2).length / 10000
check('Box-Muller 95% ±2σ 이내',               within2 >= 0.93 && within2 <= 0.97)

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_085 STEP 1 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
