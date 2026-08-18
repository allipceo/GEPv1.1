# GEPv30-131 EMERGENCY_FULL_OPEN 전체개방 전환

**문서 번호:** GEPv30-131
**작성일:** 2026-08-18
**작성자:** 고팀장 (Claude Code)
**작업 성격:** 설정값 1줄 변경 (코드 로직 변경 없음)

---

## 1. 작업 목적

안내 홈페이지(`gepguide`) 콘텐츠 제작을 위해 GEPv3.0의 모든 서비스 UI를 참조·촬영할 필요가 생겨, 파일럿 순차오픈 잠금을 임시로 전체 해제한다.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/config/featureFlags.js` | `EMERGENCY_FULL_OPEN`: `false` → `true` |

`SERVICE_FLAGS` 개별 값은 변경하지 않았다 — `isServiceEnabled()`가 `EMERGENCY_FULL_OPEN` 우선 체크로 즉시 전체 서비스를 개방하는 기존 롤백 안전망(GEPv30-120/124)을 그대로 사용한다.

## 3. 사전 확인

- `gepv30-120-service-flags` 브랜치: 이미 `main`에 병합 완료된 상태(커밋 `d1da977`) — 별도 병합 작업 불필요.

## 4. 테스트 결과

- 빌드: ✅ 성공 (158 modules, 에러 0건)

## 5. 배포 결과

- Push 예정: `origin/main`
- URL: https://gepv30.vercel.app
- **원복 방법:** `EMERGENCY_FULL_OPEN = false`로 되돌리고 동일하게 build → push (파일럿 전환 시점에 실행)

---

*문서 끝 — GEPv30-131 (2026-08-18)*
