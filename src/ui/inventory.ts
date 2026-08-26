import type { PlayerProfile } from '../engine/profile';
import { totalManaStones } from '../engine/profile';
import { slotLabel } from '../engine/gear';
import { statBonusText } from '../engine/stat-bonus';

export interface InventoryHandlers {
  onBack: () => void;
}

export function renderInventory(
  root: HTMLElement,
  profile: PlayerProfile,
  dungeonClockLabel: string | null,
  handlers: InventoryHandlers
) {
  const clockHtml = dungeonClockLabel
    ? `<div class="stat-line dungeon-clock" style="text-align:center;font-weight:600">${dungeonClockLabel}</div>`
    : '';
  const manaStoneEntries = Object.entries(profile.manaStones)
    .map(([grade, count]) => ({ grade: Number(grade), count: count ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => a.grade - b.grade);

  const manaStoneHtml =
    manaStoneEntries.length > 0
      ? manaStoneEntries.map((entry) => `<div class="item-row"><span>${entry.grade}등급 마석</span><span>x${entry.count}</span></div>`).join('')
      : '<div class="stat-line">보유한 마석이 없습니다.</div>';

  const gearHtml =
    profile.inventoryGear.length > 0
      ? profile.inventoryGear
          .map(
            (gear) => `
        <div class="item-row gear-row">
          <div>
            <div>${gear.name} <span class="grade-tag">${slotLabel(gear.slot)}</span>${
              gear.isPermanent !== true ? ' <span class="race-locked-badge">미궁 한정</span>' : ''
            }</div>
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
      ${clockHtml}
      <div class="stats-card">
        <div class="inventory-gold">
          <span>스톤</span>
          <strong>${profile.gold} 스톤</strong>
        </div>
      </div>
      <div class="stats-card">
        <div class="stat-line" style="font-weight:600">마석 (총 ${totalManaStones(profile)}개)</div>
        ${manaStoneHtml}
      </div>
      <div class="stats-card">
        <div class="stat-line" style="font-weight:600">미착용 장비 (장비창에서 장착 가능)</div>
        ${gearHtml}
      </div>
      <p class="inventory-note">마석과 장비는 몬스터 처치 시 드물게 드랍되어 자동으로 인벤토리에 담깁니다. 스톤은 드랍되지 않으며, 표시만 됩니다. "미궁 한정" 장비는 미궁에서 마을로 귀환하는 순간 사라집니다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
