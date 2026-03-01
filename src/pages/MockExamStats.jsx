/**
 * src/pages/MockExamStats.jsx — /mock/stats
 * 모의고사 통계 화면
 * GEP_061 Phase5 STEP6
 *
 * - 전체 요약 (응시 횟수, 합격률, 평균 점수)
 * - 점수 추이 Line Chart (SVG, 외부 라이브러리 없음)
 * - 회차별 응시 이력 테이블
 * - 회원: Supabase / 게스트: localStorage
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  mockExamSupabase,
  loadResult,
  calcAverage,
  checkPass,
} from '../services/mockExamService'
import { mockExamConfig } from '../config/mockExamConfig'

// ── 게스트 통계 구성 (localStorage) ──────────────────────────────────────────
function buildGuestStats() {
  const list = []
  for (const round of mockExamConfig.rounds) {
    const part1 = loadResult(round, 'part1')
    const part2 = loadResult(round, 'part2')
    if (!part1 || !part2) continue
    const allScores = { ...part1.scores, ...part2.scores }
    list.push({
      round,
      totalAverage:  calcAverage(allScores),
      isPass:        checkPass(allScores),
      attemptNumber: 1,
    })
  }
  return list
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
const CHART_W  = 320
const CHART_H  = 140
const PAD_L    = 32   // Y축 레이블 공간
const PAD_R    = 12
const PAD_T    = 20
const PAD_B    = 28   // X축 레이블 공간
const PLOT_W   = CHART_W - PAD_L - PAD_R
const PLOT_H   = CHART_H - PAD_T - PAD_B

// 점수 → Y 픽셀
function scoreToY(score) {
  return PAD_T + PLOT_H - (score / 100) * PLOT_H
}

// 인덱스 → X 픽셀 (9개 회차 기준)
function idxToX(idx) {
  const total = mockExamConfig.rounds.length - 1 // 8
  return PAD_L + (idx / total) * PLOT_W
}

function LineChart({ records }) {
  // 회차 → 점수 맵
  const scoreMap = {}
  records.forEach(r => { scoreMap[r.round] = r })

  const rounds = mockExamConfig.rounds

  // 연결선 path 생성 (데이터 있는 점만)
  const points = rounds
    .map((round, idx) => scoreMap[round]
      ? { idx, x: idxToX(idx), y: scoreToY(scoreMap[round].totalAverage), round, record: scoreMap[round] }
      : null
    )
    .filter(Boolean)

  const pathD = points.length >= 2
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : null

  // Y축 눈금선 (0, 40, 60, 80, 100)
  const yTicks = [0, 40, 60, 80, 100]

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: 'auto', maxHeight: '180px' }}
      aria-label="점수 추이 차트"
    >
      {/* Y축 눈금선 + 레이블 */}
      {yTicks.map(tick => {
        const y = scoreToY(tick)
        const isPass40 = tick === 40
        const isPass60 = tick === 60
        return (
          <g key={tick}>
            <line
              x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
              stroke={isPass60 ? '#6366f1' : isPass40 ? '#fb923c' : '#e5e7eb'}
              strokeWidth={isPass60 || isPass40 ? 1 : 0.7}
              strokeDasharray={isPass60 || isPass40 ? '3 3' : undefined}
            />
            <text
              x={PAD_L - 3} y={y + 3.5}
              textAnchor="end"
              fontSize="8"
              fill={isPass60 ? '#6366f1' : isPass40 ? '#fb923c' : '#9ca3af'}
            >
              {tick}
            </text>
          </g>
        )
      })}

      {/* X축 회차 레이블 */}
      {rounds.map((round, idx) => (
        <text
          key={round}
          x={idxToX(idx)} y={CHART_H - 6}
          textAnchor="middle" fontSize="8" fill="#9ca3af"
        >
          {round}회
        </text>
      ))}

      {/* 연결선 */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* 데이터 포인트 */}
      {points.map(p => {
        const isPass = p.record.isPass
        return (
          <g key={p.round}>
            <circle
              cx={p.x} cy={p.y} r="4"
              fill={isPass ? '#22c55e' : '#ef4444'}
              stroke="white"
              strokeWidth="1.5"
            />
            <text
              x={p.x} y={p.y - 7}
              textAnchor="middle" fontSize="7.5"
              fill={isPass ? '#16a34a' : '#dc2626'}
              fontWeight="600"
            >
              {p.record.totalAverage.toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* 데이터 없을 때 안내 */}
      {points.length === 0 && (
        <text
          x={CHART_W / 2} y={CHART_H / 2}
          textAnchor="middle" fontSize="10" fill="#d1d5db"
        >
          응시 완료 데이터 없음
        </text>
      )}
    </svg>
  )
}

// ── 요약 카드 ─────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-4">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}

// ── 회차 이력 행 ──────────────────────────────────────────────────────────────
function HistoryRow({ record, onDetail }) {
  return (
    <button
      onClick={() => onDetail(record.round)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-800 w-10">{record.round}회</span>
        {record.attemptNumber > 1 && (
          <span className="text-xs text-indigo-500 font-semibold">{record.attemptNumber}차</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold ${record.totalAverage >= 60 ? 'text-green-600' : record.totalAverage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
          {Number(record.totalAverage).toFixed(1)}점
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
          {record.isPass ? '합격' : '불합격'}
        </span>
        <span className="text-gray-300 text-sm">›</span>
      </div>
    </button>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function MockExamStats() {
  const navigate   = useNavigate()
  const userId     = useAuthStore((s) => s.userId)
  const authStatus = useAuthStore((s) => s.authStatus)

  const [records,   setRecords]   = useState([])   // 완료된 응시 목록
  const [isLoading, setIsLoading] = useState(true)

  // ── 데이터 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        if (authStatus === 'authenticated' && userId) {
          // 회원: Supabase
          const history = await mockExamSupabase.getSessionHistory(userId)
          const completed = Object.entries(history)
            .filter(([, s]) => s.isComplete)
            .map(([round, s]) => ({
              round:         parseInt(round, 10),
              totalAverage:  s.totalAverage,
              isPass:        s.isPass,
              attemptNumber: s.attemptNumber ?? 1,
            }))
            .sort((a, b) => a.round - b.round)
          setRecords(completed)
        } else {
          // 게스트: localStorage
          setRecords(buildGuestStats())
        }
      } catch (err) {
        console.warn('[MockExamStats] 로드 실패:', err.message)
        setRecords(buildGuestStats())
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authStatus, userId])

  // ── 집계 ─────────────────────────────────────────────────────────────────────
  const totalAttempts = records.length
  const passCount     = records.filter(r => r.isPass).length
  const failCount     = totalAttempts - passCount
  const passRate      = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0
  const avgScore      = totalAttempts > 0
    ? Math.round((records.reduce((sum, r) => sum + Number(r.totalAverage), 0) / totalAttempts) * 10) / 10
    : 0

  // ── 이력 상세 이동 ────────────────────────────────────────────────────────────
  function handleDetail(round) {
    navigate(`/mock/${round}/result`)
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/mock')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="모의고사 홈으로"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">모의고사 통계</h1>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">통계를 불러오는 중···</p>
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && totalAttempts === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">📊</span>
          <p className="text-base font-semibold text-gray-600">아직 완료한 모의고사가 없습니다</p>
          <p className="text-sm text-gray-400">모의고사를 완료하면 성적이 여기에 표시됩니다.</p>
          <button
            onClick={() => navigate('/mock')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            모의고사 시작하기
          </button>
        </div>
      )}

      {!isLoading && totalAttempts > 0 && (
        <>
          {/* ── 전체 요약 ───────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">전체 요약</p>
            <div className="grid grid-cols-3 gap-2">
              <SummaryCard
                label="총 응시"
                value={totalAttempts}
                sub="회"
              />
              <SummaryCard
                label="합격률"
                value={`${passRate}%`}
                sub={`${passCount}합 ${failCount}불`}
                color={passRate >= 60 ? 'text-green-600' : passRate > 0 ? 'text-amber-500' : 'text-red-500'}
              />
              <SummaryCard
                label="평균 점수"
                value={avgScore.toFixed(1)}
                sub="점"
                color={avgScore >= 60 ? 'text-green-600' : avgScore >= 40 ? 'text-amber-500' : 'text-red-500'}
              />
            </div>
          </div>

          {/* ── 점수 추이 차트 ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">점수 추이</p>
            <div className="rounded-2xl bg-white border border-gray-200 px-3 py-4">
              <LineChart records={records} />

              {/* 범례 */}
              <div className="flex gap-4 justify-center mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 합격
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> 불합격
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 border-t border-dashed border-indigo-400 inline-block" /> 합격선(60점)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 border-t border-dashed border-amber-400 inline-block" /> 과목선(40점)
                </span>
              </div>
            </div>
          </div>

          {/* ── 회차별 이력 ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 px-1">
              회차별 이력 <span className="text-gray-300 font-normal">탭 시 성적표 이동</span>
            </p>
            <div className="flex flex-col gap-2">
              {records.map(record => (
                <HistoryRow
                  key={record.round}
                  record={record}
                  onDetail={handleDetail}
                />
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  )
}
