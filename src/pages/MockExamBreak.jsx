/**
 * src/pages/MockExamBreak.jsx — /mock/:round/break
 * 교시 간 휴식 화면
 * GEP_058 Phase5 STEP4
 *
 * - 15분 카운트다운 타이머
 * - "휴식 건너뛰기" 버튼
 * - 00:00 도달 시 자동으로 2교시 시작 모달
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mockExamConfig } from '../config/mockExamConfig'

function formatTime(seconds) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// 00:00 도달 시 모달
function TimeupModal({ round, navigate }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-[640px] rounded-t-2xl px-5 py-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900">⏰ 휴식 시간 종료</h2>
        <p className="text-sm text-gray-600">
          2교시를 시작할 준비가 되셨습니까?
        </p>
        <button
          onClick={() => navigate(`/mock/${round}/part2`)}
          className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          2교시 시작
        </button>
      </div>
    </div>
  )
}

export default function MockExamBreak() {
  const navigate              = useNavigate()
  const { round: roundParam } = useParams()
  const round                 = parseInt(roundParam, 10)

  const [remaining,   setRemaining]   = useState(mockExamConfig.breakTime)
  const [showTimeup,  setShowTimeup]  = useState(false)

  // 15분 카운트다운
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setShowTimeup(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // 진행률 (0→1)
  const progressPct = ((mockExamConfig.breakTime - remaining) / mockExamConfig.breakTime) * 100

  // 타이머 컬러
  const timerClass = remaining <= 60
    ? 'text-red-500 animate-pulse'
    : remaining <= 180
      ? 'text-amber-500'
      : 'text-gray-800'

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6 min-h-screen">

      {showTimeup && <TimeupModal round={round} navigate={navigate} />}

      {/* 상단 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/mock/${round}/part2`)}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="2교시 바로 시작"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">교시 간 휴식</h1>
      </div>

      {/* 타이머 카드 */}
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-gray-50 border border-gray-200 px-6 py-10">
        <span className="text-5xl">☕</span>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">남은 휴식 시간</p>
          <span className={`text-6xl font-mono font-bold ${timerClass}`}>
            {formatTime(remaining)}
          </span>
        </div>

        {/* 진행바 */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 rounded-full bg-blue-400 transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <p className="text-sm text-gray-500 text-center leading-relaxed">
          잠시 쉬어가세요.<br />
          2교시는 손보1부 + 손보2부 80문제, 80분입니다.
        </p>
      </div>

      {/* 1교시 완료 안내 */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-600">
        📘 1교시 완료 — 2교시 준비 중 (손보1부 40문제 + 손보2부 40문제)
      </div>

      {/* 건너뛰기 버튼 */}
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => navigate(`/mock/${round}/part2`)}
          className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          바로 2교시 시작 →
        </button>
        <button
          onClick={() => navigate('/mock')}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-400 text-sm hover:bg-gray-50 transition-colors"
        >
          회차 선택으로
        </button>
      </div>

    </div>
  )
}
