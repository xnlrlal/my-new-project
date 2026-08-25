import { WEAPON_CHOICES } from '../engine/ritual';
import { statBonusText } from '../engine/stat-bonus';

export interface RitualHandlers {
  onSelectWeapon: (weaponId: string) => void;
}

// Forced, one-time screen right after character-select for barbarians —
// no back button, matching character-select's own "종족 선택은 되돌릴 수
// 없다" precedent (raceId is already committed by the time this renders).
export function renderRitual(root: HTMLElement, handlers: RitualHandlers) {
  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">바바리안 성지</h2>
      <p class="menu-subtitle">성인식을 치른다. 근접 무기를 하나 골라라 — 천 상의, 천 하의, 샌들은 함께 지급된다.</p>
      <div class="race-list">
        ${WEAPON_CHOICES.map(
          (choice) => `
          <button class="race-card" data-weapon-id="${choice.id}">
            <div class="race-name">${choice.template.name}</div>
            <div class="race-desc">${choice.template.description}</div>
            <div class="race-stats">${statBonusText(choice.template.statBonus)}</div>
          </button>
        `
        ).join('')}
      </div>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-weapon-id]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onSelectWeapon(btn.dataset.weaponId!));
  });
}
