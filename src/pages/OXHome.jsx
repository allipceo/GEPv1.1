/**
 * src/pages/OXHome.jsx — /ox
 * OX 학습 대분류 선택 화면
 * GEP_042 Phase4 STEP3
 *
 * 레벨 3 게이트: service_level < 3 이면 차단 화면 표시
 * 과목 카드 3개: oxSubjects.js config 기준 (하드코딩 금지)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import useOxStore from '../stores/oxStore'
import { OX_SUBJECTS } from '../config/oxSubjects'
import AppHeader from '../components/AppHeader'

// 과목별 컬러 테마
const SUBJECT_THEME = {
  law: {
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    label:  'text-blue-700',
    meta:   'text-blue-500',
    icon:   '📘',
  },
  p1: {
    bg:     'bg-green-50',
    border: 'border-green-200',
    label:  'text-green-700',
    meta:   'text-green-500',
    icon:   '📗',
  },
  p2: {
    bg:     'bg-purple-50',
    border: 'border-purple-200',
    label:  'text-purple-700',
    meta:   'text-purple-500',
    icon:   '📙',
  },
}

export default function OXHome() {
  const navigate = useNavigate()

  const userId     = useAuthStore((s) => s.userId)
  const authStatus = useAuthStore((s) => s.authStatus)

  // oxStore — 현재 로드된 과목의 진행 정보
  const oxSubject        = useOxStore((s) => s.subject)
  const oxRoundNo        = useOxStore((s) => s.roundNo)
  const oxTotalCumulative = useOxStore((s) => s.totalCumulative)

  const [oxDash, setOxDash] = useState(null)  // null = 로딩중

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) return
    supabase
      .from('attempts')
      .select('subject, is_correct')
      .eq('user_id', userId)
      .eq('study_mode', 'ox')
      .then(({ data }) => {
        if (!data || data.length === 0) { setOxDash({ total: 0, correct: 0, bySubj: {} }); return }
        let total = 0, correct = 0
        const bySubj = { law: { solved: 0, correct: 0 }, p1: { solved: 0, correct: 0 }, p2: { solved: 0, correct: 0 } }
        data.forEach(({ subject, is_correct }) => {
          total++
          if (is_correct) correct++
          if (bySubj[subject]) {
            bySubj[subject].solved++
            if (is_correct) bySubj[subject].correct++
          }
        })
        setOxDash({ total, correct, bySubj })
      })
  }, [authStatus, userId])

  // 레벨 게이트는 App.jsx 라우트 레벨(serviceKey: 'OX')로 이관됨 (GEPv30-120)

  // ── 정상 화면 ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단: 공용 헤더 + 통계 버튼 */}
      <AppHeader title="OX 진위형 학습" />
      <div className="flex justify-end -mt-4">
        <button
          onClick={() => navigate('/ox/stats')}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          aria-label="OX 통계 보기"
        >
          📊 통계
        </button>
      </div>

      {/* OX 학습 현황 미니 대시보드 */}
      {oxDash && oxDash.total > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">OX 학습 현황</p>
            <span className="text-xs text-gray-400">
              총 {oxDash.total.toLocaleString()}문항 ·{' '}
              {oxDash.total > 0 ? Math.round((oxDash.correct / oxDash.total) * 100) : 0}% 정답
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'law', label: '법령',    barCls: 'bg-blue-400'  },
              { key: 'p1',  label: '손보1부', barCls: 'bg-green-400' },
              { key: 'p2',  label: '손보2부', barCls: 'bg-purple-400'},
            ].map(({ key, label, barCls }) => {
              const s   = oxDash.bySubj[key]
              const pct = s.solved > 0 ? Math.round((s.correct / s.solved) * 100) : 0
              return (
                <div key={key} className="flex flex-col gap-1">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-gray-800">{s.solved.toLocaleString()}<span className="text-xs font-normal text-gray-400">문항</span></p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-1 ${barCls} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 과목 카드 3개 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 px-1">과목 선택</p>

        {OX_SUBJECTS.map((subj) => {
          const theme = SUBJECT_THEME[subj.key] ?? SUBJECT_THEME.law

          // 현재 세션에서 로드된 과목이면 실제 round 표시, 아니면 기본값(1)
          const roundNo = oxSubject === subj.key ? oxRoundNo : 1

          // "누적 N문항"은 Supabase 실측(oxDash)을 우선한다 — 세션 스토어(oxStore)의
          // totalCumulative는 현재 로드된 과목이 아니면 항상 0이라 다른 과목의 실제
          // 누적 풀이수를 반영하지 못하는 문제가 있었다(2026-08-20 발견).
          const persistedCumulative = oxDash?.bySubj?.[subj.key]?.solved ?? 0
          const totalCumulative = oxSubject === subj.key
            ? Math.max(oxTotalCumulative, persistedCumulative)
            : persistedCumulative

          return (
            <button
              key={subj.key}
              onClick={() => navigate(`/ox/${subj.key}`)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border ${theme.bg} ${theme.border} hover:brightness-95 active:brightness-90 transition-all text-left`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{theme.icon}</span>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-base font-bold ${theme.label}`}>{subj.label}</span>
                  <span className={`text-xs ${theme.meta}`}>
                    Round {roundNo} · 누적 {totalCumulative}문항
                  </span>
                </div>
              </div>
              <span className="text-gray-400 text-lg">›</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}
