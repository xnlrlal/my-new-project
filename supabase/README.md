# 클라우드 저장 설정 (Supabase)

로그인/데이터 저장 기능은 [Supabase](https://supabase.com)의 무료 플랜을 사용합니다. 별도 백엔드 서버 없이, 브라우저에서 Supabase의 인증(Auth)과 데이터베이스(Postgres)를 직접 사용합니다. 아래 설정을 완료하기 전까지는 앱이 자동으로 **게스트 모드**(브라우저 localStorage 저장)로만 동작하며, 정상적으로 작동합니다.

> **현재 프로젝트 연결 상태**: `render.yaml`에 Supabase 프로젝트 URL과 anon(publishable) key가 이미 설정되어 있습니다. 아래 1번(스키마 실행)과 2번(이메일 확인 끄기)을 Supabase 대시보드에서 아직 하지 않으셨다면 꼭 진행해주세요 — 이 두 단계는 코드가 아니라 Supabase 프로젝트 설정이라 저장소에 반영할 수 없습니다.

## 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 무료 계정 생성 후 새 프로젝트(Project) 생성
2. 프로젝트가 준비되면 좌측 메뉴의 **SQL Editor** → New query로 이동
3. 이 저장소의 `supabase/schema.sql` 내용을 붙여넣고 실행 (`profiles` 테이블 + 보안 정책 생성)

## 2. 이메일 확인(Confirm email) 끄기 — 중요

이 앱은 "아이디"만 입력받고, 내부적으로 `아이디@users.my-new-project.local` 형태의 가짜 이메일로 Supabase Auth의 이메일/비밀번호 로그인을 사용합니다. 실제 메일을 받을 수 없으므로, 이메일 확인이 켜져 있으면 회원가입 후 로그인이 막힙니다.

- **Authentication → Providers → Email** 에서 **Confirm email**을 반드시 꺼주세요.

## 3. API 키 확인

**Settings → API** 메뉴에서 다음 두 값을 확인합니다.

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

(anon key는 클라이언트에 노출되어도 안전하도록 설계된 공개 키입니다. 실제 데이터 보호는 1번의 Row Level Security 정책이 담당합니다.)

## 4. 배포 환경에 값 설정

**Render 대시보드 → 서비스 선택 → Environment** 탭에서 위 두 값을 추가하고, 이후 재배포(Manual Deploy)하면 적용됩니다. Vite 환경변수는 빌드 시점에 번들에 포함되므로, 값을 바꾼 뒤에는 반드시 다시 빌드/배포해야 합니다.

로컬 개발 시에는 프로젝트 루트에 `.env.local` 파일을 만들어 아래처럼 넣으면 됩니다 (git에는 커밋되지 않음).

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 나중에 이메일/소셜 로그인으로 확장하기

이미 Supabase Auth 위에서 동작하므로, 나중에 실제 이메일 인증이나 구글 등 소셜 로그인을 추가할 때 게임 쪽 로직을 다시 만들 필요는 없습니다.

- **이메일 인증**: 가입 시 실제 이메일 주소를 입력받아 `usernameToEmail` 대신 그대로 사용하고, Confirm email을 다시 켜면 됩니다.
- **소셜 로그인**: **Authentication → Providers**에서 Google 등을 활성화하고 OAuth 클라이언트 정보를 등록한 뒤, `supabase.auth.signInWithOAuth({ provider: 'google' })` 호출을 추가하면 됩니다.
