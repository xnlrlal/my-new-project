import type { PlayerProfile } from '../engine/profile';
import { maxEssenceSlots } from '../engine/profile';

export interface EquipmentHandlers {
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

export function renderEquipment(root: HTMLElement, profile: PlayerProfile, handlers: EquipmentHandlers) {
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
      <h2 class="screen-title">장착 장비창</h2>
      <div class="stat-line" style="text-align:center">장착 슬롯 ${profile.essences.length} / ${slots} (레벨업 시 1칸씩 증가)</div>
      <div class="essence-slots">
        ${slotHtml || '<div class="essence-slot empty">레벨을 올리면 슬롯이 열립니다.</div>'}
      </div>
      <p class="inventory-note">장착한 정수는 특수한 방법으로만 해제할 수 있습니다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
