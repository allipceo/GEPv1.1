import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore from '../stores/examStore'
import AppHeader from '../components/AppHeader'

export default function ServiceAHome() {
  const navigate = useNavigate()
  const questions = useExamStore((s) => s.questions)
  const startServiceA = useExamStore((s) => s.startServiceA)
  const progressMap = useExamStore((s) => s.progressMap)
  const isLoading = useExamStore((s) => s.isLoading)
  const isReady = useExamStore((s) => s.isReady)

  const rounds = useMemo(() => {
    const grouped = new Map()
    questions.forEach((question) => {
      const round = question.round
      if (!grouped.has(round)) grouped.set(round, [])
      grouped.get(round).push(question)
    })

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([round, items]) => ({
        round,
        total: items.length,
        progress: progressMap[`service_a_${round}`] ?? 0,
      }))
  }, [questions, progressMap])

  const handleStart = (round) => {
    startServiceA(round)
    navigate('/question')
  }

  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen max-w-[640px] mx-auto bg-gray-50 px-4 py-6 flex items-center justify-center">
        <p className="text-gray-400 text-sm">회차 목록 불러오는 중…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-[640px] mx-auto bg-gray-50 px-4 py-6">
      <AppHeader title="기출 회차 순서풀이" />

      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800">서비스 A</p>
        <p className="mt-1 text-sm leading-5 text-blue-700">
          실제 기출 회차를 선택하면 1번부터 120번까지 출제 순서대로 풉니다.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        {rounds.map(({ round, total, progress }) => {
          const answered = Math.min(progress, total)
          const pct = total > 0 ? Math.round((answered / total) * 100) : 0
          return (
            <button
              key={round}
              type="button"
              onClick={() => handleStart(round)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-left shadow-sm active:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-gray-900">{round}회</p>
                  <p className="mt-1 text-sm text-gray-500">{total}문제 출제순 풀이</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">{answered}/{total}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-blue-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
