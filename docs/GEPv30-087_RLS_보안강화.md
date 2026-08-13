# GEPv30-087_RLS_보안강화

**작성일:** 2026.08.08 [08081320 추정]  
**작성자:** 노팀장 (개발관리창006) — Supabase MCP 직접 처리  
**Phase:** Phase 2 — 보안 긴급 조치  
**승인:** 조대표님 08081300 승인

---

## 1. 작업 목적

GEPv30-086 작업 중 고팀장이 Supabase 스캔에서 발견한 보안 취약점:  
4개 테이블에 RLS(Row Level Security)가 비활성화되어 있어  
anon key만 있으면 누구나 해당 테이블을 읽고 쓸 수 있는 상태였음.

---

## 2. 조치 테이블

| 테이블 | 사전 상태 | 데이터 | 앱 코드 참조 |
|--------|----------|--------|------------|
| `oauth_accounts` | RLS OFF | 0건 | 없음 |
| `sessions` | RLS OFF | 0건 | 없음 |
| `devices` | RLS OFF | 0건 | 없음 |
| `subscriptions` | RLS OFF | 0건 | 없음 |

---

## 3. 적용 마이그레이션

```sql
ALTER TABLE public.oauth_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON public.oauth_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_only" ON public.sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_only" ON public.devices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_only" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**정책 의미:** 본인(auth.uid() = user_id)만 자신의 데이터 접근 가능.  
anon key로 타인 데이터 접근 완전 차단.

---

## 4. 적용 결과

```
devices       → rowsecurity: true ✅
oauth_accounts → rowsecurity: true ✅
sessions      → rowsecurity: true ✅
subscriptions → rowsecurity: true ✅
```

---

## 5. 앱 영향

- 4개 테이블 모두 현재 GEP 앱 코드(src/)에서 미참조 → **앱 동작 영향 없음**
- 향후 이 테이블들을 사용하는 기능 개발 시 RLS 정책이 이미 적용되어 있으므로  
  `auth.uid() = user_id` 패턴으로 쿼리 작성하면 자동 보호됨

---

## 6. 비고

- DB 마이그레이션이므로 git 커밋 대상 아님
- Supabase 대시보드 마이그레이션 히스토리에 `enable_rls_unused_tables`로 기록됨
