# GEPv30-158 관리자 화면 탭 전환 — 구현 결과보고서

**작성일**: 2026-09-04
**작성자**: 고팀장 (Claude Code)
**지시**: 조대표 — "관리자 화면 최상단에 [대시보드]/[사용자관리] 두 버튼을 두고, 각 버튼을 누르면 해당 내용이 뜨도록"
**선행**: GEPv30-157 (AdminDashboard 구현)

---

## 1. 배경

GEPv30-157에서 `/admin/dashboard`를 만들었으나 진입 버튼이 없어 URL 직접 입력으로만 접근 가능했음.
조대표 지시로 관리자 두 화면(대시보드 / 사용자관리)을 상단 탭으로 상호 전환하도록 연결.

---

## 2. 수정/추가 파일 (4개)

| 파일 | 변경 |
|------|------|
| `src/components/AdminTabs.jsx` | **신규** — 상단 탭 바. `[📊 대시보드]` `[👤 사용자관리]` 두 버튼, `active` prop으로 현재 화면 강조, 클릭 시 해당 라우트로 `navigate` |
| `src/pages/AdminDashboard.jsx` | 상단에 `<AdminTabs active="dashboard" />` 추가 (헤더 위) |
| `src/pages/AdminUsers.jsx` | `<AdminShell>` 최상단에 `<AdminTabs active="users" />` 추가 |
| `src/pages/Home.jsx` | 우상단 "관리자" 버튼 목적지 `/admin/users` → `/admin/dashboard` 변경 (진입 시 대시보드가 먼저 보이도록) |

---

## 3. 동작

```
홈 우상단 [관리자] 클릭
      ↓
/admin/dashboard  (대시보드 내용 + 상단 탭바)
  ┌─────────────────────────────┐
  │ [📊 대시보드]* [👤 사용자관리] │   ← * = 현재 활성(파란색)
  └─────────────────────────────┘
      │
      └─ [👤 사용자관리] 클릭 → /admin/users (기존 사용자 승인 관리 화면 + 상단 탭바)
                                    └─ [📊 대시보드] 클릭 → 다시 /admin/dashboard
```

- 라우트 기반 전환이라 브라우저 뒤로가기 정상 동작, URL 공유 가능
- 관리자 가드(`isAdmin`)는 두 화면 각각 기존 로직 그대로 유지
- 비관리자 접근 시 각 화면의 "운영자 권한 필요" 화면 (탭바 미표시)

---

## 4. 검증

| 체크 | 결과 |
|------|------|
| `npm run build` | ✅ 성공 (166 modules, 에러 0) |
| 탭바 렌더 (관리자) | 배포 후 실계정 확인 요청 |
| 대시보드 ↔ 사용자관리 상호 이동 | 배포 후 실계정 확인 요청 |
| 비관리자 → 권한 필요 화면 | 기존 로직 불변 |

---

## 5. 배포

```
git add src/components/AdminTabs.jsx src/pages/AdminDashboard.jsx src/pages/AdminUsers.jsx src/pages/Home.jsx \
        docs/GEPv30-158-DEV-고팀장_관리자탭_구현결과보고서.md
git commit -m "feat: GEPv30-158 관리자 화면 상단 탭(대시보드/사용자관리) 전환"
git push origin main
```

---

*GEPv30-158 | 담당: 고팀장(개발) | 선행: GEPv30-157*
