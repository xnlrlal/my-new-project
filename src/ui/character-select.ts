import { RACES, type RaceDef } from '../engine/races';

export interface CharacterSelectHandlers {
  onSelect: (race: RaceDef) => void;
  onBack: () => void;
}

export function renderCharacterSelect(root: HTMLElement, handlers: CharacterSelectHandlers) {
  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">종족 선택</h2>
      <div class="race-list">
        ${RACES.map(
          (race) => `
          <button class="race-card" data-race-id="${race.id}">
            <div class="race-name">${race.name}</div>
            <div class="race-desc">${race.description}</div>
            <div class="race-stats">
              HP ${race.stats.maxHp} · 마나 ${race.stats.maxMana} · 공격 +${race.stats.attackBonus} · 방어 +${race.stats.defenseBonus}
            </div>
          </button>
        `
        ).join('')}
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-race-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const race = RACES.find((r) => r.id === btn.dataset.raceId);
      if (race) handlers.onSelect(race);
    });
  });

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
