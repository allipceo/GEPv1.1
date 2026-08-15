# GEPv30-114 Dead Code 제거 (BottomNav, Header)

**작성일:** 2026.08.16
**작성자:** 고팀장 (Claude Code)
**지시자:** 노팀장 — GEPv30-113 회귀 검증 사전조사 중 발견, P-03(components/Settings.jsx)과 동일 패턴

## 1. 작업 목적

라우팅/메뉴 구조 사전조사 중 `src/components/BottomNav.jsx`, `src/components/Header.jsx`가
어디에서도 import되지 않는 미사용 dead code임을 발견. 실제 헤더는 `AppHeader.jsx`(GEPv30-098~102
롤아웃)로 전환 완료된 상태라 이 두 파일은 그 이전 설계의 잔재.

## 2. 수정/삭제 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/BottomNav.jsx` | 삭제 — import 0건 |
| `src/components/Header.jsx` | 삭제 — import 0건(`from '.../Header'` 정확 매칭 기준, `AppHeader` 부분일치 오탐 제외 확인) |

## 3. 테스트 결과

- 빌드: ✅ `npm run build` 성공 (오류 0)
- import 검증: `grep -rn "from ['\"].*/(BottomNav|Header)['\"]"` → 0건

## 4. 배포 결과

- Commit: (커밋 후 기입)
- URL: https://gepv11.vercel.app

## 5. 다음 작업

GEPv30-113 병합 후 회귀 검증(PHASE 1~6 시나리오)으로 이어짐.
