/**
 * AdminTabs.jsx — 관리자 화면 상단 탭 전환 바
 * GEPv30-158: 관리자 진입 시 [대시보드] / [사용자관리] 두 버튼을 항상 노출,
 *             클릭 시 해당 화면으로 이동. 현재 화면 버튼은 활성 표시.
 */

import { useNavigate } from 'react-router-dom'

const TABS = [
  { key: 'dashboard', label: '📊 대시보드', path: '/admin/dashboard' },
  { key: 'users', label: '👤 사용자관리', path: '/admin/users' },
]

export default function AdminTabs({ active }) {
  const navigate = useNavigate()

  return (
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
  )
}
