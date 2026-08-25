import { RACES, SELECTABLE_RACE_IDS, getRace, type RaceDef } from '../engine/races';

export interface CharacterSelectHandlers {
  onSelect: (race: RaceDef) => void;
  onBack: () => void;
}

const SELECTABLE_RACES = SELECTABLE_RACE_IDS.map((id) => getRace(id));

export function renderCharacterSelect(root: HTMLElement, handlers: CharacterSelectHandlers) {
  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">종족 선택</h2>
      <div class="race-list">
        ${SELECTABLE_RACES.map((race) => {
          const locked = race.id !== 'barbarian';
          return `
          <button class="race-card" data-race-id="${race.id}" ${locked ? 'disabled' : ''}>
            <div class="race-name">${race.name}${locked ? ' <span class="race-locked-badge">잠김</span>' : ''}</div>
            <div class="race-desc">${race.description}</div>
            <div class="race-stats">
              HP ${race.stats.maxHp} · 마나 ${race.stats.maxMana} · 공격 +${race.stats.attackBonus} · 방어 +${race.stats.defenseBonus}
            </div>
          </button>
        `;
        }).join('')}
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-race-id]').forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      const race = RACES.find((r) => r.id === btn.dataset.raceId);
      if (race) handlers.onSelect(race);
    });
  });

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
