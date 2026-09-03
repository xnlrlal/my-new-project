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

## ⚠️ 기존 프로젝트라면: `is_admin` 보안 패치 재적용 필요

과거 버전의 `schema.sql`은 `protect_is_admin` 트리거를 `UPDATE`에만 걸어뒀습니다. 앱의 저장 로직(`saveCloudProfile`)은 `upsert`를 쓰기 때문에, 로그인 후 첫 저장은 `INSERT` 경로를 타서 이 트리거를 아예 거치지 않았습니다 — 즉 인증된 사용자가 앱을 거치지 않고 API를 직접 호출해 자기 계정의 `is_admin`을 `true`로 넣는 게 가능했던 결함입니다. 이미 이 저장소로 Supabase 프로젝트를 만들어 운영 중이라면, **`schema.sql` 전체를 SQL Editor에서 다시 실행**해 트리거를 `INSERT`까지 포함하도록 갱신해야 합니다(테이블은 `if not exists`, 정책은 `drop policy if exists`, 트리거는 `drop trigger if exists` 후 재생성이라 전체 재실행이 안전합니다 — 이전 버전의 `schema.sql`엔 정책 쪽 `drop ... if exists`가 없어 "policy ... already exists" 오류로 재실행 자체가 막혔을 수 있는데, 지금 버전은 그 문제가 고쳐져 있습니다).

## admin 계정 만들기

`profiles` 테이블에는 `is_admin` 컬럼이 있고, 일반 로그인 경로(앱/anon key)로는 스스로 켤 수 없도록 트리거로 막아뒀습니다 (SQL Editor에서만 변경 가능). 계정 자체(비밀번호 포함)는 앱의 회원가입 화면에서 직접 만들어야 합니다.

1. 배포된 앱(또는 로컬 `npm run dev`)에서 **회원가입** 탭 → 아이디 `admin`, 원하는 비밀번호로 가입
2. Supabase **SQL Editor**에서 아래 쿼리를 실행해 그 계정에 관리자 플래그를 켭니다 (`schema.sql` 맨 아래에도 주석으로 있음).

```sql
update public.profiles
set is_admin = true
where user_id = (select id from auth.users where email = 'admin@users.my-new-project.local');
```

3. 로그아웃 후 다시 `admin`으로 로그인하면 메인 메뉴에 "관리자" 표시가 뜹니다. 지금은 이 플래그만 있고 관리자 전용 기능은 아직 없습니다 — 이후 여기에 이어서 기능을 추가하면 됩니다.

## 나중에 이메일/소셜 로그인으로 확장하기

이미 Supabase Auth 위에서 동작하므로, 나중에 실제 이메일 인증이나 구글 등 소셜 로그인을 추가할 때 게임 쪽 로직을 다시 만들 필요는 없습니다.

- **이메일 인증**: 가입 시 실제 이메일 주소를 입력받아 `usernameToEmail` 대신 그대로 사용하고, Confirm email을 다시 켜면 됩니다.
- **소셜 로그인**: **Authentication → Providers**에서 Google 등을 활성화하고 OAuth 클라이언트 정보를 등록한 뒤, `supabase.auth.signInWithOAuth({ provider: 'google' })` 호출을 추가하면 됩니다.
