import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore from '../stores/examStore'

const SUBJECT_STYLES = {
  '법령': {
    text: 'text-blue-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
  },
  '손보1부': {
    text: 'text-green-700',
    border: 'border-green-200',
    bg: 'bg-green-50',
  },
  '손보2부': {
    text: 'text-purple-700',
    border: 'border-purple-200',
    bg: 'bg-purple-50',
  },
}

export default function ServiceBHome() {
  const navigate = useNavigate()
  const questions = useExamStore((s) => s.questions)
  const startServiceB = useExamStore((s) => s.startServiceB)
  const progressMap = useExamStore((s) => s.progressMap)

  const subjects = useMemo(() => {
    const grouped = new Map()
    questions.forEach((question) => {
      if (!grouped.has(question.subject)) grouped.set(question.subject, new Map())
      const subMap = grouped.get(question.subject)
      subMap.set(question.subSubject, (subMap.get(question.subSubject) ?? 0) + 1)
    })

    return [...grouped.entries()].map(([subject, subMap]) => {
      const subs = [...subMap.entries()]
        .sort(([a], [b]) => String(a).localeCompare(String(b), 'ko'))
        .map(([subSubject, count]) => ({ subSubject, count }))
      return {
        subject,
        total: subs.reduce((sum, item) => sum + item.count, 0),
        subs,
      }
    })
  }, [questions])

  const start = (subject, subSubject = null, restart = false) => {
    startServiceB(subject, subSubject, { restart })
    navigate('/question')
  }

  return (
    <div className="min-h-screen max-w-[640px] mx-auto bg-gray-50 px-4 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[40px] px-2 text-sm font-semibold text-gray-500"
        >
          홈
        </button>
        <h1 className="text-lg font-bold text-gray-900">과목별 랜덤풀이</h1>
        <span className="w-10" />
      </div>

      <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-800">서비스 B</p>
        <p className="mt-1 text-sm leading-5 text-indigo-700">
          과목 또는 세부과목을 선택하면 23~31회 문제 안에서 랜덤 순서로 풉니다.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {subjects.map(({ subject, total, subs }) => {
          const style = SUBJECT_STYLES[subject] ?? {
            text: 'text-gray-700',
            border: 'border-gray-200',
            bg: 'bg-white',
          }
          const subjectProgress = progressMap[`service_b_${subject}_ALL`] ?? 0
          return (
            <section
              key={subject}
              className={`rounded-lg border ${style.border} bg-white overflow-hidden`}
            >
              <div className={`${style.bg} px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-base font-bold ${style.text}`}>{subject}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      전체 {total}문제 · 진행 {Math.min(subjectProgress, total)}/{total}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => start(subject, null, false)}
                      className="min-h-[36px] rounded-lg bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm"
                    >
                      이어풀기
                    </button>
                    <button
                      type="button"
                      onClick={() => start(subject, null, true)}
                      className="min-h-[36px] rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white"
                    >
                      새 랜덤
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {subs.map(({ subSubject, count }) => {
                  const key = `service_b_${subject}_${subSubject}`
                  const progress = progressMap[key] ?? 0
                  return (
                    <div
                      key={subSubject}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {subSubject}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {count}문제 · 진행 {Math.min(progress, count)}/{count}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => start(subject, subSubject, false)}
                          className="min-h-[34px] rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600"
                        >
                          이어
                        </button>
                        <button
                          type="button"
                          onClick={() => start(subject, subSubject, true)}
                          className="min-h-[34px] rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-700"
                        >
                          새로
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
