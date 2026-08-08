# GEPv30-085_홈통계실시간갱신_OXHome대시보드

**작성일:** 2026.08.08
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 2 — S3 후속 버그픽스 + 신규
**지시자:** 노팀장 (개발관리창006) — 조대표님 08081258 승인

## 1. 작업 목적
GEPv30-084 배포 후 실사용 검증에서 발견된 2가지 버그(OX/MCQ 통계가 홈 재방문 시 갱신되지 않음)를 수정하고, OXHome(/ox)에 OX 학습 현황 미니 대시보드를 신규 추가.

## 2. 수정/추가 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Home.jsx` | `useLocation` 추가, oxTotal useEffect 의존성에 `location.key` 추가, MCQ `syncFromDB` 재호출 useEffect 신규 추가 (동일 dependency) |
| `src/pages/OXHome.jsx` | `useState`/`useEffect`/`supabase` import 추가, OX attempts 집계용 `oxDash` state 추가, 과목 카드 위에 미니 대시보드(총 풀이수/정답률/3과목별 풀이수) JSX 삽입 |

## 3. 주요 변경사항

### Home.jsx — 변경 전
```javascript
useEffect(() => {
  ...oxTotal 쿼리...
}, [authStatus, userId])
```

### Home.jsx — 변경 후
```javascript
useEffect(() => {
  ...oxTotal 쿼리...
}, [authStatus, userId, location.key])

// MCQ 통계 최신화 — 홈 재방문 시마다 DB에서 재동기화
useEffect(() => {
  if (authStatus !== 'authenticated' || !userId) return
  useStatsStore.getState().syncFromDB(userId)
}, [authStatus, userId, location.key])
```
`location.key`는 `navigate()` 발생마다 갱신되므로, OX/MCQ 풀이 후 홈으로 돌아올 때마다 두 Effect가 재실행되어 최신 DB 값으로 갱신된다. 두 useEffect 모두 guest 조기 반환(`if (authStatus === 'guest') return`) 이전에 배치하여 Hooks 규칙을 준수함.

### OXHome.jsx — 신규 추가
```javascript
const [oxDash, setOxDash] = useState(null)  // null = 로딩중

useEffect(() => {
  if (authStatus !== 'authenticated' || !userId) return
  supabase.from('attempts').select('subject, is_correct')
    .eq('user_id', userId).eq('study_mode', 'ox')
    .then(({ data }) => { /* total/correct/bySubj(law,p1,p2) 집계 */ })
}, [authStatus, userId])
```
과목 카드 목록 위에 `oxDash && oxDash.total > 0`일 때만 미니 대시보드 카드를 렌더링 (미학습 시 미표시, 초기 화면 깔끔하게 유지). `serviceLevel` 게이트 조기 반환보다 앞에 훅을 배치하여 Hooks 규칙 준수.

## 4. 테스트 결과
- 빌드: ✅ 성공 (`npm run build`)
- V1 빌드: ✅
- V6 Hooks 순서: ✅ 로컬 dev 서버(게스트 화면) 콘솔 에러 없음 확인 — 두 파일 모두 신규 훅을 조기 반환 이전에 배치했으므로 렌더링 시 "Rendered more hooks" 에러 발생 여지 없음
- V2(OX 실시간), V3(MCQ 실시간), V4(OXHome 대시보드 표시), V5(OXHome 미학습 시 미표시), V7(기존 기능 전체) : 실계정 로그인 및 실제 풀이 기록이 필요한 항목으로 로컬에서 확인 불가 — 배포 후 실계정 검증 필요

## 5. 배포 결과
- Commit: (아래 참조)
- URL: https://gepv11.vercel.app
- 비고: 없음

## 6. 다음 작업
- 대표님/노팀장 실계정 검증: OX 1라운드 완료 후 홈 이동 시 진위형 카운트 증가, MCQ 10문제 후 홈 이동 시 선택형 카운트 증가, OXHome 접속 시 대시보드 카드 표시(풀이기록 있을 때)/미표시(없을 때), 콘솔 Hooks 에러 없음, 기존 홈 6버튼·OXHome 과목카드·통계버튼 정상 작동
