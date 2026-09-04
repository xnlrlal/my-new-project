import type { PlayerProfile } from '../engine/profile';
import { essenceReleasePrice, ESSENCE_RELEASE_MAX_USES } from '../engine/profile';
import { statBonusText } from '../engine/stat-bonus';

export interface TempleHandlers {
  onBack: () => void;
  onReleaseEssence: (essenceId: string) => void;
}

// 신전 — 정수 해제(README 로드맵 1번)를 전담하는 마을 시설. 상점의 소모품
// 판매가 아니라 신전에서 스톤을 직접 지불하는 방식으로 확정됨(사용자
// 지시) — 캐릭터당 평생 3회까지만 가능하고, 회차마다(500만/1000만/2000만
// 스톤) 값이 크게 오른다(profile.ts의 essenceReleasePrice/releaseEssence).
export function renderTemple(root: HTMLElement, profile: PlayerProfile, handlers: TempleHandlers) {
  const price = essenceReleasePrice(profile);
  const usesLeft = ESSENCE_RELEASE_MAX_USES - profile.essenceReleaseCount;

  const statusHtml =
    price === null
      ? `<div class="stat-line">이 캐릭터는 정수 해제를 이미 3회 모두 사용했습니다.</div>`
      : `<div class="stat-line">다음 해제 비용: <strong>${price.toLocaleString()} 스톤</strong> (남은 횟수 ${usesLeft} / ${ESSENCE_RELEASE_MAX_USES})</div>`;

  const canAfford = price !== null && profile.gold >= price;

  const essenceRows =
    profile.essences.length > 0
      ? profile.essences
          .map(
            (essence) => `
        <div class="essence-slot filled">
          <div class="essence-slot-header">
            <span class="essence-name">${essence.monsterName}의 정수</span>
            <span class="grade-tag">${essence.monsterGrade}등급</span>
          </div>
          <div class="essence-stat">${statBonusText(essence.statBonus)}</div>
          <div class="essence-skill">스킬: ${essence.skill.name} — ${essence.skill.description}</div>
          <button class="menu-return small" data-release-essence="${essence.id}" ${canAfford ? '' : 'disabled'}>
            ${price === null ? '해제 불가' : `${price.toLocaleString()} 스톤으로 해제`}
          </button>
        </div>
      `
          )
          .join('')
      : '<div class="essence-slot empty">해제할 정수가 없습니다.</div>';

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">신전</h2>
      <div class="stats-card">
        <div class="inventory-gold">
          <span>스톤</span>
          <strong>${profile.gold} 스톤</strong>
        </div>
      </div>
      <p class="inventory-note">정수는 원칙적으로 영구 장착이지만, 신전에서 대가를 치르면 해제할 수 있습니다. 캐릭터당 평생 3회로 엄격히 제한되며, 회차마다 비용이 크게 오릅니다(500만 → 1,000만 → 2,000만 스톤). 해제된 정수는 보관되지 않고 사라집니다.</p>
      <div class="stats-card">
        ${statusHtml}
        <div class="essence-slots">${essenceRows}</div>
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-release-essence]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onReleaseEssence(btn.dataset.releaseEssence!));
  });
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
