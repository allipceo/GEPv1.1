/**
 * AdminTabs.jsx — 관리자 화면 공통 상단 영역
 * GEPv30-158: [대시보드] / [사용자관리] 탭 전환
 * GEPv30-159: 상단에 "관리자 화면" 표시 + [이전] [홈] 버튼 부착
 */

import { useNavigate } from 'react-router-dom'

const TABS = [
  { key: 'dashboard', label: '📊 대시보드', path: '/admin/dashboard' },
  { key: 'users', label: '👤 사용자관리', path: '/admin/users' },
]

export default function AdminTabs({ active }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-2">
      {/* 관리자 화면 표시 + 이전/홈 */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 px-2.5 py-1 text-xs font-bold text-white">
          🛠 관리자 화면
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
          >
            ‹ 이전
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
          >
            홈
          </button>
        </div>
      </div>

      {/* 탭 전환 */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => !isActive && navigate(tab.path)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[44px] rounded-lg px-3 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 active:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
