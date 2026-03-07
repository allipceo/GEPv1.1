# GEP_117_Home_모의고사버튼_추가

**작성일:** 2026.03.07
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-3 긴급 수정
**지시자:** 노팀장 (개발관리창007)

---

## 1. 작업 목적

Phase 6-1~6-3 작업 중 Home.jsx에서 모의고사·맞춤 모의고사 버튼이 누락된 상태였음.
레벨 게이트는 각 페이지(MockExamHome, CustomMockHome)에서 처리하므로,
Home.jsx는 메뉴 역할만 담당 — 무조건 표시 방침으로 두 버튼 추가.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Home.jsx` | Link import 추가 + 모의고사·맞춤 모의고사 버튼 2개 추가 |
| `docs/GEP_117_Home_모의고사버튼_추가.md` | 본 문서 |

---

## 3. 주요 변경사항

### import 추가
```jsx
// 변경 전
import { useNavigate } from 'react-router-dom'

// 변경 후
import { useNavigate, Link } from 'react-router-dom'
```

### 추가된 버튼 (통합 틀린문제 복습 버튼 아래, 과목 아코디언 위)

```jsx
{/* 모의고사 버튼 */}
<Link to="/mock" className="block p-4 bg-white rounded-lg border-2 border-indigo-200 ...">
  📝 모의고사 — 실전 9회 모의고사
</Link>

{/* 맞춤 모의고사 버튼 */}
<Link to="/custom-mock" className="block p-4 bg-gradient-to-r from-purple-50 to-pink-50 ...">
  🎯 맞춤 모의고사 — 무한 랜덤 조합
</Link>
```

### 라우트 확인 (App.jsx — 기존 등록 완료)
```
/mock          → MockExamHome (레벨 4 게이트)
/custom-mock   → CustomMockHome (레벨 5 게이트)
```

---

## 4. 테스트 결과

- 빌드: ✅ 성공 (141 modules, 5.91s)

---

## 5. 배포 결과

- Commit: (아래 참조)
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

---

## 6. 다음 작업

- 조대표님 브라우저 테스트 확인 대기
