import type { PlayerProfile } from '../engine/profile';
import { hasPocketWatch } from '../engine/profile';
import { POCKET_WATCH_TEMPLATE, POCKET_WATCH_PRICE } from '../engine/gear';

export interface ShopHandlers {
  onBack: () => void;
  onBuyPocketWatch: () => void;
}

// 상점의 첫 판매 품목(designnotes.md 6-3번 회중시계). 다른 품목은 아직 없어
// 실제 상점 콘텐츠(README/로드맵 "상점" 항목)는 여전히 이후 작업 대상이다.
export function renderShop(root: HTMLElement, profile: PlayerProfile, handlers: ShopHandlers) {
  const owned = hasPocketWatch(profile);
  const canAfford = profile.gold >= POCKET_WATCH_PRICE;

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
        <button class="menu-start small" id="buy-pocket-watch" ${canAfford ? '' : 'disabled'}>구매</button>
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
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('buy-pocket-watch')?.addEventListener('click', handlers.onBuyPocketWatch);
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
