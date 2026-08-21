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

export async function signUp(username: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: '클라우드 저장이 아직 설정되지 않았습니다.' };
  const validationError = validateCredentials(username, password);
  if (validationError) return { ok: false, error: validationError };

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: '이미 사용 중인 아이디입니다.' };
    }
    return { ok: false, error: error.message };
  }
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
