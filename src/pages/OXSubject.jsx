/**
 * src/pages/OXSubject.jsx — /ox/:subjectKey
 * OX 학습 세부과목 선택 화면
 * GEP_042 Phase4 STEP3
 *
 * 카드 5개: 전체(ALL) + 세부과목 4개 (oxSubjects.js subs 순서)
 * 카드 클릭: resetStore → loadQuestions → navigate /ox/:key/:subSubject
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useOxStore from '../stores/oxStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { oxService } from '../services/oxService'
import { OX_SUBJECTS } from '../config/oxSubjects'
import AppHeader from '../components/AppHeader'

// 과목별 컬러 테마
const SUBJECT_THEME = {
  law: {
    border:      'border-blue-200',
    headerBg:    'bg-blue-50',
    headerText:  'text-blue-700',
    cardBorder:  'border-gray-100',
    accentText:  'text-blue-500',
    allBg:       'bg-blue-600',
  },
  p1: {
    border:      'border-green-200',
    headerBg:    'bg-green-50',
    headerText:  'text-green-700',
    cardBorder:  'border-gray-100',
    accentText:  'text-green-500',
    allBg:       'bg-green-600',
  },
  p2: {
    border:      'border-purple-200',
    headerBg:    'bg-purple-50',
    headerText:  'text-purple-700',
    cardBorder:  'border-gray-100',
    accentText:  'text-purple-500',
    allBg:       'bg-purple-600',
  },
}

export default function OXSubject() {
  const navigate     = useNavigate()
  const { subjectKey } = useParams()

  const isLoading        = useOxStore((s) => s.isLoading)
  const oxRoundNo        = useOxStore((s) => s.roundNo)
  const resetStore       = useOxStore((s) => s.resetStore)
  const loadQuestions    = useOxStore((s) => s.loadQuestions)

  const userId = useAuthStore((s) => s.userId)

  // subjectKey 유효성 검증 — config에 없으면 /ox 리다이렉트
  const subjectInfo = OX_SUBJECTS.find((s) => s.key === subjectKey)

  useEffect(() => {
    if (!subjectInfo) {
      navigate('/ox', { replace: true })
    }
  }, [subjectKey, subjectInfo, navigate])

  // 세부과목별 실제 누적 풀이수 — 세션 스토어(oxStore)는 카드 클릭마다 resetStore()로
  // 0으로 초기화되어 "누적"을 표시할 수 없으므로, Supabase 실측치를 직접 조회한다
  // (2026-08-20 발견 — OXHome.jsx와 동일한 근본 원인).
  const [subDash, setSubDash] = useState(null)   // { total, bySub: { [subSubject]: n } }

  useEffect(() => {
    if (!userId || !subjectInfo) return
    supabase
      .from('attempts')
      .select('sub_subject')
      .eq('user_id', userId)
      .eq('study_mode', 'ox')
      .eq('subject', subjectKey)
      .then(({ data }) => {
        const bySub = {}
        let total = 0
        for (const { sub_subject } of data ?? []) {
          total += 1
          if (sub_subject) bySub[sub_subject] = (bySub[sub_subject] ?? 0) + 1
        }
        setSubDash({ total, bySub })
      })
  }, [userId, subjectKey, subjectInfo])

  if (!subjectInfo) return null

  const theme = SUBJECT_THEME[subjectKey] ?? SUBJECT_THEME.law

  // 카드 클릭 핸들러
  // 2026-08-20: loadProgress()가 어디서도 호출되지 않아 이어풀기가 항상 처음(0번)부터
  // 시작하던 결함 수정 — 저장된 재개 지점을 조회해 loadQuestions에 전달한다.
  // 2026-08-20(2차): 재개 지점은 인덱스가 아니라 문제 ID(lastQuestionId)로 전달한다.
  // loadQuestions가 현재 문제 목록에서 그 ID의 위치를 다시 찾으므로, 문제 세트가
  // 바뀌어도 엉뚱한 문제를 가리키지 않는다(GEPv30-141 원칙 9).
  const handleCardClick = async (subSubject) => {
    resetStore()
    const authState = useAuthStore.getState()
    const progress = await oxService.loadProgress(authState, subjectKey, subSubject)
    await loadQuestions(subjectKey, subSubject, progress?.lastQuestionId ?? null)
    navigate(`/ox/${subjectKey}/${subSubject}`)
  }

  const roundNo = oxRoundNo

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단: 공용 헤더 */}
      <AppHeader title="과목 선택" backTo="/ox" />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-400 animate-pulse">문제를 불러오는 중입니다 ···</p>
        </div>
      )}

      {/* 세부과목 카드 목록 */}
      {!isLoading && (
        <div className={`rounded-xl overflow-hidden border ${theme.border}`}>

          {/* 카드 1 — 전체(ALL) */}
          <button
            onClick={() => handleCardClick('ALL')}
            className={`w-full flex items-center justify-between px-4 py-4 ${theme.headerBg} hover:brightness-95 active:brightness-90 transition-all text-left`}
          >
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm font-bold ${theme.headerText}`}>
                전체 ({subjectInfo.subs.length}과목 통합)
              </span>
              <span className={`text-xs ${theme.accentText}`}>
                Round {roundNo} · 누적 {subDash?.total ?? 0}문항
              </span>
            </div>
            <span className="text-gray-400 text-lg">›</span>
          </button>

          {/* 카드 2~5 — 세부과목 4개 (subs 순서 그대로) */}
          {subjectInfo.subs.map((sub, idx) => (
            <button
              key={sub}
              onClick={() => handleCardClick(sub)}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 active:bg-gray-50 transition-colors text-left border-t ${theme.cardBorder}`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-800">{sub}</span>
                <span className="text-xs text-gray-400">
                  Round {roundNo} · 누적 {subDash?.bySub?.[sub] ?? 0}문항
                </span>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          ))}

        </div>
      )}

    </div>
  )
}
