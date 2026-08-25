import type { PlayerProfile } from '../engine/profile';
import { maxEssenceSlots } from '../engine/profile';
import { MONSTERS } from '../engine/monsters';
import { statBonusText } from '../engine/stat-bonus';

export interface EssenceScreenHandlers {
  onBack: () => void;
}

export function renderEssenceScreen(
  root: HTMLElement,
  profile: PlayerProfile,
  dungeonClockLabel: string | null,
  handlers: EssenceScreenHandlers
) {
  const clockHtml = dungeonClockLabel
    ? `<div class="stat-line dungeon-clock" style="text-align:center;font-weight:600">${dungeonClockLabel}</div>`
    : '';
  const slots = maxEssenceSlots(profile);

  const equippedHtml =
    Array.from({ length: slots }, (_, i) => {
      const essence = profile.essences[i];
      if (essence) {
        return `
          <div class="essence-slot filled">
            <div class="essence-slot-header">
              <span class="essence-name">${essence.monsterName}의 정수</span>
              <span class="grade-tag">Lv.${essence.monsterGrade}</span>
            </div>
            <div class="essence-stat">${statBonusText(essence.statBonus)}</div>
            <div class="essence-skill">스킬: ${essence.skill.name} (마나 ${essence.skill.cost}) — ${essence.skill.description}</div>
          </div>
        `;
      }
      return `<div class="essence-slot empty">빈 슬롯</div>`;
    }).join('') || '<div class="essence-slot empty">레벨을 올리면 슬롯이 열립니다.</div>';

  const codexHtml = MONSTERS.map((monster) => {
    const discovered = profile.discoveredEssenceIds.includes(monster.id);
    if (!discovered) {
      return `
        <div class="essence-slot empty">
          <div class="essence-slot-header"><span class="essence-name">???</span><span class="grade-tag">Lv.${monster.grade}</span></div>
          <div class="essence-stat">아직 발견하지 못한 정수입니다.</div>
        </div>
      `;
    }
    return `
      <div class="essence-slot filled">
        <div class="essence-slot-header"><span class="essence-name">${monster.name}의 정수</span><span class="grade-tag">Lv.${monster.grade}</span></div>
        <div class="essence-stat">${statBonusText(monster.essence.statBonus)}</div>
        <div class="essence-skill">스킬: ${monster.essence.skill.name} — ${monster.essence.skill.description}</div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">정수 창</h2>
      ${clockHtml}
      <p class="inventory-note">정수는 몬스터의 영혼을 흡수하는 개념이라 무기/방어구처럼 자유롭게 바꿔 낄 수 없습니다. 한 번 흡수하면 특수한 방법으로만 해제할 수 있습니다.</p>

      <div class="stat-line" style="font-weight:600">장착 중인 정수 (${profile.essences.length} / ${slots})</div>
      <div class="essence-slots">${equippedHtml}</div>

      <div class="stat-line" style="font-weight:600; margin-top:8px">정수 도감 (${profile.discoveredEssenceIds.length} / ${MONSTERS.length})</div>
      <div class="essence-slots">${codexHtml}</div>

      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
