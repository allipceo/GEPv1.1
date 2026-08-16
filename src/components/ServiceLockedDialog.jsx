import { useNavigate } from 'react-router-dom'

export default function ServiceLockedDialog() {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-xl">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">준비 중입니다</h2>
        <p className="text-gray-500 text-sm mb-6">
          이 서비스는 곧 오픈될 예정입니다.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  )
}
