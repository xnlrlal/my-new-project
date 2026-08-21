import type { PlayerProfile } from '../engine/profile';
import { slotLabel } from '../engine/gear';
import { statBonusText } from '../engine/stat-bonus';

export interface InventoryHandlers {
  onBack: () => void;
}

export function renderInventory(root: HTMLElement, profile: PlayerProfile, handlers: InventoryHandlers) {
  const gearHtml =
    profile.inventoryGear.length > 0
      ? profile.inventoryGear
          .map(
            (gear) => `
        <div class="item-row gear-row">
          <div>
            <div>${gear.name} <span class="grade-tag">${slotLabel(gear.slot)}</span></div>
            <div class="essence-stat">${statBonusText(gear.statBonus)}</div>
          </div>
        </div>
      `
          )
          .join('')
      : '<div class="stat-line">보유한 미착용 장비가 없습니다.</div>';

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">인벤토리</h2>
      <div class="stats-card">
        <div class="inventory-gold">
          <span>금화</span>
          <strong>${profile.gold} G</strong>
        </div>
        <div class="inventory-gold">
          <span>마석</span>
          <strong>${profile.manaStones}개</strong>
        </div>
      </div>
      <div class="stats-card">
        <div class="stat-line" style="font-weight:600">미착용 장비 (장비창에서 장착 가능)</div>
        ${gearHtml}
      </div>
      <p class="inventory-note">마석과 장비는 몬스터 처치 시 드물게 드랍되어 자동으로 인벤토리에 담깁니다. 금화는 드랍되지 않으며, 표시만 됩니다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
