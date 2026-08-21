import type { PlayerProfile } from '../engine/profile';
import { MONSTERS } from '../engine/monsters';

export interface EssenceCodexHandlers {
  onBack: () => void;
}

function statBonusText(statBonus: { maxHp?: number; maxMana?: number; attackBonus?: number; defenseBonus?: number }): string {
  const parts: string[] = [];
  if (statBonus.maxHp) parts.push(`체력 +${statBonus.maxHp}`);
  if (statBonus.maxMana) parts.push(`마나 +${statBonus.maxMana}`);
  if (statBonus.attackBonus) parts.push(`공격 +${statBonus.attackBonus}`);
  if (statBonus.defenseBonus) parts.push(`방어 +${statBonus.defenseBonus}`);
  return parts.join(' · ') || '보너스 없음';
}

export function renderEssenceCodex(root: HTMLElement, profile: PlayerProfile, handlers: EssenceCodexHandlers) {
  const entriesHtml = MONSTERS.map((monster) => {
    const discovered = profile.discoveredEssenceIds.includes(monster.id);
    const equippedCount = profile.essences.filter((e) => e.monsterId === monster.id).length;

    if (!discovered) {
      return `
        <div class="essence-slot empty codex-entry">
          <div class="essence-slot-header">
            <span class="essence-name">???</span>
            <span class="grade-tag">Lv.${monster.grade}</span>
          </div>
          <div class="essence-stat">아직 발견하지 못한 정수입니다.</div>
        </div>
      `;
    }

    return `
      <div class="essence-slot filled codex-entry">
        <div class="essence-slot-header">
          <span class="essence-name">${monster.name}의 정수</span>
          <span class="grade-tag">Lv.${monster.grade}</span>
        </div>
        <div class="essence-stat">${statBonusText(monster.essence.statBonus)}</div>
        <div class="essence-skill">스킬: ${monster.essence.skill.name} — ${monster.essence.skill.description}</div>
        ${equippedCount > 0 ? `<div class="essence-stat">현재 ${equippedCount}개 장착 중</div>` : ''}
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">정수 창</h2>
      <div class="stat-line" style="text-align:center">발견한 정수 ${profile.discoveredEssenceIds.length} / ${MONSTERS.length}</div>
      <div class="essence-slots">${entriesHtml}</div>
      <p class="inventory-note">정수가 드랍되면 흡수하지 않고 버려도 도감에는 기록됩니다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
