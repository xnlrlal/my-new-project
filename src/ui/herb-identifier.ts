import type { PlayerProfile } from '../engine/profile';
import { unidentifiedCommonHerbIds } from '../engine/profile';
import { HERB_UNIDENTIFIED_NAME, type HerbId, type HerbIdentifierFlavor } from '../engine/herbs';

export interface HerbIdentifierHandlers {
  onIdentify: (herbId: HerbId) => void;
  onLeave: () => void;
}

// 미궁 감정사 조우(designnotes.md 2-1번) — 전투 화면과 무관한 평화로운
// 상호작용 한 장짜리 화면. 보유 중인 미확인 일반 등급 약초를 전부 나열해
// 무료로 식별받을 수 있게 한다(상점 유료 감정은 ui/shop.ts 참고).
export function renderHerbIdentifier(root: HTMLElement, profile: PlayerProfile, flavor: HerbIdentifierFlavor, handlers: HerbIdentifierHandlers) {
  const herbIds = unidentifiedCommonHerbIds(profile);

  const herbRows =
    herbIds.length > 0
      ? herbIds
          .map((id) => {
            const count = profile.herbs[id] ?? 0;
            return `
        <div class="item-row gear-row">
          <div>
            <div>${HERB_UNIDENTIFIED_NAME} <span class="grade-tag">보유 ${count}개</span></div>
          </div>
          <button class="menu-start small" data-identify-herb="${id}">감정받기</button>
        </div>
      `;
          })
          .join('')
      : '<div class="stat-line">감정받을 미확인 약초가 없습니다.</div>';

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">${flavor.title}</h2>
      <p class="menu-subtitle">${flavor.introMessage}</p>
      <div class="stats-card">
        ${herbRows}
      </div>
      <button class="menu-return" id="leave-btn">그냥 지나간다</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-identify-herb]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onIdentify(btn.dataset.identifyHerb as HerbId));
  });
  document.getElementById('leave-btn')?.addEventListener('click', handlers.onLeave);
}
