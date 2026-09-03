import type { Actor, GameState } from '../engine/types';
import type { ExpGrantResult } from '../engine/profile';
import type { EquippedEssence } from '../engine/essence';
import { statusEffectsText, hasBleed } from '../engine/status-effects';
import { damagedPartsText } from '../engine/body-parts';
import { BANDAGE } from '../engine/consumables';

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
  onUseBandage: () => void;
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
  const partsText = damagedPartsText(actor);
  return `
    <div class="actor ${role}">
      <div class="actor-name">${actor.name}${grade ? ` <span class="grade-tag">${grade}등급</span>` : ''}</div>
      <div class="bar"><div class="bar-fill" style="width:${hpPct}%"></div></div>
      <div class="stat-line">HP ${hpPct}% ${actor.shield > 0 ? `· 방어막 ${actor.shield}` : ''}</div>
      <div class="bar"><div class="bar-fill mana" style="width:${manaPct}%"></div></div>
      <div class="stat-line">마나 ${actor.mana}/${actor.maxMana}</div>
      ${statusText ? `<div class="stat-line status-effects">${statusText}</div>` : ''}
      ${partsText ? `<div class="stat-line damaged-parts">${partsText}</div>` : ''}
    </div>
  `;
}

// 버그 신고 등으로 전투 로그를 그대로 옮겨 붙일 수 있게 해주는 순수 텍스트
// 변환 — 화면에 보이는 "[N턴] 메시지" 줄 그대로에 층/상대 정보만 맨 앞에
// 덧붙인다. 클립보드 기록 자체는 이 함수를 호출하는 쪽(버튼 핸들러)의 몫.
function buildLogText(state: GameState, floorLabel: string): string {
  const header = `${floorLabel} — ${state.enemy.name} 상대 전투 로그`;
  const lines = state.log.map((entry) => `[${entry.turn}턴] ${entry.message}`);
  return [header, ...lines].join('\n');
}

// navigator.clipboard.writeText는 보안 컨텍스트(HTTPS)가 아니거나 권한이
// 없으면 실패할 수 있어, 화면 밖 textarea + execCommand('copy')로 한 번 더
// 시도한다 — 오래된 브라우저/권한 거부 상황에서도 최대한 동작하도록.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
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
  bandageCount: number,
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
    <div class="log-header">
      <span class="stat-line" style="font-weight:600">전투 로그</span>
      <button class="nav-link" id="copy-log-btn">로그 복사</button>
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
    ${
      bandageCount > 0
        ? `<button class="menu-return small" id="use-bandage" ${status === 'playing' && hasBleed(player) && isManual ? '' : 'disabled'}>${BANDAGE.name} 사용 (보유 ${bandageCount}개)</button>`
        : ''
    }
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
  document.getElementById('use-bandage')?.addEventListener('click', handlers.onUseBandage);
  document.getElementById('switch-to-auto')?.addEventListener('click', handlers.onSwitchToAuto);
  document.getElementById('switch-to-manual')?.addEventListener('click', handlers.onSwitchToManual);
  document.getElementById('continue-btn')?.addEventListener('click', handlers.onContinue);
  document.getElementById('acknowledge-death')?.addEventListener('click', handlers.onAcknowledgeDeath);
  document.getElementById('absorb-essence')?.addEventListener('click', handlers.onAbsorbEssence);
  document.getElementById('discard-essence')?.addEventListener('click', handlers.onDiscardEssence);
  document.getElementById('open-inventory')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('open-equipment')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('open-codex')?.addEventListener('click', handlers.onOpenEssence);

  const copyLogBtn = document.getElementById('copy-log-btn') as HTMLButtonElement | null;
  copyLogBtn?.addEventListener('click', async () => {
    const originalLabel = copyLogBtn.textContent;
    const ok = await copyToClipboard(buildLogText(state, floorLabel));
    // 리렌더 없이 버튼 자체의 텍스트만 잠깐 바꿔 피드백 — render()를 다시
    // 태우면 이 버튼을 포함한 화면 전체가 새로 그려지며 이 타이머가 가리키던
    // 엘리먼트가 통째로 교체되므로, 굳이 상태를 안 거치는 가장 단순한 방법.
    copyLogBtn.textContent = ok ? '복사됨!' : '복사 실패';
    setTimeout(() => {
      copyLogBtn.textContent = originalLabel;
    }, 1500);
  });
}
