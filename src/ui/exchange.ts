import type { PlayerProfile } from '../engine/profile';
import { stoneValueForGrade, type MonsterGrade } from '../engine/monsters';

export interface ExchangeHandlers {
  onBack: () => void;
  onExchangeGrade: (grade: MonsterGrade) => void;
}

export function renderExchange(root: HTMLElement, profile: PlayerProfile, handlers: ExchangeHandlers) {
  const manaStoneEntries = Object.entries(profile.manaStones)
    .map(([grade, count]) => ({ grade: Number(grade) as MonsterGrade, count: count ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => a.grade - b.grade);

  const rowsHtml =
    manaStoneEntries.length > 0
      ? manaStoneEntries
          .map(
            (entry) => `
        <div class="item-row gear-row">
          <div>
            <div>${entry.grade}등급 마석 x${entry.count}</div>
            <div class="essence-stat">개당 ${stoneValueForGrade(entry.grade)} 스톤</div>
          </div>
          <button class="menu-start small" data-exchange-grade="${entry.grade}">전량 환전</button>
        </div>
      `
          )
          .join('')
      : '<div class="stat-line">환전할 마석이 없습니다.</div>';

  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">환전소</h2>
      <div class="stats-card">
        <div class="inventory-gold">
          <span>스톤</span>
          <strong>${profile.gold} 스톤</strong>
        </div>
      </div>
      <div class="stats-card">
        <div class="stat-line" style="font-weight:600">보유 마석</div>
        ${rowsHtml}
      </div>
      <p class="inventory-note">등급이 높을수록(숫자가 작을수록) 마석 1개당 더 많은 스톤으로 환전됩니다. 같은 등급의 마석은 가치가 모두 동일합니다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-exchange-grade]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onExchangeGrade(Number(btn.dataset.exchangeGrade) as MonsterGrade));
  });
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
