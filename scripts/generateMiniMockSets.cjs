// scripts/generateMiniMockSets.cjs
// GEPv30-109 STEP 2 — 간이 모의고사(MiniMock) 30세트 사전 생성
// 실행: node scripts/generateMiniMockSets.cjs
// 출력: public/data/mini_mock_sets.json
//
// package.json에 "type": "module"이 설정되어 있어 .js는 ESM으로 해석된다.
// require()/module.exports를 쓰는 이 스크립트는 .cjs 확장자로 CommonJS를 강제한다.

const fs = require('fs')
const path = require('path')

const QUOTA = {
  '보험업법': 3, '상법': 5, '위험관리': 1, '세제재무': 1,
  '자동차보험': 4, '특종보험': 3, '보증보험': 1, '연금저축': 3,
  '화재보험': 2, '해상보험': 4, '항공우주': 1, '재보험': 2,
}
const SET_COUNT = 30

const EXAMS_PATH = path.join(__dirname, '..', 'public', 'data', 'exams.json')
const OUT_PATH   = path.join(__dirname, '..', 'public', 'data', 'mini_mock_sets.json')

// exams.json은 순수 배열이 아니라 { version, totalCount, rounds, subjects, subSubjects, questions } 객체다.
const raw = JSON.parse(fs.readFileSync(EXAMS_PATH, 'utf8'))
const exams = raw.questions
if (!Array.isArray(exams)) {
  throw new Error('exams.json 구조가 예상과 다릅니다 — questions 배열을 찾을 수 없습니다.')
}

// subSubject별 풀 구성 + 고갈 검증 + Fisher-Yates 셔플
const pool = {}
for (const [subSubject, count] of Object.entries(QUOTA)) {
  pool[subSubject] = exams.filter(q => q.subSubject === subSubject)

  const needed = count * SET_COUNT
  if (pool[subSubject].length < needed) {
    throw new Error(
      `풀 부족: ${subSubject} — 필요 ${needed}문, 보유 ${pool[subSubject].length}문`
    )
  }

  for (let i = pool[subSubject].length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[subSubject][i], pool[subSubject][j]] = [pool[subSubject][j], pool[subSubject][i]]
  }
}

// 세트 생성 (중복 없이 앞에서부터 순서대로 소진)
const sets = []
for (let s = 0; s < SET_COUNT; s++) {
  const questions = []
  for (const [subSubject, count] of Object.entries(QUOTA)) {
    const picked = pool[subSubject].splice(0, count)
    picked.forEach(q => questions.push({
      id:          q.id,
      round:       q.round,        // statsService.recordAttempt() 필수 필드
      roundNumber: q.roundNumber,  // 과목 내 순번(1~40) — GEPv30-112 문제 출처 표시용
      subject:     q.subject,
      subSubject:  q.subSubject,
      questionRaw: q.questionRaw,
      answer:      q.answer,
    }))
  }
  sets.push({
    setId:    s + 1,
    setLabel: `SET ${String(s + 1).padStart(2, '0')}`,
    questions,
  })
}

// mini_mock_sets.json은 세트 배열 그대로 저장한다 (loadSets()/loadSet()이 배열을 기대함).
fs.writeFileSync(OUT_PATH, JSON.stringify(sets, null, 2), 'utf8')

console.log(`✅ mini_mock_sets.json 생성 완료 — ${SET_COUNT}세트, 세트당 ${questionsPerSet()}문제`)

function questionsPerSet() {
  return Object.values(QUOTA).reduce((a, b) => a + b, 0)
}
