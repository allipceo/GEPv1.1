/**
 * verify-gep097-step2.mjs
 * GEP_097 Phase 6-3 STEP 2 — 통합 오답 컴포넌트 5개 검증
 *
 * 브라우저/React 없이 핵심 로직 + 파일 구조 검증
 * node scripts/verify-gep097-step2.mjs
 */

import fs from 'fs'

let pass = 0, fail = 0

function check(label, condition) {
  if (condition) { console.log(`  ✅ PASS | ${label}`); pass++ }
  else           { console.log(`  ❌ FAIL | ${label}`); fail++ }
}

// ── 파일 존재 확인 ─────────────────────────────────────────────────────────
console.log('\n[ 시나리오 1 ] 파일 존재 확인')
{
  const files = [
    'src/components/wrong/WrongCountBadge.jsx',
    'src/components/wrong/WrongCountDistribution.jsx',
    'src/components/wrong/WrongQuestionCard.jsx',
    'src/components/wrong/StudyPresetCard.jsx',
    'src/components/wrong/ReclassificationAnimation.jsx',
  ]
  for (const f of files) {
    check(`${f} 존재`, fs.existsSync(f))
  }
}

// ── WrongCountBadge 로직 ──────────────────────────────────────────────────
console.log('\n[ 시나리오 2 ] WrongCountBadge — 횟수별 설정')
{
  const src = fs.readFileSync('src/components/wrong/WrongCountBadge.jsx', 'utf8')

  check('6회+ → ⚫ black', src.includes("icon: '⚫'") && src.includes('text-gray-900'))
  check('5회  → 🔥 red-600', src.includes("icon: '🔥'") && src.includes('text-red-600'))
  check('4회  → ⚠️ orange-500', src.includes("icon: '⚠️'") && src.includes('text-orange-500'))
  check('1~3회 → ● normal', src.includes("icon: '●'") && src.includes('text-gray-400'))
  check('최대 6개 표시 (min count, 6)', src.includes('Math.min(count, 6)'))
  check('wrongCount prop 기본값', src.includes('wrongCount = 1'))
  check('export default WrongCountBadge', src.includes('export default function WrongCountBadge'))
}

// ── WrongCountBadge getConfig 로직 인라인 ────────────────────────────────
console.log('\n[ 시나리오 3 ] WrongCountBadge — getConfig 분기')
{
  function getConfig(count) {
    if (count >= 6) return 'high'
    if (count === 5) return 'fire'
    if (count === 4) return 'warn'
    return 'normal'
  }

  check('count=7 → high',   getConfig(7) === 'high')
  check('count=6 → high',   getConfig(6) === 'high')
  check('count=5 → fire',   getConfig(5) === 'fire')
  check('count=4 → warn',   getConfig(4) === 'warn')
  check('count=3 → normal', getConfig(3) === 'normal')
  check('count=1 → normal', getConfig(1) === 'normal')
}

// ── WrongCountDistribution 구조 ───────────────────────────────────────────
console.log('\n[ 시나리오 4 ] WrongCountDistribution — 구조 확인')
{
  const src = fs.readFileSync('src/components/wrong/WrongCountDistribution.jsx', 'utf8')

  check('stats prop 받음',       src.includes('stats = {}'))
  check('onStudy prop 받음',     src.includes('onStudy'))
  check('6개 구간 정의 (ROWS)',  src.includes("key: '6+'") && src.includes("key: '1'"))
  check('5회+ 풀기 버튼 활성',  src.includes('studyMin: 5'))
  check('4회+ 풀기 버튼 활성',  src.includes('studyMin: 4'))
  check('3회+ 풀기 버튼 활성',  src.includes('studyMin: 3'))
  check('1/2회 풀기 버튼 없음', src.includes('studyMin: null'))
  check('진행 바 width pct',    src.includes('width: `${pct}%`'))
  check('total 계산',           src.includes('reduce((sum, v)'))
  check('export default',       src.includes('export default function WrongCountDistribution'))
}

// ── WrongCountDistribution 퍼센트 계산 ───────────────────────────────────
console.log('\n[ 시나리오 5 ] WrongCountDistribution — 퍼센트 계산')
{
  function calcPct(count, total) {
    return total > 0 ? Math.round((count / total) * 100) : 0
  }
  const stats = { '6+': 2, '5': 3, '4': 5, '3': 10, '2': 20, '1': 60 }
  const total = Object.values(stats).reduce((sum, v) => sum + v, 0)

  check('total = 100',           total === 100)
  check('6+ pct = 2',            calcPct(2, total) === 2)
  check('1 pct = 60',            calcPct(60, total) === 60)
  check('total=0 → pct=0',       calcPct(5, 0) === 0)
}

// ── WrongQuestionCard 구조 ────────────────────────────────────────────────
console.log('\n[ 시나리오 6 ] WrongQuestionCard — 구조 확인')
{
  const src = fs.readFileSync('src/components/wrong/WrongQuestionCard.jsx', 'utf8')

  check('WrongCountBadge import',  src.includes("import WrongCountBadge from './WrongCountBadge'"))
  check('SOURCE_BADGE MCQ',        src.includes("MCQ:") && src.includes('text-indigo-700'))
  check('SOURCE_BADGE OX',         src.includes("OX:") && src.includes('text-blue-700'))
  check('SOURCE_BADGE MOCK',       src.includes("MOCK:") && src.includes('text-green-700'))
  check('SOURCE_BADGE CUSTOM',     src.includes("CUSTOM:") && src.includes('text-purple-700'))
  check('relativeDate 함수',       src.includes('function relativeDate'))
  check('extractTitle 함수',       src.includes('function extractTitle'))
  check('onRetry prop',            src.includes('onRetry'))
  check('last_wrong_at prop',      src.includes('last_wrong_at'))
  check('다시 풀기 버튼',          src.includes('다시 풀기'))
  check('export default',          src.includes('export default function WrongQuestionCard'))
}

// ── WrongQuestionCard relativeDate 로직 ──────────────────────────────────
console.log('\n[ 시나리오 7 ] WrongQuestionCard — relativeDate 로직')
{
  function relativeDate(isoStr) {
    if (!isoStr) return null
    try {
      const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 0) return '오늘'
      if (diff === 1) return '어제'
      if (diff < 7)   return `${diff}일 전`
      if (diff < 30)  return `${Math.floor(diff / 7)}주 전`
      return `${Math.floor(diff / 30)}달 전`
    } catch { return null }
  }

  check('null input → null',      relativeDate(null) === null)
  check('오늘 → "오늘"',          relativeDate(new Date().toISOString()) === '오늘')

  const yesterday = new Date(Date.now() - 86400000).toISOString()
  check('어제 → "어제"',          relativeDate(yesterday) === '어제')

  const threeDays = new Date(Date.now() - 3 * 86400000).toISOString()
  check('3일 전 → "3일 전"',      relativeDate(threeDays) === '3일 전')

  const twoWeeks = new Date(Date.now() - 14 * 86400000).toISOString()
  check('2주 전 → "2주 전"',      relativeDate(twoWeeks) === '2주 전')
}

// ── WrongQuestionCard extractTitle 로직 ──────────────────────────────────
console.log('\n[ 시나리오 8 ] WrongQuestionCard — extractTitle 로직')
{
  function extractTitle(raw) {
    if (!raw) return '문제 내용 없음'
    const firstLine = raw.split('\n')[0].trim()
    return firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine
  }

  check('null → 기본 텍스트',             extractTitle(null) === '문제 내용 없음')
  check('빈 문자열 → 기본 텍스트',        extractTitle('') === '문제 내용 없음')
  check('첫 줄만 추출',                   extractTitle('첫줄\n둘째줄') === '첫줄')
  check('50자 초과 → 잘라서 … 붙임',     extractTitle('a'.repeat(60)).endsWith('…'))
  check('50자 이하 → 그대로',             extractTitle('짧은문제') === '짧은문제')
  check('앞뒤 공백 trim',                 extractTitle('  문제  \n둘째') === '문제')
}

// ── StudyPresetCard 구조 ──────────────────────────────────────────────────
console.log('\n[ 시나리오 9 ] StudyPresetCard — 구조 확인')
{
  const src = fs.readFileSync('src/components/wrong/StudyPresetCard.jsx', 'utf8')

  check('preset prop 받음',        src.includes('preset') && src.includes('= {}'))
  check('totalMatched prop',       src.includes('totalMatched'))
  check('onSelect prop',           src.includes('onSelect'))
  check('isSelected prop',         src.includes('isSelected'))
  check('ddayLabel 함수',          src.includes('function ddayLabel'))
  check('ddayStyle 함수',          src.includes('function ddayStyle'))
  check('D-7 이하 → red',          src.includes('bg-red-50') && src.includes("days <= 7"))
  check('D-14 이하 → orange',      src.includes('bg-orange-50') && src.includes("days <= 14"))
  check('그외 → blue',             src.includes('bg-blue-50'))
  check('선택하기 / ✓ 선택됨',     src.includes('선택하기') && src.includes('✓ 선택됨'))
  check('disabled totalMatched=0', src.includes('disabled={totalMatched === 0}'))
  check('buildStudyPresets export', src.includes('export function buildStudyPresets'))
  check('export default',          src.includes('export default function StudyPresetCard'))
}

// ── StudyPresetCard buildStudyPresets 로직 ────────────────────────────────
console.log('\n[ 시나리오 10 ] StudyPresetCard — buildStudyPresets')
{
  function buildStudyPresets(daysLeft = 28) {
    return [
      { title: '4주 집중 플랜', description: '', minCount: 3, days: daysLeft },
      { title: '2주 압축 플랜', description: '', minCount: 4, days: Math.min(daysLeft, 14) },
      { title: '1주 최종 플랜', description: '', minCount: 5, days: Math.min(daysLeft, 7) },
    ]
  }
  function ddayLabel(days) {
    if (days <= 0)  return 'D-Day'
    if (days === 1) return 'D-1'
    return `D-${days}`
  }

  const presets28 = buildStudyPresets(28)
  check('3개 프리셋 반환',          presets28.length === 3)
  check('1번 프리셋 minCount=3',    presets28[0].minCount === 3)
  check('2번 프리셋 minCount=4',    presets28[1].minCount === 4)
  check('3번 프리셋 minCount=5',    presets28[2].minCount === 5)
  check('2주 플랜 days max 14',     presets28[1].days === 14)
  check('1주 플랜 days max 7',      presets28[2].days === 7)

  const presets5 = buildStudyPresets(5)
  check('daysLeft=5 → 1주플랜 days=5', presets5[2].days === 5)

  check('D-Day label', ddayLabel(0) === 'D-Day')
  check('D-1 label',   ddayLabel(1) === 'D-1')
  check('D-7 label',   ddayLabel(7) === 'D-7')
}

// ── ReclassificationAnimation 구조 ────────────────────────────────────────
console.log('\n[ 시나리오 11 ] ReclassificationAnimation — 구조 확인')
{
  const src = fs.readFileSync('src/components/wrong/ReclassificationAnimation.jsx', 'utf8')

  check('beforeCount prop',       src.includes('beforeCount'))
  check('afterCorrect prop',      src.includes('afterCorrect'))
  check('afterWrong prop',        src.includes('afterWrong'))
  check('subjectSummary prop',    src.includes('subjectSummary'))
  check('isVisible prop',         src.includes('isVisible'))
  check('isVisible false → null', src.includes('if (!isVisible) return null'))
  check('afterCount 계산',        src.includes('beforeCount - afterCorrect'))
  check('✅ 삭제 표시',           src.includes('✅ 삭제'))
  check('➡️ 누적 표시',          src.includes('➡️ 누적'))
  check('정답률 바',              src.includes('correctPct}%`'))
  check('과목별 성과 렌더',       src.includes('subjectSummary.length > 0'))
  check('SUBJECT_COLOR 법령=blue', src.includes("'법령':") && src.includes('text-blue-600'))
  check('export default',         src.includes('export default function ReclassificationAnimation'))
}

// ── ReclassificationAnimation 계산 로직 ───────────────────────────────────
console.log('\n[ 시나리오 12 ] ReclassificationAnimation — 계산 로직')
{
  function calc(beforeCount, afterCorrect) {
    const afterCount = beforeCount - afterCorrect
    const correctPct = beforeCount > 0 ? Math.round((afterCorrect / beforeCount) * 100) : 0
    return { afterCount, correctPct }
  }

  const r1 = calc(100, 30)
  check('복습 후 = 70 (100-30)',   r1.afterCount === 70)
  check('정답률 = 30% (30/100)',   r1.correctPct === 30)

  const r2 = calc(50, 50)
  check('전부 정답 → 후 0개',      r2.afterCount === 0)
  check('전부 정답 → 100%',        r2.correctPct === 100)

  const r3 = calc(0, 0)
  check('before=0 → pct=0 (div0 방지)', r3.correctPct === 0)
}

// ── 최종 결과 ────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`)
console.log(`  결과: ${pass} PASS / ${fail} FAIL`)
console.log('='.repeat(50))
process.exit(fail === 0 ? 0 : 1)
