/**
 * AppHeader.jsx — 공용 페이지 헤더
 * Props:
 *   title  : 중앙 타이틀 (생략 가능)
 *   backTo : "← 이전" 클릭 시 이동할 상위 레이어 경로 (기본값 '/')
 *
 * "이전"은 브라우저 히스토리가 아니라 레이어 계층상 상위 경로로 고정 이동한다.
 * (하단 문제 탐색용 "이전 문제" 버튼과는 별개)
 */
import { useNavigate } from 'react-router-dom'

export default function AppHeader({ title, backTo = '/' }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 max-w-[640px] mx-auto w-full">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="min-w-[56px] text-base font-semibold text-gray-500 text-left active:text-gray-800"
      >
        ← 이전
      </button>
      {title ? (
        <h1 className="text-base font-bold text-gray-900 truncate px-2">{title}</h1>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="min-w-[56px] text-base font-semibold text-gray-500 text-right active:text-gray-800"
      >
        홈
      </button>
    </div>
  )
}
