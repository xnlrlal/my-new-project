import type { Actor, GameState } from '../engine/types';
import type { ExpGrantResult } from '../engine/profile';
import type { EquippedEssence } from '../engine/essence';

export interface BattleHandlers {
  onPlayCard: (cardId: string) => void;
  onEndTurn: () => void;
  onSkip: () => void;
  onContinue: () => void;
  onAcknowledgeDeath: () => void;
  onExitToMenu: () => void;
  onAbsorbEssence: () => void;
  onDiscardEssence: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenEssence: () => void;
}

export interface EssenceDropState {
  pending: EquippedEssence | null;
  outcome: string | null;
}

function renderActor(actor: Actor, role: 'player' | 'enemy', grade?: number): string {
  const hpPct = Math.round((actor.hp / actor.maxHp) * 100);
  const manaPct = Math.round((actor.mana / actor.maxMana) * 100);
  return `
    <div class="actor ${role}">
      <div class="actor-name">${actor.name}${grade ? ` <span class="grade-tag">Lv.${grade}</span>` : ''}</div>
      <div class="bar"><div class="bar-fill" style="width:${hpPct}%"></div></div>
      <div class="stat-line">HP ${actor.hp}/${actor.maxHp} ${actor.shield > 0 ? `· 방어막 ${actor.shield}` : ''}</div>
      <div class="bar"><div class="bar-fill mana" style="width:${manaPct}%"></div></div>
      <div class="stat-line">마나 ${actor.mana}/${actor.maxMana}</div>
    </div>
  `;
}

export function renderBattle(
  root: HTMLElement,
  state: GameState,
  floorLabel: string,
  skipEligible: boolean,
  expResult: ExpGrantResult | null,
  essenceDrop: EssenceDropState,
  handlers: BattleHandlers
) {
  const { player, enemy, log, status } = state;

  const expMessage = expResult
    ? expResult.alreadyDefeated
      ? '이미 처치한 적입니다 (경험치 없음)'
      : `경험치 +${expResult.gained} 획득!${expResult.leveledUp ? ' 레벨 업!' : ''}`
    : '';

  const essenceHtml = essenceDrop.pending
    ? `
      <div class="essence-drop">
        <div class="essence-drop-title">${essenceDrop.pending.monsterName}의 정수를 발견했습니다!</div>
        <div class="essence-drop-detail">${essenceDrop.pending.skill.name} 스킬과 스텟 보너스가 담겨 있습니다.</div>
        <div class="essence-drop-actions">
          <button class="menu-start" id="absorb-essence">흡수한다</button>
          <button class="menu-return" id="discard-essence">버린다</button>
        </div>
      </div>
    `
    : essenceDrop.outcome
      ? `<div class="exp-line">${essenceDrop.outcome}</div>`
      : '';

  const winActions = essenceDrop.pending
    ? ''
    : `
      <div class="banner-actions">
        <button class="menu-start" id="continue-btn">탐험 계속하기</button>
        <button class="menu-return small" id="exit-menu">메인 메뉴로</button>
      </div>
    `;

  const banner =
    status === 'win'
      ? `<div class="status-banner win">승리했습니다! 🎉<div class="exp-line">${expMessage}</div>${essenceHtml}${winActions}</div>`
      : status === 'lose'
        ? `<div class="status-banner lose">사망했습니다...
            <div class="exp-line">모든 진행 상황이 초기화됩니다.</div>
            <div class="banner-actions">
              <button class="menu-start" id="acknowledge-death">확인</button>
            </div>
          </div>`
        : '';

  const skipButton =
    skipEligible && status === 'playing'
      ? `<button class="menu-return small" id="skip-btn">전투 스킵 (예상 승률 99%+)</button>`
      : '';

  root.innerHTML = `
    <div class="battle-nav">
      <button class="nav-link" id="open-inventory">인벤토리</button>
      <button class="nav-link" id="open-equipment">장비창</button>
      <button class="nav-link" id="open-codex">정수창</button>
    </div>
    <div class="dungeon-floor">${floorLabel}</div>
    ${banner}
    <div class="board">
      ${renderActor(enemy, 'enemy', state.enemyGrade)}
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
    ${skipButton}
  `;

  const logEl = document.getElementById('log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  root.querySelectorAll<HTMLButtonElement>('[data-card-id]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onPlayCard(btn.dataset.cardId!));
  });

  document.getElementById('end-turn')?.addEventListener('click', handlers.onEndTurn);
  document.getElementById('skip-btn')?.addEventListener('click', handlers.onSkip);
  document.getElementById('continue-btn')?.addEventListener('click', handlers.onContinue);
  document.getElementById('acknowledge-death')?.addEventListener('click', handlers.onAcknowledgeDeath);
  document.getElementById('exit-menu')?.addEventListener('click', handlers.onExitToMenu);
  document.getElementById('absorb-essence')?.addEventListener('click', handlers.onAbsorbEssence);
  document.getElementById('discard-essence')?.addEventListener('click', handlers.onDiscardEssence);
  document.getElementById('open-inventory')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('open-equipment')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('open-codex')?.addEventListener('click', handlers.onOpenEssence);
}
