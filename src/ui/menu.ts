import type { AuthUser } from '../engine/auth';

export interface MenuHandlers {
  onCreateCharacter: () => void;
  onContinueCharacter: () => void;
  onLogout: () => void;
  onGoToLogin: () => void;
}

export function renderMenu(
  root: HTMLElement,
  authUser: AuthUser | null,
  hasCharacter: boolean,
  taxDeathNotice: boolean,
  handlers: MenuHandlers
) {
  const taxDeathBanner = taxDeathNotice
    ? '<p class="menu-subtitle">세금을 내지 못해 파산했습니다. 모든 진행 상황이 초기화되었습니다.</p>'
    : '';
  root.innerHTML = `
    <div class="menu">
      <h1 class="menu-title">my-new-project</h1>
      <p class="menu-subtitle">카드 전략 배틀</p>
      ${taxDeathBanner}
      <div class="menu-rules">
        <p>마나를 사용해 카드를 내고, 적의 체력을 먼저 0으로 만들면 승리합니다.</p>
        <p>모든 전투 과정은 하단 로그에 기록됩니다.</p>
      </div>
      <button class="menu-start" id="start-btn">${hasCharacter ? '이어하기' : '캐릭터 생성'}</button>
      <div class="stat-line" style="text-align:center">${
        authUser
          ? `${authUser.username}님으로 로그인됨${authUser.isAdmin ? ' <span class="grade-tag">관리자</span>' : ''}`
          : '게스트 모드 (진행 상황이 이 브라우저에만 저장됩니다)'
      }</div>
      ${
        authUser
          ? '<button class="menu-return small" id="logout-btn">로그아웃</button>'
          : '<button class="menu-return small" id="login-link">로그인 / 회원가입</button>'
      }
    </div>
  `;

  document.getElementById('start-btn')?.addEventListener('click', hasCharacter ? handlers.onContinueCharacter : handlers.onCreateCharacter);
  document.getElementById('logout-btn')?.addEventListener('click', handlers.onLogout);
  document.getElementById('login-link')?.addEventListener('click', handlers.onGoToLogin);
}
