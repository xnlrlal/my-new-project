import type { PlayerProfile } from '../engine/profile';
import { maxEssenceSlots } from '../engine/profile';

export interface InventoryHandlers {
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

export function renderInventory(root: HTMLElement, profile: PlayerProfile, handlers: InventoryHandlers) {
  const slots = maxEssenceSlots(profile);

  const slotHtml = Array.from({ length: slots }, (_, i) => {
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
  }).join('');

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">인벤토리</h2>
      <div class="stat-line" style="text-align:center">장착 슬롯 ${profile.essences.length} / ${slots} (레벨업 시 1칸씩 증가)</div>
      <div class="essence-slots">
        ${slotHtml || '<div class="essence-slot empty">레벨을 올리면 슬롯이 열립니다.</div>'}
      </div>
      <p class="inventory-note">정수는 몬스터를 처치했을 때 드물게 드랍되며, 특수한 장치 없이는 인벤토리에 보관할 수 없어 그 자리에서 흡수하거나 버려야 합니다. 흡수한 정수는 특수한 방법으로만 해제할 수 있습니다.</p>
      <button class="menu-return" id="back-btn">메인 메뉴로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
