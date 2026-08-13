/**
 * src/pages/StatsDashboard.jsx — /stats-dashboard
 * 학습 분석 대시보드: 반복오답 Top5 · 세부과목 취약도 · 학습로드맵 · 합격확률 · 예측점수
 * GEPv30-093
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import useExamStore from '../stores/examStore'
import WeaknessHeatmap from '../components/stats/WeaknessHeatmap'
import StudyRoadmap from '../components/stats/StudyRoadmap'
import PassProbabilityCard from '../components/stats/PassProbabilityCard'
import PredictionCard from '../components/stats/PredictionCard'

const EXAM_DATE = new Date('2026-11-15')

function calcDday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24))
}

/** 반복 오답 Top 5 — 클라이언트 집계 (신규 쿼리 없음) */
function calcRepeatWrong(mcqAttempts, questions) {
  const wrongMap = {}
  mcqAttempts.forEach(({ question_id, is_correct }) => {
    if (!is_correct) wrongMap[question_id] = (wrongMap[question_id] ?? 0) + 1
  })
  return Object.entries(wrongMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => {
      const q = questions.find((item) => String(item.id) === String(id))
      return {
        id,
        count,
        text: q?.questionRaw?.slice(0, 40) ?? `문제 ${id}`,
        subSubject: q?.subSubject ?? '-',
        round: q?.round ?? '-',
      }
    })
}

/** round당 최신 응시(attempt_number 최대)만 남기고 재응시 중복 제거 */
function dedupeByRound(rawSessions) {
  const seen = new Set()
  return (rawSessions ?? []).filter((s) => {
    if (seen.has(s.round)) return false
    seen.add(s.round)
    return true
  })
}

export default function StatsDashboard() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const authStatus = useAuthStore((s) => s.authStatus)
  const questions = useExamStore((s) => s.questions)

  const [mcqAttempts, setMcqAttempts] = useState([])
  const [mockSessions, setMockSessions] = useState([])
  const [customSessions, setCustomSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const [
        { data: attempts, error: attemptsError },
        { data: rawSessions, error: sessionsError },
        { data: rawCustomSessions, error: customSessionsError },
      ] = await Promise.all([
        supabase
          .from('attempts')
          .select('sub_subject, is_correct, question_id')
          .eq('user_id', userId)
          .neq('study_mode', 'ox'),
        supabase
          .from('mock_exam_sessions')
          .select('round, total_average, is_pass, attempt_number, created_at')
          .eq('user_id', userId)
          .eq('is_complete', true)
          .order('round', { ascending: true })
          .order('attempt_number', { ascending: false }),
        supabase
          .from('custom_mock_sessions')
          .select('id, total_average, is_pass, created_at')
          .eq('user_id', userId)
          .eq('is_complete', true)
          .order('created_at', { ascending: true }),
      ])

      if (attemptsError) throw attemptsError
      if (sessionsError) throw sessionsError

      // custom_mock_sessions은 부가 데이터 — 조회 실패(테이블 미존재 등)해도
      // 나머지 대시보드(반복오답·취약도·정규 모의고사 통계)는 정상 표시되도록 격리
      if (customSessionsError) {
        console.warn('[GEP] custom_mock_sessions 조회 실패(무시):', customSessionsError.message)
      }

      setMcqAttempts(attempts ?? [])
      setMockSessions(dedupeByRound(rawSessions))
      setCustomSessions(rawCustomSessions ?? [])
    } catch (err) {
      console.warn('[GEP] StatsDashboard 로드 실패:', err.message)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (authStatus === 'authenticated' && userId) {
      fetchData()
    }
  }, [authStatus, userId, fetchData])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">학습 데이터 분석 중…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-gray-500 text-sm">데이터를 불러오지 못했습니다</p>
          <button onClick={fetchData} className="mt-3 text-blue-500 text-sm">다시 시도</button>
        </div>
      </div>
    )
  }

  const repeatWrong = calcRepeatWrong(mcqAttempts, questions)

  const customRecords = customSessions.map((s) => ({
    totalAverage: Number(s.total_average ?? 0),
    created_at: s.created_at,
  }))
  const regularRecords = mockSessions.map((s) => ({
    totalAverage: Number(s.total_average ?? 0),
    created_at: s.created_at,
  }))
  const allRecords = [...customRecords, ...regularRecords]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const dDay = calcDday()

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* ① 헤더: ← 홈 | 📊 내 학습 분석 | D-xx 🔴 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="홈으로"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">📊 내 학습 분석</h1>
        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full whitespace-nowrap">
          {dDay >= 0 ? `D-${dDay}` : 'D-Day'} 🔴
        </span>
      </div>

      {/* ② 반복 오답 Top 5 */}
      {repeatWrong.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-5 text-center">
          <p className="text-sm text-gray-500">🎉 아직 반복 오답이 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">문제를 풀수록 약점이 분석됩니다</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-red-600">🔴 반복 오답 집중 공략 Top {repeatWrong.length}</p>
          <div className="flex flex-col gap-2">
            {repeatWrong.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-red-100">
                <span className="text-lg font-black text-red-400 w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{item.text}…</p>
                  <p className="text-[10px] text-gray-400">{item.subSubject} · {item.round}회</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {item.count}회 틀림
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/wrong-review')}
            className="w-full rounded-xl bg-red-500 text-white text-sm font-bold py-3 active:bg-red-600"
          >
            지금 바로 틀린 문제 풀기 →
          </button>
        </div>
      )}

      {/* ③ WeaknessHeatmap */}
      <WeaknessHeatmap questionAttempts={mcqAttempts} />

      {/* ④ StudyRoadmap */}
      <StudyRoadmap questionAttempts={mcqAttempts} />

      {/* ⑤ PassProbabilityCard */}
      <PassProbabilityCard records={allRecords} />

      {/* ⑥ PredictionCard */}
      <PredictionCard records={allRecords} />

    </div>
  )
}
