import type { PlayerProfile } from '../engine/profile';

export interface InventoryHandlers {
  onBack: () => void;
}

export function renderInventory(root: HTMLElement, profile: PlayerProfile, handlers: InventoryHandlers) {
  const itemsHtml =
    profile.items.length > 0
      ? profile.items.map((item) => `<div class="item-row"><span>${item.name}</span><span>x${item.count}</span></div>`).join('')
      : '<div class="stat-line">보유한 아이템이 없습니다.</div>';

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
        <div class="stat-line" style="font-weight:600">아이템</div>
        ${itemsHtml}
      </div>
      <p class="inventory-note">마석과 아이템은 몬스터 처치 시 드물게 드랍되어 자동으로 인벤토리에 담깁니다. 금화는 드랍되지 않으며, 표시만 됩니다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
