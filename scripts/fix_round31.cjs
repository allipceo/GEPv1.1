/**
 * fix_round31.cjs
 * 31회 문제 subject 오류 수정
 *
 * 증상: 31회 120문제 모두 subject='법령'로 잘못 설정됨
 * 원인: ID의 T1/T2/T3 과목 구분이 subject 필드에 반영되지 않음
 * 수정:
 *   - T1 (roundNumber 1-40): subject='법령' 유지, roundNumber 유지
 *   - T2 (roundNumber 41-80): subject='손보1부'로 변경, roundNumber -40 조정
 *   - T3 (roundNumber 81-120): subject='손보2부'로 변경, roundNumber -80 조정
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/data/exams.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let fixCount = 0;

data.questions = data.questions.map(q => {
  if (q.round !== 31) return q;

  if (q.id.includes('_T2_')) {
    fixCount++;
    return { ...q, subject: '손보1부', roundNumber: q.roundNumber - 40 };
  }
  if (q.id.includes('_T3_')) {
    fixCount++;
    return { ...q, subject: '손보2부', roundNumber: q.roundNumber - 80 };
  }
  return q;  // T1(법령) 변경 없음
});

console.log('수정된 문제 수:', fixCount);

// 검증
const r31 = data.questions.filter(q => q.round === 31);
const bySubject = r31.reduce((acc, q) => { acc[q.subject] = (acc[q.subject] || 0) + 1; return acc; }, {});
console.log('수정 후 31회 과목별:', bySubject);

['법령', '손보1부', '손보2부'].forEach(s => {
  const qs = r31.filter(q => q.subject === s).sort((a, b) => a.roundNumber - b.roundNumber);
  console.log(`  ${s}: roundNumber ${qs[0].roundNumber}~${qs[qs.length-1].roundNumber}`);
});

// 저장
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ exams.json 저장 완료');
