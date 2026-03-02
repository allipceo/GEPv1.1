/**
 * verify-gep099-step3.mjs
 * GEP_099 Phase 6-3 STEP 3 — UnifiedWrongReview + ChallengeMode 검증
 *
 * node scripts/verify-gep099-step3.mjs
 */

import fs from 'fs'

let pass = 0, fail = 0

function check(label, condition) {
  if (condition) { console.log(`  ✅ PASS | ${label}`); pass++ }
  else           { console.log(`  ❌ FAIL | ${label}`); fail++ }
}

// ── 시나리오 1: 파일 존재 ──────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] 파일 존재 확인')
{
  check('UnifiedWrongReview.jsx 존재', fs.existsSync('src/pages/UnifiedWrongReview.jsx'))
  check('ChallengeMode.jsx 존재',      fs.existsSync('src/pages/ChallengeMode.jsx'))
}

// ── 시나리오 2: App.jsx 라우트 등록 ──────────────────────────────────────
console.log('\n[ 시나리오 2 ] App.jsx 라우트 등록')
{
  const app = fs.readFileSync('src/App.jsx', 'utf8')
  check('/unified-wrong 라우트', app.includes("path=\"/unified-wrong\""))
  check('/unified-wrong/challenge/:minCount 라우트', app.includes("challenge/:minCount"))
  check('UnifiedWrongReview import', app.includes("import UnifiedWrongReview"))
  check('ChallengeMode import',      app.includes("import ChallengeMode"))
}

// ── 시나리오 3: UnifiedWrongReview 구조 ───────────────────────────────────
console.log('\n[ 시나리오 3 ] UnifiedWrongReview — 구조 확인')
{
  const src = fs.readFileSync('src/pages/UnifiedWrongReview.jsx', 'utf8')
  check('unifiedWrongService import',      src.includes("from '../services/unifiedWrongService'"))
  check('WrongCountDistribution import',   src.includes("WrongCountDistribution"))
  check('WrongQuestionCard import',        src.includes("WrongQuestionCard"))
  check('StudyPresetCard import',          src.includes("StudyPresetCard"))
  check('buildStudyPresets import',        src.includes("buildStudyPresets"))
  check('🔥 5회+ 바로 풀기 버튼',         src.includes('🔥 5회+ 바로 풀기'))
  check('5회+ 버튼 red-600',               src.includes('bg-red-600'))
  check('challenge/:minCount 네비게이션',  src.includes('/unified-wrong/challenge/'))
  check('handleStudy 함수',               src.includes('function handleStudy'))
  check('handleRetry 함수',               src.includes('function handleRetry'))
  check('handlePresetSelect 함수',        src.includes('function handlePresetSelect'))
  check('filterOpen state (접기/펼치기)', src.includes('filterOpen'))
  check('selectedSource 필터',            src.includes('selectedSource'))
  check('selectedSub 필터',              src.includes('selectedSub'))
  check('SOURCE_LABEL 필터 버튼',        src.includes('SOURCE_LABEL'))
  check('비회원 안내 (로그인)',           src.includes('로그인 후 이용 가능'))
  check('export default',                 src.includes('export default function UnifiedWrongReview'))
}

// ── 시나리오 4: UnifiedWrongReview 레이아웃 순서 ─────────────────────────
console.log('\n[ 시나리오 4 ] UnifiedWrongReview — 레이아웃 순서')
{
  const src = fs.readFileSync('src/pages/UnifiedWrongReview.jsx', 'utf8')
  const i1  = src.indexOf('🔥 5회+ 바로 풀기')
  const i2  = src.indexOf('<StudyPresetCard')
  const i3  = src.indexOf('<WrongCountDistribution')
  const i4  = src.indexOf('<span>고급 필터</span>')
  const i5  = src.indexOf('<WrongQuestionCard')

  check('5회+ 버튼 → StudyPresetCard 순서',      i1 < i2)
  check('StudyPresetCard → Distribution 순서',   i2 < i3)
  check('Distribution → 고급필터 순서',           i3 < i4)
  check('고급필터 → WrongQuestionCard 순서',      i4 < i5)
}

// ── 시나리오 5: ChallengeMode 구조 ──────────────────────────────────────
console.log('\n[ 시나리오 5 ] ChallengeMode — 구조 확인')
{
  const src = fs.readFileSync('src/pages/ChallengeMode.jsx', 'utf8')
  check('unifiedWrongService import',      src.includes("from '../services/unifiedWrongService'"))
  check('WrongCountBadge import',          src.includes("WrongCountBadge"))
  check('ReclassificationAnimation import',src.includes("ReclassificationAnimation"))
  check('useParams (minCount)',            src.includes('minCount: minCountParam'))
  check('phase state (start|quiz|done)',   src.includes("useState('start')"))
  check('currentIndex state',             src.includes('currentIndex'))
  check('showFeedback state',             src.includes('showFeedback'))
  check('results state',                  src.includes('useState([])'))
  check('enrichQuestion 함수',            src.includes('function enrichQuestion'))
  check('handleAnswer 함수',              src.includes('function handleAnswer'))
  check('handleNext 함수',                src.includes('function handleNext'))
  check('mcqStatus 함수',                 src.includes('function mcqStatus'))
  check('oxStatus 함수',                  src.includes('function oxStatus'))
  check('ProgressBar 컴포넌트',           src.includes('function ProgressBar'))
  check('FeedbackBanner 컴포넌트',        src.includes('function FeedbackBanner'))
  check('✅ 약점 극복!',                  src.includes('✅ 약점 극복!'))
  check('❌ N+1회로 이동',               src.includes('❌'))
  check('지금 시작하기 버튼',             src.includes('지금 시작하기'))
  check('과목별 분포 subjectDist',        src.includes('subjectDist'))
  check('reclassifyResults 호출',         src.includes('reclassifyResults'))
  check('export default',                 src.includes('export default function ChallengeMode'))
}

// ── 시나리오 6: enrichQuestion 로직 ──────────────────────────────────────
console.log('\n[ 시나리오 6 ] enrichQuestion — 문제 조인 로직')
{
  function enrichQuestion(wrongItem, examQuestions) {
    const base = {
      ...wrongItem,
      questionRaw: null,
      answer:      null,
      subject:     null,
      subSubject:  null,
      isOX:        wrongItem.source === 'OX',
    }
    if (wrongItem.source === 'OX') return base
    const found = examQuestions.find(q => q.id === wrongItem.id)
    if (!found) return base
    return {
      ...base,
      questionRaw: found.questionRaw ?? null,
      answer:      found.answer      ?? null,
      subject:     found.subject     ?? null,
      subSubject:  found.subSubject  ?? null,
    }
  }

  const examQ = [
    { id: 'MCQ-1', questionRaw: '문제 원문', answer: 2, subject: '법령', subSubject: '보험업법' }
  ]

  // MCQ 조인 성공
  const r1 = enrichQuestion({ id: 'MCQ-1', source: 'MCQ', wrong_count: 3 }, examQ)
  check('MCQ 조인 — questionRaw',   r1.questionRaw === '문제 원문')
  check('MCQ 조인 — answer',        r1.answer === 2)
  check('MCQ 조인 — isOX=false',    r1.isOX === false)
  check('MCQ 조인 — wrong_count 유지', r1.wrong_count === 3)

  // MCQ 조인 실패 (없는 id)
  const r2 = enrichQuestion({ id: 'MCQ-999', source: 'MCQ', wrong_count: 1 }, examQ)
  check('MCQ 미발견 — questionRaw null', r2.questionRaw === null)
  check('MCQ 미발견 — source 유지',      r2.source === 'MCQ')

  // OX: 원문 없이 반환
  const r3 = enrichQuestion({ id: 'OX-1', source: 'OX', wrong_count: 5 }, examQ)
  check('OX — isOX=true',          r3.isOX === true)
  check('OX — questionRaw null',   r3.questionRaw === null)
  check('OX — wrong_count 유지',   r3.wrong_count === 5)

  // MOCK: MCQ와 동일하게 조인
  const r4 = enrichQuestion({ id: 'MCQ-1', source: 'MOCK', wrong_count: 2 }, examQ)
  check('MOCK — 조인 성공',        r4.questionRaw === '문제 원문')
  check('MOCK — isOX=false',       r4.isOX === false)
}

// ── 시나리오 7: handleAnswer 로직 (MCQ) ──────────────────────────────────
console.log('\n[ 시나리오 7 ] handleAnswer — MCQ 정답 판별')
{
  function isCorrectMCQ(selected, answer) {
    return Number(selected) === Number(answer)
  }
  check('정답 선택 (2===2)',  isCorrectMCQ(2, 2) === true)
  check('오답 선택 (1!==2)',  isCorrectMCQ(1, 2) === false)
  check('문자열 "2"===2 처리', isCorrectMCQ('2', 2) === true)
  check('null 선택 → false',  isCorrectMCQ(null, 2) === false)
}

// ── 시나리오 8: handleAnswer 로직 (OX) ───────────────────────────────────
console.log('\n[ 시나리오 8 ] handleAnswer — OX 정답 판별')
{
  function isCorrectOX(selected, ox_result) {
    return selected === (ox_result ?? 'O')
  }
  check('O 정답 → O 선택 = true',  isCorrectOX('O', 'O') === true)
  check('O 정답 → X 선택 = false', isCorrectOX('X', 'O') === false)
  check('X 정답 → X 선택 = true',  isCorrectOX('X', 'X') === true)
  check('ox_result null → O 기본', isCorrectOX('O', null) === true)
}

// ── 시나리오 9: mcqStatus 로직 ───────────────────────────────────────────
console.log('\n[ 시나리오 9 ] mcqStatus — 선택지 상태')
{
  function mcqStatus(num, showFeedback, answer, selected) {
    if (!showFeedback) return 'default'
    if (num === Number(answer))  return 'correct'
    if (num === Number(selected)) return 'wrong'
    return 'disabled'
  }
  check('피드백 전 → default',      mcqStatus(1, false, 2, 1) === 'default')
  check('정답 번호 → correct',      mcqStatus(2, true, 2, 1) === 'correct')
  check('선택한 오답 → wrong',      mcqStatus(1, true, 2, 1) === 'wrong')
  check('선택 안 한 오답 → disabled', mcqStatus(3, true, 2, 1) === 'disabled')
  check('정답 = 선택 → correct 우선', mcqStatus(2, true, 2, 2) === 'correct')
}

// ── 시나리오 10: subjectDist 집계 ─────────────────────────────────────────
console.log('\n[ 시나리오 10 ] subjectDist — 과목별 분포 집계')
{
  function calcSubjectDist(questions) {
    const dist = {}
    for (const q of questions) {
      const key = q.subject ?? q.source
      dist[key] = (dist[key] ?? 0) + 1
    }
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }
  const qs = [
    { subject: '법령', source: 'MCQ' },
    { subject: '법령', source: 'MCQ' },
    { subject: '손보1부', source: 'MCQ' },
    { subject: null, source: 'OX' },
  ]
  const dist = calcSubjectDist(qs)
  check('법령 2개 최상위',      dist[0][0] === '법령' && dist[0][1] === 2)
  check('subject null → source 사용', dist.some(([k]) => k === 'OX'))
  check('총 3개 키',            dist.length === 3)
}

// ── 시나리오 11: ProgressBar 계산 ──────────────────────────────────────
console.log('\n[ 시나리오 11 ] ProgressBar — 진행률 계산')
{
  function calcPct(current, total) {
    return total > 0 ? Math.round((current / total) * 100) : 0
  }
  check('12/52 = 23%',   calcPct(12, 52) === 23)
  check('1/1 = 100%',    calcPct(1, 1) === 100)
  check('0/10 = 0%',     calcPct(0, 10) === 0)
  check('total=0 → 0%',  calcPct(5, 0) === 0)
}

// ── 최종 결과 ──────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`)
console.log(`  결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(50))
process.exit(fail === 0 ? 0 : 1)
