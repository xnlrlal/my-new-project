import { formatGameDateTime, formatGameDuration, gameDurationFromSeconds, type ClockSpeed, type GameDateTime } from '../engine/village-clock';

export interface VillageClockView {
  dateTime: GameDateTime;
  speed: ClockSpeed;
  secondsUntilJudgment: number;
  pendingJudgmentRemainingSeconds: number | null;
}

export interface VillageHandlers {
  onContinue: () => void;
  onBack: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenShop: () => void;
  onOpenLibrary: () => void;
  onOpenExchange: () => void;
  onSetSpeed: (speed: ClockSpeed) => void;
  onSkip: () => void;
  onAcceptJudgment: () => void;
  onDeclineJudgment: () => void;
  onQuitToMenu: () => void;
}

// hasCharacter=true means race selection is already final (raceId saved) —
// the "뒤로" button that would let a player reselect their race must not
// render then, since character creation is a one-time, irreversible choice
// until death resets the whole save.
export function renderVillage(
  root: HTMLElement,
  hasCharacter: boolean,
  hasVisitedDungeonExchange: boolean,
  clock: VillageClockView,
  handlers: VillageHandlers
) {
  const judging = clock.pendingJudgmentRemainingSeconds !== null;
  const backButton = hasCharacter ? '' : '<button class="menu-return" id="back-btn">뒤로</button>';

  const speedButtons = ([1, 2, 4] as ClockSpeed[])
    .map(
      (speed) =>
        `<button class="menu-return small${speed === clock.speed ? ' active' : ''}" data-speed="${speed}" ${judging ? 'disabled' : ''}>${speed}배속</button>`
    )
    .join('');

  const judgmentPanel = judging
    ? `
      <div class="essence-drop">
        <div class="essence-drop-title">미궁에 입장하시겠습니까?</div>
        <div class="essence-drop-detail">남은 시간: ${clock.pendingJudgmentRemainingSeconds}초 — 응답이 없으면 자동으로 거부됩니다.</div>
        <div class="essence-drop-actions">
          <button class="menu-start" id="accept-judgment">입장한다</button>
          <button class="menu-return" id="decline-judgment">거부한다</button>
        </div>
      </div>
    `
    : `<div class="stat-line" style="text-align:center">미궁 입장까지 남은 시간: ${formatGameDuration(gameDurationFromSeconds(clock.secondsUntilJudgment))}</div>`;

  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">마을</h2>
      <div class="stats-card">
        <div class="stat-line" style="text-align:center;font-weight:600">${formatGameDateTime(clock.dateTime)}</div>
        <div class="nav-row">
          ${speedButtons}
        </div>
        <button class="menu-return small" id="skip-btn" ${judging ? 'disabled' : ''}>다음 판단 시점까지 스킵</button>
      </div>
      ${judgmentPanel}
      <p class="menu-subtitle">모험을 떠나기 전, 잠시 마을에 들렀다.</p>
      <button class="menu-start" id="continue-btn" ${judging ? 'disabled' : ''}>캐릭터 정보 보기</button>
      <div class="nav-row">
        <button class="menu-return small" id="inventory-btn" ${judging ? 'disabled' : ''}>인벤토리</button>
        <button class="menu-return small" id="equipment-btn" ${judging ? 'disabled' : ''}>장비창</button>
      </div>
      <div class="nav-row">
        <button class="menu-return small" id="shop-btn" ${judging ? 'disabled' : ''}>상점</button>
        <button class="menu-return small" id="library-btn" ${judging ? 'disabled' : ''}>도서관</button>
        <button class="menu-return small" id="exchange-btn" ${judging || !hasVisitedDungeonExchange ? 'disabled' : ''}>환전소${hasVisitedDungeonExchange ? '' : ' <span class="race-locked-badge">잠김</span>'}</button>
      </div>
      <button class="menu-return small" id="quit-btn" ${judging ? 'disabled' : ''}>게임 종료</button>
      ${backButton}
    </div>
  `;

  document.getElementById('continue-btn')?.addEventListener('click', handlers.onContinue);
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
  document.getElementById('inventory-btn')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('equipment-btn')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('shop-btn')?.addEventListener('click', handlers.onOpenShop);
  document.getElementById('library-btn')?.addEventListener('click', handlers.onOpenLibrary);
  document.getElementById('exchange-btn')?.addEventListener('click', handlers.onOpenExchange);
  document.getElementById('skip-btn')?.addEventListener('click', handlers.onSkip);
  document.getElementById('quit-btn')?.addEventListener('click', handlers.onQuitToMenu);
  document.getElementById('accept-judgment')?.addEventListener('click', handlers.onAcceptJudgment);
  document.getElementById('decline-judgment')?.addEventListener('click', handlers.onDeclineJudgment);
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onSetSpeed(Number(btn.dataset.speed) as ClockSpeed));
  });
}
