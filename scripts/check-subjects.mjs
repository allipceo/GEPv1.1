import { readFileSync } from 'fs'
const d = JSON.parse(readFileSync('public/data/exams.json', 'utf8'))
const qs = d.questions || d
const m = {}
qs.forEach(q => {
  if (!m[q.subject]) m[q.subject] = new Set()
  m[q.subject].add(q.subSubject)
})
Object.entries(m).forEach(([s, v]) => console.log(s + ':', [...v].sort().join(', ')))
console.log('total:', qs.length)
