import type { Actor, GameState } from '../engine/types';

export interface BattleHandlers {
  onPlayCard: (cardId: string) => void;
  onEndTurn: () => void;
  onExitToMenu: () => void;
}

function renderActor(actor: Actor, role: 'player' | 'enemy'): string {
  const hpPct = Math.round((actor.hp / actor.maxHp) * 100);
  const manaPct = Math.round((actor.mana / actor.maxMana) * 100);
  return `
    <div class="actor ${role}">
      <div class="actor-name">${actor.name}</div>
      <div class="bar"><div class="bar-fill" style="width:${hpPct}%"></div></div>
      <div class="stat-line">HP ${actor.hp}/${actor.maxHp} ${actor.shield > 0 ? `· 방어막 ${actor.shield}` : ''}</div>
      <div class="bar"><div class="bar-fill mana" style="width:${manaPct}%"></div></div>
      <div class="stat-line">마나 ${actor.mana}/${actor.maxMana}</div>
    </div>
  `;
}

export function renderBattle(root: HTMLElement, state: GameState, handlers: BattleHandlers) {
  const { player, enemy, log, status } = state;

  const banner =
    status === 'win'
      ? `<div class="status-banner win">승리했습니다! 🎉<button class="menu-return" id="exit-menu">메인 메뉴로</button></div>`
      : status === 'lose'
        ? `<div class="status-banner lose">패배했습니다...<button class="menu-return" id="exit-menu">메인 메뉴로</button></div>`
        : '';

  root.innerHTML = `
    ${banner}
    <div class="board">
      ${renderActor(enemy, 'enemy')}
      ${renderActor(player, 'player')}
    </div>
    <div class="log" id="log">
      ${log.map((entry) => `<div class="log-entry ${entry.actor}">[${entry.turn}턴] ${entry.message}</div>`).join('')}
    </div>
    <div class="hand" id="hand">
      ${player.hand
        .map(
          (card) => `
        <button class="card" data-card-id="${card.id}" ${card.cost > player.mana || status !== 'playing' ? 'disabled' : ''}>
          <div class="card-name"><span>${card.name}</span><span>${card.cost}</span></div>
          <div class="card-desc">${card.description}</div>
        </button>
      `
        )
        .join('')}
    </div>
    <div class="actions">
      <div class="stat-line">${status === 'playing' ? `${state.turn}턴 진행 중` : '전투 종료'}</div>
      <button class="end-turn" id="end-turn" ${status !== 'playing' ? 'disabled' : ''}>턴 종료</button>
    </div>
  `;

  const logEl = document.getElementById('log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  root.querySelectorAll<HTMLButtonElement>('[data-card-id]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onPlayCard(btn.dataset.cardId!));
  });

  document.getElementById('end-turn')?.addEventListener('click', handlers.onEndTurn);
  document.getElementById('exit-menu')?.addEventListener('click', handlers.onExitToMenu);
}
