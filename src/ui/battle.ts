import type { Actor, GameState } from '../engine/types';
import type { ExpGrantResult } from '../engine/profile';
import type { EquippedEssence } from '../engine/essence';
import { statusEffectsText } from '../engine/status-effects';

export type BattleMode = 'manual' | 'auto';

export interface BattleHandlers {
  onPlayCard: (cardId: string) => void;
  onEndTurn: () => void;
  onSwitchToAuto: () => void;
  onSwitchToManual: () => void;
  onContinue: () => void;
  onAcknowledgeDeath: () => void;
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

// Only used to pick the auto-battle button's wording/style ("안전" vs
// "위험할 수 있습니다") — never to gate it, since auto-battle is always
// available regardless of the estimated odds (see renderBattle's doc comment).
const SAFE_WIN_PROBABILITY = 0.99;

function renderActor(actor: Actor, role: 'player' | 'enemy', grade?: number): string {
  const hpPct = Math.round((actor.hp / actor.maxHp) * 100);
  const manaPct = Math.round((actor.mana / actor.maxMana) * 100);
  // statusEffects는 순수 데이터(status-effects.ts)이고, 이 한 줄 텍스트는
  // 지금 UI가 그걸 보여주는 방식일 뿐이다 — 나중에 아이콘으로 바뀌어도
  // 데이터 구조 자체는 그대로 재사용 가능.
  const statusText = statusEffectsText(actor.statusEffects);
  return `
    <div class="actor ${role}">
      <div class="actor-name">${actor.name}${grade ? ` <span class="grade-tag">${grade}등급</span>` : ''}</div>
      <div class="bar"><div class="bar-fill" style="width:${hpPct}%"></div></div>
      <div class="stat-line">HP ${actor.hp}/${actor.maxHp} ${actor.shield > 0 ? `· 방어막 ${actor.shield}` : ''}</div>
      <div class="bar"><div class="bar-fill mana" style="width:${manaPct}%"></div></div>
      <div class="stat-line">마나 ${actor.mana}/${actor.maxMana}</div>
      ${statusText ? `<div class="stat-line status-effects">${statusText}</div>` : ''}
    </div>
  `;
}

// battleMode/winProbability replace the old boolean skipEligible + one-shot
// "스킵" button: auto-battle is now a proper mode the player can switch into
// and back out of at any time mid-fight (not just once, not gated behind a
// win-probability threshold) — winProbability only changes the button's
// wording/style, computed once at battle start (see startZoneBattle in
// main.ts) so it still reflects the HP the battle actually began at.
export function renderBattle(
  root: HTMLElement,
  state: GameState,
  floorLabel: string,
  dungeonClockLabel: string | null,
  battleMode: BattleMode,
  winProbability: number | null,
  expResult: ExpGrantResult | null,
  essenceDrop: EssenceDropState,
  handlers: BattleHandlers
) {
  const { player, enemy, log, status } = state;
  const clockHtml = dungeonClockLabel
    ? `<div class="stat-line dungeon-clock" style="text-align:center;font-weight:600">${dungeonClockLabel}</div>`
    : '';

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

  const isManual = battleMode === 'manual';
  const cardsDisabled = !isManual || status !== 'playing';

  let modeControls = '';
  if (status === 'playing') {
    if (isManual) {
      const probabilityLabel = winProbability !== null ? `${Math.round(winProbability * 100)}%` : null;
      const safe = winProbability !== null && winProbability >= SAFE_WIN_PROBABILITY;
      const label = probabilityLabel
        ? safe
          ? `자동전투 시작 (예상 승률 ${probabilityLabel})`
          : `자동전투 시작 (예상 승률 ${probabilityLabel} — 위험할 수 있습니다)`
        : '자동전투 시작';
      modeControls = `<button class="menu-return small" id="switch-to-auto">${label}</button>`;
    } else {
      modeControls = `
        <div class="stat-line" style="text-align:center">자동전투 진행 중...</div>
        <button class="menu-return small" id="switch-to-manual">수동으로 전환</button>
      `;
    }
  }

  root.innerHTML = `
    <div class="battle-nav">
      <button class="nav-link" id="open-inventory">인벤토리</button>
      <button class="nav-link" id="open-equipment">장비창</button>
      <button class="nav-link" id="open-codex">정수창</button>
    </div>
    <div class="dungeon-floor">${floorLabel}</div>
    ${clockHtml}
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
        <button class="card" data-card-id="${card.id}" ${card.cost > player.mana || cardsDisabled ? 'disabled' : ''}>
          <div class="card-name"><span>${card.name}</span><span>${card.cost}</span></div>
          <div class="card-desc">${card.description}</div>
        </button>
      `
        )
        .join('')}
    </div>
    <div class="actions">
      <div class="stat-line">${status === 'playing' ? `${state.turn}턴 진행 중` : '전투 종료'}</div>
      <button class="end-turn" id="end-turn" ${cardsDisabled ? 'disabled' : ''}>턴 종료</button>
    </div>
    ${modeControls}
  `;

  const logEl = document.getElementById('log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  root.querySelectorAll<HTMLButtonElement>('[data-card-id]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onPlayCard(btn.dataset.cardId!));
  });

  document.getElementById('end-turn')?.addEventListener('click', handlers.onEndTurn);
  document.getElementById('switch-to-auto')?.addEventListener('click', handlers.onSwitchToAuto);
  document.getElementById('switch-to-manual')?.addEventListener('click', handlers.onSwitchToManual);
  document.getElementById('continue-btn')?.addEventListener('click', handlers.onContinue);
  document.getElementById('acknowledge-death')?.addEventListener('click', handlers.onAcknowledgeDeath);
  document.getElementById('absorb-essence')?.addEventListener('click', handlers.onAbsorbEssence);
  document.getElementById('discard-essence')?.addEventListener('click', handlers.onDiscardEssence);
  document.getElementById('open-inventory')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('open-equipment')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('open-codex')?.addEventListener('click', handlers.onOpenEssence);
}
