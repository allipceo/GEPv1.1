/**
 * LimitPopup.jsx — 게스트 30문제 한도 도달 팝업
 *
 * props:
 *   subSubject : string — 현재 세부과목명
 *   onHome     : func   — "다른 과목 선택" 클릭 시 (Home 이동)
 *   onDismiss  : func   — "나중에" 클릭 시 (팝업 닫기)
 */
export default function LimitPopup({ subSubject, onHome, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="w-full max-w-[640px] bg-white rounded-t-2xl px-6 pt-8 pb-8">
        <div className="flex flex-col items-center text-center gap-4">

          {/* 자물쇠 아이콘 */}
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* 안내 문구 */}
          <div>
            <p className="text-base font-semibold text-gray-900">
              이 과목은 30문제 체험이 완료되었습니다
            </p>
            <p className="text-sm text-gray-500 mt-2">
              전체 1,080문제는 회원가입 후 이용 가능합니다
            </p>
          </div>

          {/* 버튼 영역 — 터치 영역 44px 이상 */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              className="w-full rounded-xl bg-blue-600 text-white font-semibold text-base active:bg-blue-700 transition-colors"
              style={{ minHeight: '48px' }}
              onClick={onHome}
            >
              다른 과목 선택
            </button>
            <button
              className="w-full rounded-xl bg-gray-100 text-gray-600 font-semibold text-base active:bg-gray-200 transition-colors"
              style={{ minHeight: '48px' }}
              onClick={onDismiss}
            >
              나중에
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
