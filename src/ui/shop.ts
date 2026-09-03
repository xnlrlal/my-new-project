import type { PlayerProfile } from '../engine/profile';
import { hasPocketWatch, consumableCount } from '../engine/profile';
import { POCKET_WATCH_TEMPLATE, POCKET_WATCH_PRICE } from '../engine/gear';
import { BANDAGE } from '../engine/consumables';

export interface ShopHandlers {
  onBack: () => void;
  onBuyPocketWatch: () => void;
  onBuyBandage: () => void;
}

// 상점 판매 품목: 회중시계(designnotes.md 6-3번, 최초 품목) + 붕대
// (6-1번, 소모품 카테고리의 첫 품목). 그 외 품목은 아직 없어 실제 상점
// 콘텐츠(README/로드맵 "상점" 항목)는 여전히 이후 작업 대상이다.
export function renderShop(root: HTMLElement, profile: PlayerProfile, handlers: ShopHandlers) {
  const owned = hasPocketWatch(profile);
  const canAffordWatch = profile.gold >= POCKET_WATCH_PRICE;

  const pocketWatchRow = owned
    ? `
      <div class="item-row gear-row">
        <div>
          <div>${POCKET_WATCH_TEMPLATE.name}</div>
          <div class="essence-stat">이미 보유 중입니다.</div>
        </div>
      </div>
    `
    : `
      <div class="item-row gear-row">
        <div>
          <div>${POCKET_WATCH_TEMPLATE.name} <span class="grade-tag">${POCKET_WATCH_PRICE} 스톤</span></div>
          <div class="essence-stat">${POCKET_WATCH_TEMPLATE.description}</div>
        </div>
        <button class="menu-start small" id="buy-pocket-watch" ${canAffordWatch ? '' : 'disabled'}>구매</button>
      </div>
    `;

  // 회중시계와 달리 보유 여부로 막지 않는다 — 소모품은 반복 구매가
  // 전제인 자원이라 늘 구매 가능(스톤이 부족할 때만 비활성화).
  const canAffordBandage = profile.gold >= BANDAGE.price;
  const bandageOwned = consumableCount(profile, 'bandage');
  const bandageRow = `
    <div class="item-row gear-row">
      <div>
        <div>${BANDAGE.name} <span class="grade-tag">${BANDAGE.price} 스톤</span>${bandageOwned > 0 ? ` <span class="grade-tag">보유 ${bandageOwned}개</span>` : ''}</div>
        <div class="essence-stat">${BANDAGE.description}</div>
      </div>
      <button class="menu-start small" id="buy-bandage" ${canAffordBandage ? '' : 'disabled'}>구매</button>
    </div>
  `;

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">상점</h2>
      <div class="stats-card">
        <div class="inventory-gold">
          <span>스톤</span>
          <strong>${profile.gold} 스톤</strong>
        </div>
      </div>
      <div class="stats-card">
        <div class="stat-line" style="font-weight:600">판매 품목</div>
        ${pocketWatchRow}
        ${bandageRow}
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('buy-pocket-watch')?.addEventListener('click', handlers.onBuyPocketWatch);
  document.getElementById('buy-bandage')?.addEventListener('click', handlers.onBuyBandage);
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
