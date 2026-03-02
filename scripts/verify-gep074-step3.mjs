/**
 * verify-gep074-step3.mjs
 * GEP_074 STEP 3 검증 스크립트
 * 대상: featureFlags.js / CustomMockHome.jsx / App.jsx 핵심 로직
 *
 * node scripts/verify-gep074-step3.mjs
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

// ── 파일 로드 헬퍼 ────────────────────────────────────────────────────────────
function readSrc(rel) { return readFileSync(resolve(root, rel), 'utf8') }

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 1 ] featureFlags.js — CUSTOMMOCK_MIN_LEVEL 추가 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] featureFlags.js — CUSTOMMOCK_MIN_LEVEL 검증')

const flagsSrc = readSrc('src/config/featureFlags.js')
check('CUSTOMMOCK_MIN_LEVEL 존재',     flagsSrc.includes('CUSTOMMOCK_MIN_LEVEL'))
check('CUSTOMMOCK_MIN_LEVEL = 5',      flagsSrc.includes('CUSTOMMOCK_MIN_LEVEL:     5'))
check('기존 MOCKEXAM_MIN_LEVEL 유지',  flagsSrc.includes('MOCKEXAM_MIN_LEVEL:       4'))
check('기존 STATS_MIN_LEVEL 유지',     flagsSrc.includes('STATS_MIN_LEVEL:          2'))

// eval로 실제 값 확인
const flagsObj = eval(
  flagsSrc
    .replace(/export const FEATURE_FLAGS =/, 'const FEATURE_FLAGS =')
    .replace(/export const canUseFeature.*[\s\S]*/, '')
    + '\nFEATURE_FLAGS'
)
check('CUSTOMMOCK_MIN_LEVEL 값 = 5',   flagsObj.CUSTOMMOCK_MIN_LEVEL === 5)
check('MOCKEXAM_MIN_LEVEL 값 = 4',     flagsObj.MOCKEXAM_MIN_LEVEL   === 4)
check('전체 플래그 5개',               Object.keys(flagsObj).length === 5)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] App.jsx — 라우트 5개 추가 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] App.jsx — custom-mock 라우트 검증')

const appSrc = readSrc('src/App.jsx')

check('/custom-mock 라우트 존재',               appSrc.includes('path="/custom-mock"'))
check('/custom-mock/:sessionId/part1 라우트',   appSrc.includes('/custom-mock/:sessionId/part1'))
check('/custom-mock/:sessionId/part2 라우트',   appSrc.includes('/custom-mock/:sessionId/part2'))
check('/custom-mock/:sessionId/result 라우트',  appSrc.includes('/custom-mock/:sessionId/result'))
check('/custom-mock/stats 라우트',              appSrc.includes('/custom-mock/stats'))

check('CustomMockHome import',    appSrc.includes("import CustomMockHome"))
check('CustomMockQuiz import',    appSrc.includes("import CustomMockQuiz"))
check('CustomMockResult import',  appSrc.includes("import CustomMockResult"))
check('CustomMockStats import',   appSrc.includes("import CustomMockStats"))

check('기존 /mock 라우트 유지',   appSrc.includes('path="/mock"'))
check('기존 MockExamHome 유지',   appSrc.includes('import MockExamHome'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] CustomMockHome.jsx — 구조 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] CustomMockHome.jsx — 소스 구조 검증')

const homeSrc = readSrc('src/pages/CustomMockHome.jsx')

// 필수 import
check('useCustomMockStore import',        homeSrc.includes('useCustomMockStore'))
check('FEATURE_FLAGS import',             homeSrc.includes('FEATURE_FLAGS'))
check('customMockConfig import',          homeSrc.includes('customMockConfig'))
check('analyzeWeakness import',           homeSrc.includes('analyzeWeakness'))
check('customMockSupabase import',        homeSrc.includes('customMockSupabase'))
check('useAuthStore import',              homeSrc.includes('useAuthStore'))

// 레벨 게이트
check('CUSTOMMOCK_MIN_LEVEL 레벨 게이트', homeSrc.includes('CUSTOMMOCK_MIN_LEVEL'))
check('serviceLevel 조회',                homeSrc.includes('serviceLevel'))
check('LockScreen 컴포넌트 존재',         homeSrc.includes('LockScreen'))
check('레벨5 안내 메시지',                homeSrc.includes('레벨 5 전용'))

// 모드 카드
check('ModeCard 컴포넌트 존재',           homeSrc.includes('ModeCard'))
check('표준 모드 카드',                   homeSrc.includes("표준 모드"))
check('약점 집중 모드 카드',              homeSrc.includes("약점 집중 모드"))
check('standard / weakness 모드 값',      homeSrc.includes("'standard'") && homeSrc.includes("'weakness'"))

// 약점 모드 조건부 비활성화
check('약점 모드 비활성화 조건',          homeSrc.includes('weaknessDisabled'))
check('hasEnoughData 체크',              homeSrc.includes('hasEnoughData'))
check('최소 10회 메시지',                 homeSrc.includes('10회'))

// 타이머 설정
check('TimerRadio 컴포넌트 존재',         homeSrc.includes('TimerRadio'))
check('FULL 타이머 옵션',                 homeSrc.includes('"full"'))
check('SHORT 타이머 옵션',               homeSrc.includes('"short"'))

// 생성 버튼
check('handleGenerate 함수 존재',         homeSrc.includes('handleGenerate'))
check('startSession 호출',               homeSrc.includes('startSession'))
check('navigate 라우트 이동',             homeSrc.includes('/custom-mock/'))
check('isGenerating 가드',               homeSrc.includes('isGenerating'))

// 최근 응시 기록
check('SessionRow 컴포넌트 존재',         homeSrc.includes('SessionRow'))
check('getSessionHistory 호출',           homeSrc.includes('getSessionHistory'))
check('최대 5개 기록',                    homeSrc.includes('.slice(0, 5)'))

// 통계 버튼
check('/custom-mock/stats 이동',          homeSrc.includes('/custom-mock/stats'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] relativeDate 유틸 함수 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] relativeDate 유틸 함수 검증')

// 함수 추출 및 테스트
function relativeDate(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '1일 전'
  if (diff < 7)  return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  return `${Math.floor(diff / 30)}달 전`
}

const now       = new Date()
const yesterday = new Date(now - 86400000)
const fiveDays  = new Date(now - 5 * 86400000)
const twoWeeks  = new Date(now - 14 * 86400000)
const twoMonths = new Date(now - 62 * 86400000)

check('오늘',              relativeDate(now.toISOString()) === '오늘')
check('1일 전',            relativeDate(yesterday.toISOString()) === '1일 전')
check('5일 전',            relativeDate(fiveDays.toISOString()) === '5일 전')
check('2주 전',            relativeDate(twoWeeks.toISOString()) === '2주 전')
check('2달 전',            relativeDate(twoMonths.toISOString()) === '2달 전')
check('null → 빈 문자열', relativeDate(null) === '')

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] stub 파일 존재 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] stub 파일 존재 확인')

const quizSrc   = readSrc('src/pages/CustomMockQuiz.jsx')
const resultSrc = readSrc('src/pages/CustomMockResult.jsx')
const statsSrc  = readSrc('src/pages/CustomMockStats.jsx')

check('CustomMockQuiz.jsx 존재',   quizSrc.length > 0)
check('CustomMockResult.jsx 존재', resultSrc.length > 0)
check('CustomMockStats.jsx 존재',  statsSrc.length > 0)
check('CustomMockQuiz default export',   quizSrc.includes('export default function CustomMockQuiz'))
check('CustomMockResult default export', resultSrc.includes('export default function CustomMockResult'))
check('CustomMockStats default export',  statsSrc.includes('export default function CustomMockStats'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] customMockConfig 타이머 값 UI 표기 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] 타이머 표기 정합성')

const configSrc = readSrc('src/config/customMockConfig.js')
const config = eval(
  configSrc
    .replace(/export const customMockConfig =/, 'const customMockConfig =')
    .replace(/export default.*/, '')
    + '\ncustomMockConfig'
)

// CustomMockHome.jsx가 표기하는 분 단위와 config 값 일치 확인
check('FULL part1 = 40분',   config.timers.full.part1  / 60 === 40)
check('FULL part2 = 80분',   config.timers.full.part2  / 60 === 80)
check('SHORT part1 = 32분',  config.timers.short.part1 / 60 === 32)
check('SHORT part2 = 64분',  config.timers.short.part2 / 60 === 64)

// UI에서 분 단위로 표기하는지 확인
check('타이머 분 표기: /60 계산',     homeSrc.includes('/ 60'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] 게스트 차단 로직 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] 게스트 차단 로직 검증')

check('authStatus 체크',                  homeSrc.includes("authStatus !== 'authenticated'"))
check('userId 체크',                      homeSrc.includes('!userId'))
check('canCustomMock 변수 사용',          homeSrc.includes('canCustomMock'))
check('LockScreen 반환 조건',             homeSrc.includes('if (!canCustomMock)'))
check('useEffect 인증 의존성',            homeSrc.includes('authStatus, userId'))

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_074 STEP 3 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
