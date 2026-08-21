import type { RaceDef } from '../engine/races';
import type { PlayerProfile } from '../engine/profile';
import { expToNextLevel } from '../engine/profile';

export interface StatsHandlers {
  onStartBattle: () => void;
  onBack: () => void;
}

export function renderStats(root: HTMLElement, race: RaceDef, profile: PlayerProfile, handlers: StatsHandlers) {
  const expNeeded = expToNextLevel(profile.level);
  const expPct = Math.round((profile.exp / expNeeded) * 100);

  root.innerHTML = `
    <div class="stats-screen">
      <h2 class="screen-title">캐릭터 정보</h2>
      <div class="stats-card">
        <div class="stats-race">${race.name}</div>
        <div class="stats-level">레벨 ${profile.level}</div>
        <div class="bar"><div class="bar-fill exp" style="width:${expPct}%"></div></div>
        <div class="stat-line">경험치 ${profile.exp} / ${expNeeded}</div>
        <div class="stats-grid">
          <div class="stat-box"><span>최대 체력</span><strong>${race.stats.maxHp}</strong></div>
          <div class="stat-box"><span>최대 마나</span><strong>${race.stats.maxMana}</strong></div>
          <div class="stat-box"><span>공격력 보너스</span><strong>+${race.stats.attackBonus}</strong></div>
          <div class="stat-box"><span>방어력 보너스</span><strong>+${race.stats.defenseBonus}</strong></div>
        </div>
        <div class="stat-line">처치한 몬스터 종류: ${profile.defeatedMonsterNames.length}</div>
      </div>
      <button class="menu-start" id="battle-btn">전투 시작</button>
      <button class="menu-return" id="back-btn">종족 다시 선택</button>
    </div>
  `;

  document.getElementById('battle-btn')?.addEventListener('click', handlers.onStartBattle);
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
