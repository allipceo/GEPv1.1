-- GEPv30-113 STEP D — 코드 레퍼런스 0건인 초기 보일러플레이트 테이블 정리
-- 013(gep_is_admin 재정의) 완료 후에만 실행 가능 — 순서 바뀌면 관리자 기능 전체 장애.
-- devices는 attempts.device_id FK가 걸려 있어 CASCADE 필요.
-- attempts.device_id는 프론트엔드 어디에서도 쓰지 않는 컬럼(항상 NULL) — CASCADE로
-- FK 제약만 제거되고 attempts 테이블/데이터는 영향 없음.

DROP TABLE IF EXISTS public.gep_admin_emails;
DROP TABLE IF EXISTS public.oauth_accounts;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.subscriptions;
