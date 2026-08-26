import type { PlayerProfile } from '../engine/profile';
import { EQUIPMENT_SLOTS, slotLabel, type EquipmentSlot } from '../engine/gear';
import { statBonusText, statBonusMagnitude } from '../engine/stat-bonus';

export interface EquipmentHandlers {
  onBack: () => void;
  onEquip: (instanceId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
}

export function renderEquipment(
  root: HTMLElement,
  profile: PlayerProfile,
  dungeonClockLabel: string | null,
  handlers: EquipmentHandlers
) {
  const clockHtml = dungeonClockLabel
    ? `<div class="stat-line dungeon-clock" style="text-align:center;font-weight:600">${dungeonClockLabel}</div>`
    : '';
  const slotsHtml = EQUIPMENT_SLOTS.map((slot) => {
    const gear = profile.equippedGear[slot];
    if (gear) {
      return `
        <div class="essence-slot filled">
          <div class="essence-slot-header">
            <span class="essence-name">${slotLabel(slot)}: ${gear.name} <span class="grade-tag">Lv.${statBonusMagnitude(gear.statBonus)}</span>${
              gear.isPermanent !== true ? ' <span class="race-locked-badge">미궁 한정</span>' : ''
            }</span>
            <button class="menu-return small" data-unequip-slot="${slot}">해제</button>
          </div>
          <div class="essence-stat">${statBonusText(gear.statBonus)}</div>
          <div class="essence-skill">${gear.description}</div>
        </div>
      `;
    }
    return `
      <div class="essence-slot empty">
        <div class="essence-slot-header"><span>${slotLabel(slot)}</span><span>비어있음</span></div>
      </div>
    `;
  }).join('');

  const inventoryGearHtml =
    profile.inventoryGear.length > 0
      ? profile.inventoryGear
          .map(
            (gear) => `
        <div class="item-row gear-row">
          <div>
            <div>${gear.name} <span class="grade-tag">${slotLabel(gear.slot)}</span> <span class="grade-tag">Lv.${statBonusMagnitude(gear.statBonus)}</span>${
              gear.isPermanent !== true ? ' <span class="race-locked-badge">미궁 한정</span>' : ''
            }</div>
            <div class="essence-stat">${statBonusText(gear.statBonus)}</div>
          </div>
          <button class="menu-start small" data-equip-id="${gear.instanceId}">장착</button>
        </div>
      `
          )
          .join('')
      : '<div class="stat-line">보유 중인 미착용 장비가 없습니다.</div>';

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">장비창</h2>
      ${clockHtml}
      <div class="stat-line" style="text-align:center">무기 · 방어구 · 장신구는 자유롭게 갈아입을 수 있습니다.</div>
      <div class="essence-slots">${slotsHtml}</div>
      <div class="stats-card">
        <div class="stat-line" style="font-weight:600">보유 장비</div>
        ${inventoryGearHtml}
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-equip-id]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onEquip(btn.dataset.equipId!));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-unequip-slot]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onUnequip(btn.dataset.unequipSlot as EquipmentSlot));
  });
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
