/**
 * src/pages/ProgressTracker.jsx — /unified-wrong/progress
 * 오답 학습 진행도 대시보드
 * GEP_108 Phase 6-3 STEP 4
 *
 * 데이터:
 *   - unifiedWrongService.fetchAllWrongQuestions() + calculateWrongCountStats()
 *   - localStorage 'gep:unified_wrong:weekly_sessions' (주간 세션 횟수)
 *   - localStorage 'gep:unified_wrong:stats_snapshot' (당일 기준 스냅샷)
 *   - localStorage 'gep:unified_wrong:peak_total' (최대 오답수 기준)
 *
 * 레이아웃:
 *   현재 전략(D-Day 기반) → 전체 진행도 바 → 오답 횟수별 증감
 *   → 주간 달성 차트 → 격려 메시지 → 도전 바로가기
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  fetchAllWrongQuestions,
  calculateWrongCountStats,
} from '../services/unifiedWrongService'

// ── 상수 ───────────────────────────────────────────────────────────────────────
const EXAM_DATE  = new Date('2026-09-27')
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ── 유틸 ───────────────────────────────────────────────────────────────────────

function calcDaysLeft() {
  return Math.max(0, Math.ceil((EXAM_DATE - Date.now()) / (1000 * 60 * 60 * 24)))
}

function getStrategy(daysLeft) {
  if (daysLeft > 90) return { label: '초기 정복 단계',   desc: '전체 오답을 고르게 복습하세요',       color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' }
  if (daysLeft > 60) return { label: '집중 복습 단계',   desc: '3회 이상 오답을 집중 공략하세요',     color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' }
  if (daysLeft > 30) return { label: '약점 제거 단계',   desc: '5회 이상 오답을 우선 처리하세요',     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' }
  return               { label: '최종 마무리 단계',  desc: '긴급 오답 모두 정복하세요!',          color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

// ── localStorage 헬퍼 ──────────────────────────────────────────────────────────

function loadSnapshot() {
  try {
    const raw = localStorage.getItem('gep:unified_wrong:stats_snapshot')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSnapshot(stats) {
  try {
    localStorage.setItem('gep:unified_wrong:stats_snapshot', JSON.stringify({
      date: todayKey(),
      stats,
    }))
  } catch {}
}

function loadWeeklySessions() {
  try {
    const raw = localStorage.getItem('gep:unified_wrong:weekly_sessions')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function loadOrUpdatePeak(currentTotal) {
  try {
    const stored = parseInt(localStorage.getItem('gep:unified_wrong:peak_total'), 10)
    if (!isNaN(stored) && stored >= currentTotal) return stored
    if (currentTotal > 0) {
      localStorage.setItem('gep:unified_wrong:peak_total', String(currentTotal))
    }
    return currentTotal
  } catch { return currentTotal }
}

// ── 격려 메시지 ────────────────────────────────────────────────────────────────

function buildEncouragement(total5Plus, totalAll, daysLeft) {
  if (total5Plus === 0 && totalAll === 0) return { emoji: '🎉', msg: '모든 오답을 정복했습니다!' }
  if (total5Plus === 0)   return { emoji: '💪', msg: '긴급 오답 제로! 나머지도 마저 정리하세요.' }
  if (daysLeft <= 30)     return { emoji: '🏆', msg: `D-${daysLeft}, 마지막 스퍼트! ${total5Plus}개 긴급 오답을 해결하세요.` }
  if (daysLeft <= 60)     return { emoji: '🔥', msg: `D-${daysLeft}, 집중할 시간입니다. 오늘도 화이팅!` }
  return                         { emoji: '📖', msg: `D-${daysLeft}, 꾸준한 복습이 실력이 됩니다.` }
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function ProgressTracker() {
  const navigate   = useNavigate()
  const userId     = useAuthStore(s => s.userId)
  const authStatus = useAuthStore(s => s.authStatus)

  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [snapshot,  setSnapshot]  = useState(null)   // 당일 기준 스냅샷
  const [sessions,  setSessions]  = useState({})     // 날짜별 세션 횟수

  useEffect(() => {
    async function load() {
      if (authStatus === 'loading') return
      if (authStatus !== 'authenticated' || !userId) {
        setIsLoading(false)
        return
      }
      try {
        const data = await fetchAllWrongQuestions(userId)
        setQuestions(data)

        // 스냅샷: 오늘 첫 방문이면 현재 stats를 기준으로 저장
        const snap        = loadSnapshot()
        const currentStats = calculateWrongCountStats(data)
        if (!snap || snap.date !== todayKey()) {
          saveSnapshot(currentStats)
          setSnapshot(null)   // 오늘 첫 방문 → 비교 기준 없음 (이전 날짜 데이터 없음)
        } else {
          setSnapshot(snap)
        }
      } catch (err) {
        console.warn('[ProgressTracker] 로드 실패:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
    setSessions(loadWeeklySessions())
  }, [authStatus, userId])

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const stats      = calculateWrongCountStats(questions)
  const daysLeft   = calcDaysLeft()
  const strategy   = getStrategy(daysLeft)
  const total5Plus = (stats['5'] ?? 0) + (stats['6+'] ?? 0)
  const totalAll   = questions.length
  const peakTotal  = loadOrUpdatePeak(totalAll)
  const progressPct = peakTotal > 0 ? Math.round(((peakTotal - totalAll) / peakTotal) * 100) : 0

  const last7Days    = getLast7Days()
  const maxSessions  = Math.max(1, ...last7Days.map(d => sessions[d] ?? 0))
  const enc          = buildEncouragement(total5Plus, totalAll, daysLeft)

  const STAT_KEYS = ['6+', '5', '4', '3', '2', '1']

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1 flex items-center gap-1"
          aria-label="홈으로"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs font-semibold">홈으로</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900">학습 진행도</h1>
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {daysLeft > 0 ? `D-${daysLeft}` : 'D-Day'}
        </span>
      </div>

      {/* ── 로딩 ──────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">데이터를 불러오는 중···</p>
        </div>
      )}

      {/* ── 비회원 ────────────────────────────────────────────────────────── */}
      {!isLoading && authStatus !== 'authenticated' && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-base font-semibold text-gray-600">로그인 후 이용 가능합니다</p>
          <p className="text-sm text-gray-400">학습 진행도는 회원 전용 서비스입니다.</p>
        </div>
      )}

      {!isLoading && authStatus === 'authenticated' && (
        <>
          {/* ── 현재 전략 (D-Day 기반) ───────────────────────────────────── */}
          <div className={`rounded-2xl ${strategy.bg} border ${strategy.border} px-4 py-4`}>
            <p className="text-[11px] text-gray-400 mb-1">현재 학습 전략</p>
            <p className={`text-base font-bold ${strategy.color}`}>{strategy.label}</p>
            <p className="text-xs text-gray-500 mt-1">{strategy.desc}</p>
          </div>

          {/* ── 전체 진행도 바 ────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700">전체 오답 진행도</p>
              <span className="text-xs tabular-nums text-gray-400">{totalAll}개 남음</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2.5 bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right tabular-nums">
              {progressPct}% 해결 ({peakTotal - totalAll}/{peakTotal})
            </p>
          </div>

          {/* ── 오답 횟수별 현황 + 증감 ──────────────────────────────────── */}
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-700">오답 횟수별 현황</p>

            {STAT_KEYS.map(key => {
              const cur      = stats[key] ?? 0
              const prev     = snapshot?.stats?.[key]
              const diff     = prev != null ? cur - prev : null
              const isUrgent = key === '6+' || key === '5'
              const barPct   = totalAll > 0 ? Math.round((cur / totalAll) * 100) : 0

              return (
                <div key={key} className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-8 shrink-0 tabular-nums
                    ${isUrgent ? 'text-red-500' : 'text-gray-500'}`}>
                    {key}회+
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${isUrgent ? 'bg-red-400' : 'bg-indigo-300'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-gray-600 w-8 text-right shrink-0">
                    {cur}개
                  </span>
                  {diff != null && (
                    <span className={`text-[11px] tabular-nums w-14 text-right shrink-0 font-semibold
                      ${diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {diff < 0 ? `${diff}개 ✅` : diff > 0 ? `+${diff}개` : '-'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── 주간 달성 바 차트 ────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-700">주간 복습 달성</p>

            <div className="flex items-end gap-1.5" style={{ height: '72px' }}>
              {last7Days.map(date => {
                const count    = sessions[date] ?? 0
                const pct      = maxSessions > 0 ? (count / maxSessions) * 100 : 0
                const barH     = Math.max(count > 0 ? 12 : 0, Math.round((pct / 100) * 48))
                const d        = new Date(date + 'T00:00:00')
                const dayLabel = DAY_LABELS[d.getDay()]
                const isToday  = date === todayKey()

                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    {/* 숫자 (0 제외) */}
                    <span className="text-[9px] tabular-nums text-gray-400" style={{ height: '12px', lineHeight: '12px' }}>
                      {count > 0 ? count : ''}
                    </span>
                    {/* 바 */}
                    <div className="w-full flex flex-col justify-end" style={{ height: '48px' }}>
                      <div
                        className={`w-full rounded-t-sm ${isToday ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                        style={{ height: `${barH}px` }}
                      />
                    </div>
                    {/* 요일 */}
                    <span className={`text-[10px] ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                      {dayLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 격려 메시지 ──────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-4
            flex items-center gap-3">
            <span className="text-2xl shrink-0">{enc.emoji}</span>
            <p className="text-sm text-indigo-700 font-medium leading-relaxed">{enc.msg}</p>
          </div>

          {/* ── 도전 바로가기 ─────────────────────────────────────────────── */}
          <button
            onClick={() => navigate('/unified-wrong/challenge/5')}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold
              hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-md"
          >
            🔥 5회+ 도전하기
            <span className="text-xs font-normal opacity-80 ml-1.5">({total5Plus}문제)</span>
          </button>
        </>
      )}
    </div>
  )
}
