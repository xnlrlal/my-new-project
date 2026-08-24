import { supabase, isCloudConfigured } from './supabase-client';

const EMAIL_DOMAIN = 'users.my-new-project.local';

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('profiles').select('is_admin').eq('user_id', userId).maybeSingle();
  return data?.is_admin === true;
}

async function userFromSession(email: string | undefined, id: string): Promise<AuthUser> {
  const username = (email ?? '').split('@')[0];
  const isAdmin = await fetchIsAdmin(id);
  return { id, username, isAdmin };
}

export function validateCredentials(username: string, password: string): string | null {
  if (username.trim().length < 3) return '아이디는 3자 이상이어야 합니다.';
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return '아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.';
  if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
  return null;
}

// Maps known Supabase Auth error strings to a Korean message that names the
// likely cause, since this app's fake-email-domain design makes a couple of
// dashboard misconfigurations (Confirm email left on, tripping the built-in
// mailer's rate limit) look identical to a generic failure otherwise.
function describeAuthError(error: { message: string }): string {
  const message = error.message.toLowerCase();
  if (message.includes('already registered')) return '이미 사용 중인 아이디입니다.';
  if (message.includes('rate limit')) {
    return '요청이 너무 많습니다 (이메일 발송 한도 초과). Supabase 대시보드에서 Confirm email이 꺼져 있는지 확인하고 잠시 후 다시 시도해주세요.';
  }
  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return '현재 회원가입이 비활성화되어 있습니다. Supabase 대시보드의 Authentication 설정을 확인해주세요.';
  }
  console.error('Supabase auth error:', error);
  return error.message;
}

export async function signUp(username: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: '클라우드 저장이 아직 설정되지 않았습니다.' };
  const validationError = validateCredentials(username, password);
  if (validationError) return { ok: false, error: validationError };

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
  });

  if (error) return { ok: false, error: describeAuthError(error) };
  if (!data.user) return { ok: false, error: '회원가입에 실패했습니다.' };

  return { ok: true, user: await userFromSession(data.user.email, data.user.id) };
}

export async function signIn(username: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: '클라우드 저장이 아직 설정되지 않았습니다.' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return {
        ok: false,
        error: '이메일 확인이 필요한 상태입니다. Supabase 대시보드에서 Confirm email을 꺼주세요.',
      };
    }
    return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }
  if (!data.user) return { ok: false, error: '로그인에 실패했습니다.' };

  return { ok: true, user: await userFromSession(data.user.email, data.user.id) };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return null;
  return userFromSession(session.user.email, session.user.id);
}

export { isCloudConfigured };
