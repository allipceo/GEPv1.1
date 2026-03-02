/**
 * src/pages/UnifiedWrongReview.jsx — /unified-wrong
 * 통합 오답 복습 홈
 * GEP_099 Phase 6-3 STEP 3
 *
 * 레이아웃 (상단→하단):
 *   1. 헤더
 *   2. 🔥 5회+ 바로 풀기 버튼 (red-600, 최대 크기)
 *   3. D-Day 학습 플랜 (StudyPresetCard × 3)
 *   4. 오답 분포 (WrongCountDistribution)
 *   5. 고급 필터 (접기/펼치기)
 *   6. WrongQuestionCard 목록 (wrong_count 내림차순)
 *
 * 데이터: unifiedWrongService (localStorage 캐시 활용)
 * 네비게이션: "N회+ 풀기" → /unified-wrong/challenge/:minCount
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  fetchAllWrongQuestions,
  calculateWrongCountStats,
  filterByWrongCount,
} from '../services/unifiedWrongService'
import WrongCountDistribution from '../components/wrong/WrongCountDistribution'
import WrongQuestionCard      from '../components/wrong/WrongQuestionCard'
import StudyPresetCard, { buildStudyPresets } from '../components/wrong/StudyPresetCard'

// 시험까지 남은 일수 (DdayBanner와 동일한 방식)
const EXAM_DATE    = new Date('2026-09-27')  // 보험중개사 시험 기준일
function calcDaysLeft() {
  const diff = Math.ceil((EXAM_DATE - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

// 소스 표시 레이블
const SOURCE_LABEL = { ALL: '전체', MCQ: 'MCQ', OX: 'OX', MOCK: '모의', CUSTOM: '맞춤' }

export default function UnifiedWrongReview() {
  const navigate   = useNavigate()
  const userId     = useAuthStore(s => s.userId)
  const authStatus = useAuthStore(s => s.authStatus)

  const [questions,      setQuestions]      = useState([])
  const [isLoading,      setIsLoading]      = useState(true)
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [selectedSub,    setSelectedSub]    = useState('ALL')
  const [selectedPreset, setSelectedPreset] = useState(null)

  // ── 데이터 로드 ────────────────────────────────────────────────────────────
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
      } catch (err) {
        console.warn('[UnifiedWrongReview] 로드 실패:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authStatus, userId])

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const stats        = calculateWrongCountStats(questions)
  const highPriority = (stats['5'] ?? 0) + (stats['6+'] ?? 0)
  const daysLeft     = calcDaysLeft()
  const presets      = buildStudyPresets(daysLeft)

  // 세부과목 목록 (필터용)
  const subList = ['ALL', ...new Set(questions.map(q => q.sub_subject).filter(Boolean))]

  // 필터 적용
  const filtered = questions
    .filter(q => selectedSource === 'ALL' || q.source === selectedSource)
    .filter(q => selectedSub    === 'ALL' || q.sub_subject === selectedSub)

  // ── 핸들러 ─────────────────────────────────────────────────────────────────
  function handleStudy(minCount) {
    navigate(`/unified-wrong/challenge/${minCount}`)
  }

  function handleRetry(question) {
    navigate(`/unified-wrong/challenge/1`, { state: { focusId: question.id } })
  }

  function handlePresetSelect(preset) {
    setSelectedPreset(preset.title)
    navigate(`/unified-wrong/challenge/${preset.minCount}`)
  }

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">통합 오답 복습</h1>
        {!isLoading && (
          <span className="ml-auto text-xs text-gray-400 tabular-nums">
            총 {questions.length}문제
          </span>
        )}
      </div>

      {/* ── 로딩 ─────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">오답 목록을 불러오는 중···</p>
        </div>
      )}

      {/* ── 비회원 안내 ──────────────────────────────────────────────────── */}
      {!isLoading && authStatus !== 'authenticated' && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-base font-semibold text-gray-600">로그인 후 이용 가능합니다</p>
          <p className="text-sm text-gray-400">통합 오답 복습은 회원 전용 서비스입니다.</p>
        </div>
      )}

      {!isLoading && authStatus === 'authenticated' && (
        <>
          {/* ── 🔥 5회+ 바로 풀기 (최상단, 최대 크기) ────────────────────── */}
          <button
            onClick={() => handleStudy(5)}
            disabled={highPriority === 0}
            className="w-full py-4 rounded-2xl bg-red-600 text-white text-base font-bold
              flex items-center justify-center gap-2
              hover:bg-red-700 active:bg-red-800 transition-colors shadow-md
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            🔥 5회+ 바로 풀기
            <span className="text-sm font-normal opacity-90">
              ({highPriority}문제)
            </span>
          </button>

          {/* ── D-Day 학습 플랜 ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 px-1">
              📅 D-Day 학습 플랜
              <span className="ml-2 text-gray-300 font-normal">
                {daysLeft > 0 ? `D-${daysLeft}` : 'D-Day'}
              </span>
            </p>
            {presets.map(preset => (
              <StudyPresetCard
                key={preset.title}
                preset={preset}
                totalMatched={filterByWrongCount(questions, preset.minCount).length}
                onSelect={handlePresetSelect}
                isSelected={selectedPreset === preset.title}
              />
            ))}
          </div>

          {/* ── 오답 분포 ─────────────────────────────────────────────────── */}
          <WrongCountDistribution stats={stats} onStudy={handleStudy} />

          {/* ── 고급 필터 (접기/펼치기) ──────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 px-1
                hover:text-gray-700 transition-colors"
            >
              <span>고급 필터</span>
              <span className="text-gray-300 text-[10px]">{filterOpen ? '▲' : '▼'}</span>
              {(selectedSource !== 'ALL' || selectedSub !== 'ALL') && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600
                  text-[10px] font-semibold">
                  ON
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="flex flex-col gap-4 rounded-xl bg-gray-50 border border-gray-100
                px-4 py-3">

                {/* 유형 필터 */}
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-gray-400 font-semibold">유형</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(SOURCE_LABEL).map(([src, label]) => (
                      <button
                        key={src}
                        onClick={() => setSelectedSource(src)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors
                          ${selectedSource === src
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 세부과목 필터 */}
                {subList.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-gray-400 font-semibold">세부과목</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {subList.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setSelectedSub(sub)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                            ${selectedSub === sub
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                        >
                          {sub === 'ALL' ? '전체' : sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 필터 초기화 */}
                {(selectedSource !== 'ALL' || selectedSub !== 'ALL') && (
                  <button
                    onClick={() => { setSelectedSource('ALL'); setSelectedSub('ALL') }}
                    className="self-start text-[11px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── WrongQuestionCard 목록 ─────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 px-1">
              오답 목록
              {filtered.length !== questions.length && (
                <span className="ml-1 text-gray-300 font-normal">
                  ({filtered.length}/{questions.length})
                </span>
              )}
            </p>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="text-3xl">🎉</span>
                <p className="text-sm text-gray-500">
                  {questions.length === 0
                    ? '아직 오답 데이터가 없습니다'
                    : '필터 조건에 맞는 오답이 없습니다'}
                </p>
              </div>
            )}

            {filtered.map(q => (
              <WrongQuestionCard
                key={`${q.source}-${q.id}`}
                question={q}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
