export type AuthMode = 'login' | 'signup';

export interface AuthScreenState {
  mode: AuthMode;
  error: string | null;
  loading: boolean;
  cloudConfigured: boolean;
}

export interface AuthHandlers {
  onSwitchMode: (mode: AuthMode) => void;
  onSubmit: (username: string, password: string) => void;
  onGuest: () => void;
}

export function renderAuth(root: HTMLElement, state: AuthScreenState, handlers: AuthHandlers) {
  const { mode, error, loading, cloudConfigured } = state;

  const formHtml = cloudConfigured
    ? `
      <div class="auth-tabs">
        <button class="auth-tab ${mode === 'login' ? 'active' : ''}" id="tab-login" type="button" ${loading ? 'disabled' : ''}>로그인</button>
        <button class="auth-tab ${mode === 'signup' ? 'active' : ''}" id="tab-signup" type="button" ${loading ? 'disabled' : ''}>회원가입</button>
      </div>
      <form id="auth-form" class="auth-form">
        <input class="auth-input" type="text" id="username" placeholder="아이디" autocomplete="username" />
        <input class="auth-input" type="password" id="password" placeholder="비밀번호" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" />
        ${error ? `<div class="auth-error">${error}</div>` : ''}
        <button class="menu-start" type="submit" id="auth-submit" ${loading ? 'disabled' : ''}>
          ${loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
    `
    : `<p class="inventory-note">클라우드 저장이 아직 설정되지 않아 로그인 없이 게스트로만 플레이할 수 있습니다.</p>`;

  root.innerHTML = `
    <div class="menu">
      <h1 class="menu-title">my-new-project</h1>
      <p class="menu-subtitle">카드 전략 배틀</p>
      ${formHtml}
      <button class="menu-return" id="guest-btn">게스트로 계속하기</button>
      ${cloudConfigured ? '<p class="inventory-note">로그인하면 진행 상황이 계정에 저장되어 다른 기기에서도 이어할 수 있습니다.</p>' : ''}
    </div>
  `;

  document.getElementById('tab-login')?.addEventListener('click', () => handlers.onSwitchMode('login'));
  document.getElementById('tab-signup')?.addEventListener('click', () => handlers.onSwitchMode('signup'));
  document.getElementById('guest-btn')?.addEventListener('click', handlers.onGuest);

  const form = document.getElementById('auth-form') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = (document.getElementById('username') as HTMLInputElement)?.value ?? '';
    const password = (document.getElementById('password') as HTMLInputElement)?.value ?? '';
    handlers.onSubmit(username, password);
  });
}
