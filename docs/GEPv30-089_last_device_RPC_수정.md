# GEPv30-089 last_device 업데이트 RPC 수정

**작성일:** 2026.08.08  
**작성자:** 노팀장 (개발관리창 / Cowork)  
**Phase:** Phase 2 — S5 레드팀 테스트 중 발견 버그 수정  
**지시자:** 조대표님 ("진행하세요" 승인 — S5 자동 디버깅 위임)

---

## 1. 작업 목적

GEPv30-088(S4 채널 추적) 배포 후 S5 레드팀 테스트에서 발견한 버그:  
users 테이블에 `users_self_update` RLS 정책이 없어 일반 사용자의 `last_device` / `last_access_at` UPDATE가 전면 차단됨 → DB에 항상 `null` 기록.

**근본 원인:** GEPv30-087(RLS 강화) 시 `users_admin_update`만 설정, `users_self_update` 누락.

**해결 방법:** `SECURITY DEFINER` 함수 `update_last_device` 생성 → authStore.js에서 direct UPDATE 대신 RPC 호출로 변경.  
이 방식은 service_level 등 민감 컬럼을 건드리지 않고 last_device/last_access_at만 업데이트하므로 보안상 안전.

---

## 2. 수정/추가 내용

| 대상 | 변경 내용 |
|------|----------|
| Supabase DB | `public.update_last_device(p_device TEXT)` SECURITY DEFINER 함수 추가 (apply_migration) |
| `src/stores/authStore.js` | 189번 라인: `.from('users').update({...}).eq(...)` → `.rpc('update_last_device', { p_device: currentDevice })` |

---

## 3. 주요 변경사항

### DB (Supabase Migration: add_update_last_device_function)
```sql
CREATE OR REPLACE FUNCTION public.update_last_device(p_device TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET 
    last_device    = p_device,
    last_access_at = now()
  WHERE user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_last_device(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_last_device(TEXT) TO authenticated;
```

### authStore.js — 변경 전
```javascript
supabase
  .from('users')
  .update({ last_device: currentDevice, last_access_at: new Date().toISOString() })
  .eq('user_id', user.id)
  .then(({ error: devErr }) => {
    if (devErr) console.warn('[GEP] last_device update failed:', devErr.message)
  })
```

### authStore.js — 변경 후
```javascript
supabase
  .rpc('update_last_device', { p_device: currentDevice })
  .then(({ error: devErr }) => {
    if (devErr) console.warn('[GEP] last_device update failed:', devErr.message)
  })
```

---

## 4. 테스트 결과

- 빌드: ✅ 성공 (`npm run build` — sandbox outDir `/tmp/gep_dist_check`)
- DB 함수 생성: ✅ Supabase MCP `apply_migration` 성공

---

## 5. 배포 결과

- Commit: (아래 git push 후 기재)
- URL: https://gepv11.vercel.app
- 비고: 조대표님 재로그인 시 users 테이블 last_device/last_access_at 기록 확인 필요

---

## 6. 검증 요청

조대표님이 https://gepv11.vercel.app 에서 로그아웃 → 재로그인 후:
- Supabase users 테이블에서 `last_device` = 'desktop' (또는 'mobile'), `last_access_at` = 현재 시각 확인
- 홈 화면에 "채널 변경 감지" 배너 표시 여부 확인 (이전 기기와 다를 경우)
