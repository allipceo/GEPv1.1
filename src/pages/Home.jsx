/**
 * Home.jsx — 홈 화면
 * GEPv30-028: Phase1 5섹터 인사이트 대시보드로 전면 교체
 */

import { useNavigate } from 'react-router-dom'
import useStatsStore from '../stores/statsStore'
import LoginButton from '../components/LoginButton'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { canCountAttempts } from '../services/countingEligibility'

const EXAM_DATE = new Date('2026-11-15')
const SUBJECTS = ['법령', '손보1부', '손보2부']
const TOTAL_BY_SUBJECT = { '법령': 360, '손보1부': 360, '손보2부': 360 }

function calcDday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const navigate = useNavigate()

  const stats = useStatsStore((s) => s.stats)
  const authStatus = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const realName = useAuthStore((s) => s.realName)
  const userId = useAuthStore((s) => s.userId)
  const approvalStatus = useAuthStore((s) => s.approvalStatus)
  const status = useAuthStore((s) => s.status)
  const isPaused = useAuthStore((s) => s.isPaused)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  if (authStatus === 'guest') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-gray-100 flex flex-col items-center gap-5">
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">GEP 손해보험 대리점</h1>
            <p className="text-sm text-gray-500">학습 시스템</p>
          </div>
          <LoginButton />
        </div>
      </div>
    )
  }

  const canUseCounting = canCountAttempts({
    authStatus, serviceLevel, userId, approvalStatus, status, isPaused, isAdmin,
  })

  const dDay = calcDday()

  const getAccuracy = (subject) => {
    const s = stats.bySubject[subject]
    if (!s || s.solved === 0) return 0
    return Math.round((s.correct / s.solved) * 100)
  }

  const accuracies = SUBJECTS.map(getAccuracy)
  const hasAnyRecord = SUBJECTS.some((subject) => (stats.bySubject[subject]?.solved || 0) > 0)
  const avgAccuracy = hasAnyRecord
    ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
    : 0

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key.slice(5), solved: stats.daily[key]?.solved || 0 }
  })
  const maxSolved = Math.max(...last7Days.map((d) => d.solved), 1)

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.warn('[GEP] 로그아웃 실패:', error.message)
    }
    useAuthStore.getState().clearAuth()
    window.location.href = '/'
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-4">

      {/* 섹터1: 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
        <div>
          <span className="font-bold text-lg">{realName || '학습자'} 님</span>
          <span className="ml-3 text-gray-500 text-sm">
            시험까지{' '}
            <span className="text-blue-600 font-bold">
              {dDay >= 0 ? `D-${dDay}` : '시험 종료'}
            </span>
            일<span className="text-xs text-gray-400 ml-1">(2026.11.15)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="text-sm text-gray-500 border rounded px-2 py-1"
            >
              관리자
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
            style={{ minHeight: '44px' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 섹터2: 득점현황 */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="font-bold mb-3">득점현황</h2>
        {SUBJECTS.map((subject) => {
          const acc = getAccuracy(subject)
          const barColor = acc < 40 ? 'bg-red-400' : acc < 60 ? 'bg-yellow-400' : 'bg-green-400'
          const label = acc < 40 ? '⚠ 과락위험' : acc < 60 ? '합격권 진입중' : '✓ 합격권'
          return (
            <div key={subject} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>{subject}</span>
                <span>{acc}% <span className="text-xs text-gray-500">{label}</span></span>
              </div>
              <div className="relative h-4 bg-gray-100 rounded">
                <div className={`h-4 rounded ${barColor}`} style={{ width: `${acc}%` }} />
                <div className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed" style={{ left: '40%' }} />
                <div className="absolute top-0 bottom-0 border-l-2 border-blue-500 border-dashed" style={{ left: '60%' }} />
              </div>
            </div>
          )
        })}
        {hasAnyRecord ? (
          <div className="text-sm text-right text-gray-600 mt-2">
            전체 평균 <span className="font-bold">{avgAccuracy}%</span>
            <span className="text-xs text-gray-400 ml-1">(합격기준 60%)</span>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">아직 풀이 기록이 없습니다</p>
        )}
      </div>

      {/* 섹터3: 누적 풀이 현황 */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="font-bold mb-3">누적 풀이 현황</h2>
        {SUBJECTS.map((subject) => {
          const solved = stats.bySubject[subject]?.solved || 0
          const total = TOTAL_BY_SUBJECT[subject]
          return (
            <div key={subject} className="flex justify-between py-1 text-sm border-b last:border-0">
              <span>{subject}</span>
              <span className="text-gray-600">
                {total}문제 / 누적 <span className="font-bold">{solved.toLocaleString()}</span>회 풀이
              </span>
            </div>
          )
        })}
      </div>

      {/* 섹터4: 최근 7일 학습량 */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="font-bold mb-3">최근 7일 학습량</h2>
        <div className="flex items-end gap-1 h-20">
          {last7Days.map(({ date, solved }) => {
            const heightPct = Math.round((solved / maxSolved) * 100)
            return (
              <div key={date} className="flex flex-col items-center flex-1">
                <span className="text-xs text-gray-500">{solved || ''}</span>
                <div
                  className="w-full bg-blue-400 rounded-t"
                  style={{ height: `${heightPct}%`, minHeight: solved > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-400 mt-1">{date}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 섹터5: 풀이 옵션 */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="font-bold mb-3">학습 시작</h2>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/service-a')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold"
          >
            기출 회차 순서풀기
          </button>
          <button
            type="button"
            onClick={() => navigate('/service-b')}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-bold"
          >
            과목별 랜덤풀기
          </button>
          {canUseCounting && (
            <button
              type="button"
              onClick={() => navigate('/wrong-review')}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold"
            >
              틀린문제 풀기
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
