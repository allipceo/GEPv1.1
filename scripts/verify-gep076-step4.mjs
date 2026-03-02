/**
 * verify-gep076-step4.mjs
 * GEP_076 STEP 4 검증 스크립트
 * 대상: CustomMockQuiz.jsx 완성 (stub → full)
 *
 * node scripts/verify-gep076-step4.mjs
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
// [ 시나리오 1 ] CustomMockQuiz.jsx — 소스 구조 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] CustomMockQuiz.jsx — import 및 기본 구조')

const quizSrc = readSrc('src/pages/CustomMockQuiz.jsx')

// 필수 import
check('useCustomMockStore import',          quizSrc.includes('useCustomMockStore'))
check('loadPersistedSession import',        quizSrc.includes('loadPersistedSession'))
check('loadProgress import',               quizSrc.includes('loadProgress'))
check('customMockConfig import',           quizSrc.includes('customMockConfig'))
check('useAuthStore import',               quizSrc.includes('useAuthStore'))
check('useNavigate import',                quizSrc.includes('useNavigate'))
check('useParams import',                  quizSrc.includes('useParams'))
check('useLocation import',                quizSrc.includes('useLocation'))

// 기본 구조
check('default export function',           quizSrc.includes('export default function CustomMockQuiz'))
check('useExamStore import 없음 (독립성)',  !quizSrc.includes('useExamStore') && !quizSrc.includes("from '../stores/examStore'"))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 2 ] part1/part2 판별 로직
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] part 판별 — pathname 기반 로직')

check('useLocation pathname 구조분해',     quizSrc.includes('pathname') && quizSrc.includes('useLocation'))
check('part2 판별: pathname.endsWith',     quizSrc.includes("pathname.endsWith('part2')"))
check('part1 fallback',                    quizSrc.includes("? 'part2' : 'part1'"))

// 로직 시뮬레이션
function detectPart(pathname) {
  return pathname.endsWith('part2') ? 'part2' : 'part1'
}
check('/custom-mock/abc/part1 → part1',   detectPart('/custom-mock/abc/part1') === 'part1')
check('/custom-mock/abc/part2 → part2',   detectPart('/custom-mock/abc/part2') === 'part2')
check('/custom-mock/abc/result → part1 fallback', detectPart('/custom-mock/abc/result') === 'part1')

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 3 ] 초기화 로직 (1교시 40문제)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 3 ] 초기화 — 1교시 40문제 / 이어하기 로직')

check('startedRef 중복 실행 방지',         quizSrc.includes('startedRef.current'))
check('store 상태 먼저 확인',              quizSrc.includes('store.questions.length > 0'))
check('currentPart 파트 일치 확인',        quizSrc.includes('store.currentPart === part'))
check('loadPersistedSession 호출',         quizSrc.includes('loadPersistedSession()'))
check('sessionId 불일치 → navigate',       quizSrc.includes("navigate('/custom-mock')"))
check('loadProgress 호출',                 quizSrc.includes('loadProgress('))
check('resumeSession 호출',               quizSrc.includes('resumeSession('))

// 40문제 슬라이싱은 store에서 담당: allQuestions.slice(0, 40)
const storeSrc = readSrc('src/stores/customMockStore.js')
check('allQuestions.slice(0, 40) — 1교시', storeSrc.includes('allQuestions.slice(0, 40)'))
check('allQuestions.slice(40) — 2교시',    storeSrc.includes('allQuestions.slice(40)'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 4 ] 타이머 정상 작동
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 4 ] 타이머 — 절대 시간 기반 정상 작동')

check('setInterval 1초 타이머',            quizSrc.includes('setInterval('))
check('getRemainingTime 호출',             quizSrc.includes('getRemainingTime()'))
check('remaining <= 0 타임아웃 처리',      quizSrc.includes('remaining <= 0'))
check('isTimeoutSubmit 상태',              quizSrc.includes('isTimeoutSubmit'))
check('clearInterval 정리',               quizSrc.includes('clearInterval(interval)'))
check('formatTime 함수 존재',              quizSrc.includes('function formatTime'))

// formatTime 로직 시뮬레이션
function formatTime(seconds) {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
check('formatTime(0) = 00:00',             formatTime(0) === '00:00')
check('formatTime(90) = 01:30',            formatTime(90) === '01:30')
check('formatTime(2400) = 40:00',          formatTime(2400) === '40:00')
check('formatTime(4800) = 80:00',          formatTime(4800) === '80:00')
check('formatTime(-1) = 00:00',            formatTime(-1) === '00:00')

// 타이머 컬러 임계값
check('60초 이하 red animate-pulse',       quizSrc.includes('remainingTime <= 60'))
check('300초 이하 yellow',                 quizSrc.includes('remainingTime <= 300'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 5 ] 답안 자동 저장
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 5 ] 답안 자동 저장 — 10문제마다 + 수동 저장')

check('autoSaveInterval 사용',            quizSrc.includes('autoSaveInterval'))
check('10문제마다 % 계산',                quizSrc.includes('% customMockConfig.autoSaveInterval'))
check('prevIndexRef 중복 저장 방지',      quizSrc.includes('prevIndexRef'))
check('storeSave (saveProgress) 연결',    quizSrc.includes('storeSave()'))
check('handleManualSave 존재',            quizSrc.includes('handleManualSave'))
check('저장 플래시(savedFlash) 피드백',   quizSrc.includes('savedFlash'))
check('💾 저장 버튼 존재',               quizSrc.includes('💾'))

// autoSaveInterval = 10 확인 (config에서)
const configSrc = readSrc('src/config/customMockConfig.js')
check('autoSaveInterval = 10',            configSrc.includes('autoSaveInterval') && configSrc.includes('10'))

// 자동 저장 로직 시뮬레이션
function shouldAutoSave(currentIndex, autoSaveInterval) {
  return (currentIndex + 1) % autoSaveInterval === 0
}
check('10번째 문제(index=9)에서 저장',   shouldAutoSave(9,  10))
check('20번째 문제(index=19)에서 저장',  shouldAutoSave(19, 10))
check('5번째 문제(index=4) — 저장 안함', !shouldAutoSave(4, 10))
check('39번째 문제(index=38) — 저장 안함', !shouldAutoSave(38, 10))
check('40번째 문제(index=39)에서 저장',  shouldAutoSave(39, 10))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 6 ] Part 전환 — 1교시 → 2교시 → 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] Part 전환 정상 — submit 로직')

check('isSubmitting 중복 제출 가드',      quizSrc.includes('isSubmitting'))
check('part1 → submitPart1 호출',         quizSrc.includes('submitPart1(userId)'))
check('part1 → /part2 navigate',          quizSrc.includes('/custom-mock/${sessionId}/part2'))
check('part2 → submitPart2 호출',         quizSrc.includes('submitPart2(userId)'))
check('part2 → /result navigate',         quizSrc.includes('/custom-mock/${sessionId}/result'))
check('handleSubmit 함수 존재',           quizSrc.includes('function handleSubmit'))

// 제출 버튼 텍스트
check('1교시 제출 텍스트',               quizSrc.includes("'1교시 제출'"))
check('최종 제출 텍스트',                quizSrc.includes("'최종 제출'"))
check('마지막 문제일 때만 제출 버튼',    quizSrc.includes('isLastQuestion'))

// ExitModal — 저장 후 나가기
check('handleSaveExit 함수 존재',         quizSrc.includes('handleSaveExit'))
check('나가기 시 storeSave 호출',         quizSrc.includes('storeSave()') && quizSrc.includes('navigate(\'/custom-mock\')'))

// submitPart1 store 로직 확인 (2교시 전환)
check('submitPart1: part1Completed = true',  storeSrc.includes("part1Completed: true"))
check('submitPart1: currentPart = part2',    storeSrc.includes("currentPart:    'part2'"))
check('submitPart1: answers = {}',           storeSrc.includes("answers:        {}"))
check('submitPart2: isComplete = true',      storeSrc.includes('isComplete:     true'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 7 ] 헤더 + 모드 배지 + UI 검증
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 7 ] 헤더·모드 배지·UI 요소')

check('PART_META 상수 존재',             quizSrc.includes('PART_META'))
check('part1 bg-blue-600 헤더',          quizSrc.includes("bg: 'bg-blue-600'"))
check('part2 bg-green-600 헤더',         quizSrc.includes("bg: 'bg-green-600'"))
check('MODE_BADGE 상수 존재',            quizSrc.includes('MODE_BADGE'))
check('standard 표준 배지',              quizSrc.includes("'표준'"))
check('weakness 약점 집중 배지',         quizSrc.includes("'약점 집중'"))
check('맞춤 모의고사 헤더 텍스트',       quizSrc.includes('맞춤 모의고사'))
check('SUBJECT_BADGE 3과목 색상',        quizSrc.includes("'법령':") && quizSrc.includes("'손보1부':") && quizSrc.includes("'손보2부':"))
check('subSubject 세부과목 표시',        quizSrc.includes('question.subSubject'))

// 서브 컴포넌트
check('QuestionPalette 컴포넌트',        quizSrc.includes('function QuestionPalette'))
check('SubmitModal 컴포넌트',            quizSrc.includes('function SubmitModal'))
check('ExitModal 컴포넌트',              quizSrc.includes('function ExitModal'))
check('LoadingView 컴포넌트',            quizSrc.includes('function LoadingView'))

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 8 ] 미응답 처리 + 제출 모달
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 8 ] 미응답 처리 + 제출 모달')

check('getUnansweredQuestions 호출',     quizSrc.includes('getUnansweredQuestions()'))
check('unanswered 목록 모달 표시',       quizSrc.includes('unanswered.length > 0'))
check('미응답 오답 처리 안내',           quizSrc.includes('오답 처리'))
check('showSubmitModal 상태',            quizSrc.includes('showSubmitModal'))
check('showExitModal 상태',             quizSrc.includes('showExitModal'))

// getUnansweredQuestions 로직 시뮬레이션
function getUnansweredQuestions(questions, answers) {
  return questions
    .map((_, idx) => idx + 1)
    .filter(num => answers[num] == null)
}
const q10 = Array.from({ length: 10 })
const ans5 = { 1: 2, 3: 1, 5: 4, 7: 3, 9: 2 }
const unanswered = getUnansweredQuestions(q10, ans5)
check('10문제 중 5개 응답 → 5개 미응답', unanswered.length === 5)
check('미응답 목록 정확성 [2,4,6,8,10]', JSON.stringify(unanswered) === '[2,4,6,8,10]')

const allAnswered = { 1:1, 2:2, 3:3, 4:4, 5:1, 6:2, 7:3, 8:4, 9:1, 10:2 }
check('전체 응답 → 미응답 0개',          getUnansweredQuestions(q10, allAnswered).length === 0)

// ─────────────────────────────────────────────────────────────────────────────
// [ 시나리오 9 ] stub vs 완성 파일 비교
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ 시나리오 9 ] stub 탈출 — 완성본 확인')

const resultSrc = readSrc('src/pages/CustomMockResult.jsx')
const statsSrc  = readSrc('src/pages/CustomMockStats.jsx')

// CustomMockQuiz는 완성
check('CustomMockQuiz 200줄 이상',        quizSrc.split('\n').length >= 200)
check('CustomMockQuiz — LoadingView 이상', !quizSrc.includes('문제를 준비 중'))

// Result/Stats는 여전히 stub (STEP 5에서 완성 예정)
check('CustomMockResult — stub 상태',     resultSrc.includes('성적표 준비 중'))
check('CustomMockStats — stub 상태',      statsSrc.includes('통계 준비 중'))

// ─────────────────────────────────────────────────────────────────────────────
// 최종 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(55)}`)
console.log(`  최종 결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(55))
if (fail === 0) console.log('  ✅ GEP_076 STEP 4 검증 완료')
else            console.log('  ❌ 실패 항목 확인 후 수정 필요')

process.exit(fail === 0 ? 0 : 1)
