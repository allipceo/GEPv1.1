# GEPv30-085 개발 지시서 — 홈 통계 실시간 갱신 + OXHome 미니 대시보드

**작성일:** 2026.08.08 [08081258]  
**작성자:** 노팀장 (개발관리창006)  
**지시대상:** 고팀장 (Claude Code)  
**Phase:** Phase 2 — S3 후속 버그픽스 + 신규

---

## 1. 배경 및 목적

GEPv30-084(홈 대시보드 개편) 배포 후 조대표님 실사용 검증에서 다음 이슈 발견:

- **버그-1:** OX 풀이 후 홈으로 돌아오면 진위형 카운트가 0으로 그대로 (실시간 미반영)
- **버그-2:** MCQ 풀이 후 홈 재방문 시에도 선택형 통계가 최신 DB 기준으로 갱신 안 됨
- **신규:** OXHome(/ox)에 대시보드 없음 — 선택형처럼 학습 현황을 바로 보여줘야 함

노팀장 코드 분석 완료. 원인과 해결책 확정 후 조대표님 08081258 승인 득함.

---

## 2. 수정 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `src/pages/Home.jsx` | 버그픽스 | oxTotal + MCQ 통계 홈 재방문 시마다 DB 재갱신 |
| `src/pages/OXHome.jsx` | 신규 기능 | OX 풀이 현황 미니 대시보드 추가 |

**수정 금지 파일:** 위 2개 외 모든 파일

---

## 3. Home.jsx 수정 (버그-1, 버그-2)

### 3-1. 원인

```javascript
// 현재 — 로그인 시 단 1회만 실행, 홈 재방문 시 미실행
useEffect(() => {
  ...oxTotal 쿼리...
}, [authStatus, userId])
```

`authStatus`, `userId`는 홈 재방문 시 변경되지 않으므로 Effect 재실행 없음.  
MCQ `syncFromDB`도 로그인 1회만 실행되어 이후 다른 기기 풀이 반영 안 됨.

### 3-2. 수정 내용

#### STEP 1 — `useLocation` import 추가

```javascript
// 변경 전
import { useNavigate } from 'react-router-dom'

// 변경 후
import { useNavigate, useLocation } from 'react-router-dom'
```

#### STEP 2 — `location` 선언 추가

`const navigate = useNavigate()` 바로 아래에 추가:

```javascript
const navigate = useNavigate()
const location = useLocation()   // ← 추가
```

#### STEP 3 — oxTotal useEffect 의존성에 `location.key` 추가

```javascript
// 변경 전
}, [authStatus, userId])

// 변경 후
}, [authStatus, userId, location.key])
```

> `location.key`는 navigate가 발생할 때마다 새 값이 됩니다.  
> 홈으로 돌아올 때마다 Effect가 재실행되어 OX 카운트가 최신화됩니다.

#### STEP 4 — MCQ 통계 syncFromDB 재호출 useEffect 추가

`oxTotal` useEffect 바로 아래에 새 useEffect 삽입:

```javascript
// MCQ 통계 최신화 — 홈 재방문 시마다 DB에서 재동기화
useEffect(() => {
  if (authStatus !== 'authenticated' || !userId) return
  useStatsStore.getState().syncFromDB(userId)
}, [authStatus, userId, location.key])
```

> ⚠️ `useStatsStore`는 이미 import되어 있으므로 추가 import 불필요.  
> ⚠️ 이 useEffect는 반드시 guest 조기 반환 **이전**(다른 훅들과 함께) 배치할 것 — Hooks 규칙.

---

## 4. OXHome.jsx 수정 (신규 대시보드)

### 4-1. 목표

OXHome 상단(과목 카드 목록 위)에 OX 학습 현황 미니 대시보드를 표시.  
데이터: Supabase `attempts` WHERE `study_mode='ox'` 쿼리.  
표시 항목: 총 풀이수 / 전체 정답률 / 3과목별 풀이수

### 4-2. import 추가

파일 최상단 import 블록에 추가:

```javascript
import { useState, useEffect } from 'react'
import { supabase }            from '../lib/supabase'
import { useAuthStore }        from '../stores/authStore'
```

> ⚠️ `useAuthStore`는 이미 import되어 있으므로 중복 추가 금지.  
> `useState`, `useEffect`, `supabase`만 추가.

### 4-3. 컴포넌트 내 추가 코드

`OXHome()` 컴포넌트 내부, 기존 훅 선언부 아래에 추가:

```javascript
const userId     = useAuthStore((s) => s.userId)
const authStatus = useAuthStore((s) => s.authStatus)

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
```

### 4-4. 대시보드 JSX — 과목 카드 목록 위에 삽입

`{/* 과목 카드 3개 */}` 섹션 바로 위에 삽입:

```jsx
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
```

> ⚠️ `oxDash === null` (로딩 중)이거나 `total === 0` (미학습)이면 대시보드 미표시 — 깔끔한 초기 화면 유지.

---

## 5. 검증 기준

| 코드 | 검증 항목 | 합격 기준 |
|------|----------|----------|
| V1 | 빌드 | `npm run build` 에러 없음 |
| V2 | OX 카운팅 실시간 | OX 1라운드 완료 후 홈으로 이동 → 진위형 카운트 증가 확인 |
| V3 | MCQ 통계 실시간 | MCQ 10문제 풀기 후 홈으로 이동 → 선택형 카운트 증가 확인 |
| V4 | OXHome 대시보드 | OX 풀이 기록 있는 계정 → OXHome 접속 시 현황 카드 표시 |
| V5 | OXHome 미학습 | 처음 접속한 계정 → 대시보드 카드 미표시 (과목 카드만 보임) |
| V6 | Hooks 순서 | 콘솔에 "Rendered more hooks" 에러 없음 |
| V7 | 기존 기능 | 홈 6개 버튼, OXHome 과목 카드, 통계 버튼 — 모두 정상 작동 |

---

## 6. 완료 후 보고 형식

```
GEPv30-085 완료 보고

수정 파일: 2개
- src/pages/Home.jsx : oxTotal + syncFromDB location.key 트리거 추가
- src/pages/OXHome.jsx : OX 미니 대시보드 추가

빌드: ✅ / V1~V7 검증: ✅
Commit: [해시]
문서화: docs/GEPv30-085_홈통계실시간갱신_OXHome대시보드.md ✅
```

---

**⚠️ CLAUDE.md 형상관리 원칙 준수 — 문서화 완료 후 git push**
