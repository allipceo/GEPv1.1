const fs = require('fs');
const d = JSON.parse(fs.readFileSync('D:/zobis2026/01_project/개발/gepv1.1/public/data/exams.json', 'utf8'));

// questionRaw 없는 문제 확인
const empty = d.questions.filter(q => !q.questionRaw || q.questionRaw.trim() === '');
console.log('questionRaw 없는 문제:', empty.length);

// round=23 확인
const r23 = d.questions.filter(q => q.round === 23);
console.log('round=23 총 문제:', r23.length);

// 과목별 분류
const bySubject = {};
r23.forEach(q => {
  bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
});
console.log('round=23 과목별:', bySubject);

// 각 회차별 문제 수 확인
const rounds = {};
d.questions.forEach(q => {
  rounds[q.round] = (rounds[q.round] || 0) + 1;
});
console.log('회차별 문제 수:', rounds);

// answer 필드 확인
const noAnswer = d.questions.filter(q => q.answer === undefined || q.answer === null);
console.log('answer 없는 문제:', noAnswer.length);
