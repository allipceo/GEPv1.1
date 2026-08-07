# GEPv30-020 Supabase 실연결 복원 및 검증보고서

작성일: 2026-08-05
작성자: 채팀장

## 1. 요청

조대표님 요청에 따라 과거 실제 작동하던 GEP v1.1의 Supabase 연결 정보를 GitHub 및 배포본에서 확인하고, 현재 GEP v3.0 파일럿 개발본에 동일 연결을 적용할 수 있는지 검증하였다.

## 2. 확인 결과

### GitHub 저장소

- 로컬 및 원격 GitHub 브랜치에서 `.env.local` 파일은 발견되지 않았다.
- `.gitignore`에 `.env`, `.env.local`, `.env.*.local`, `*.local`이 제외 대상으로 등록되어 있었다.
- 따라서 `.env.local`이 GitHub에 없는 것은 정상적인 보안 관리 상태로 판단된다.

### 기존 문서

원격 `origin/main`의 `docs/GEP_033_Supabase스키마구축.md`에서 기존 Supabase 프로젝트 정보가 확인되었다.

- Supabase project id: `rwqecsgzhknutnhppqgb`
- Supabase URL 형식: `https://rwqecsgzhknutnhppqgb.supabase.co`
- `.env.local` 필요 항목:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 기존 배포본

기존 운영 배포 URL `https://gepv11.vercel.app/`의 브라우저 번들에서 동일 Supabase URL과 anon public key를 확인하였다.

- 확인된 URL: `https://rwqecsgzhknutnhppqgb.supabase.co`
- anon key: 확인 완료, 로컬 `.env.local`에 반영함
- anon key는 브라우저 앱에 포함되는 공개 키이므로 service role key와 다르다.

## 3. 로컬 반영

`GEPv1.1-source/.env.local`을 생성하고 기존 배포본에서 확인한 값을 반영하였다.

해당 파일은 `.gitignore` 대상이므로 GitHub에 커밋하지 않는다.

## 4. 검증

### 빌드 검증

명령:

```powershell
npm run build
```

결과:

- Vite production build 성공
- 147 modules transformed
- 기능 실패는 없음
- 번들 크기 경고만 발생

### Supabase 실접속 검증

실제 Supabase REST/API 접속을 시도했으나 다음 오류가 발생하였다.

```text
The remote name could not be resolved: 'rwqecsgzhknutnhppqgb.supabase.co'
DNS name does not exist
```

즉 현재 문제는 앱 코드나 anon key 형식 문제가 아니라, 기존 Supabase 프로젝트 도메인이 DNS에서 해석되지 않는 상태이다.

## 5. 판단

현재 상태에서는 과거 GEP v1.1이 사용하던 Supabase 프로젝트가 삭제되었거나 비활성화/정지되어 도메인이 내려간 가능성이 높다.

따라서 다음 게이트를 통과하려면 Supabase 대시보드에서 해당 프로젝트가 살아 있는지 먼저 확인해야 한다.

## 6. 다음 조치 제안

1. 조대표님 Supabase 계정에서 프로젝트 `rwqecsgzhknutnhppqgb` 존재 여부 확인
2. 프로젝트가 존재하면 API URL이 동일한지 확인
3. 프로젝트가 삭제되었으면 새 Supabase 프로젝트 생성
4. 새 URL과 anon key를 `.env.local`에 반영
5. `supabase/schema.sql` 및 `supabase/migrations/007_v3_pilot_approval.sql` 적용
6. Google OAuth redirect URL에 로컬 및 배포 URL 등록
7. 운영자 계정 `choeunsang@gmail.com` 로그인 후 관리자/승인/카운팅 실검증 진행

## 7. 게이트 판정

- 로컬 env 복원: 통과
- GitHub env 존재 여부 확인: 통과
- 기존 배포본 설정 복원: 통과
- 로컬 빌드: 통과
- 실제 Supabase DB 연결: 보류

보류 사유: 기존 Supabase 프로젝트 도메인이 현재 DNS에서 존재하지 않음.
