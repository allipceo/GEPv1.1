/**
 * AppHeader.jsx — 공용 페이지 헤더
 * Props:
 *   title    : 중앙 타이틀 (생략 가능)
 *   onBack   : 이전 버튼 클릭 핸들러
 *   onHome   : 홈 버튼 클릭 핸들러
 */
import { useNavigate } from 'react-router-dom'

export default function AppHeader({ title, onBack, onHome }) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  })
  const handleHome = onHome ?? (() => navigate('/'))
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 max-w-[640px] mx-auto w-full">
      <button
        type="button"
        onClick={handleBack}
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
        onClick={handleHome}
        className="min-w-[56px] text-base font-semibold text-gray-500 text-right active:text-gray-800"
      >
        홈
      </button>
    </div>
  )
}
