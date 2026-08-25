import type { RaceDef } from '../engine/races';
import type { PlayerProfile } from '../engine/profile';
import { expToNextLevel } from '../engine/profile';
import { computeTotalStats } from '../engine/stats-calc';
import { EQUIPMENT_SLOTS, slotLabel } from '../engine/gear';
import { formatGameDuration, gameDurationFromSeconds } from '../engine/village-clock';

export interface StatsHandlers {
  onBack: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenEssence: () => void;
}

export function renderStats(root: HTMLElement, race: RaceDef, profile: PlayerProfile, secondsUntilJudgment: number, handlers: StatsHandlers) {
  const expNeeded = expToNextLevel(profile.level);
  const expPct = Math.round((profile.exp / expNeeded) * 100);
  const totalStats = computeTotalStats(race.stats, profile.essences, profile.equippedGear);

  const skillsHtml =
    profile.essences.length > 0
      ? profile.essences
          .map((essence) => `<div class="stat-line">· ${essence.skill.name} (${essence.monsterName}의 정수, 마나 ${essence.skill.cost})</div>`)
          .join('')
      : '<div class="stat-line">장착한 정수 스킬이 없습니다.</div>';

  const gearHtml = EQUIPMENT_SLOTS.map((slot) => {
    const gear = profile.equippedGear[slot];
    return `<div class="stat-line">· ${slotLabel(slot)}: ${gear ? gear.name : '비어있음'}</div>`;
  }).join('');

  root.innerHTML = `
    <div class="stats-screen">
      <h2 class="screen-title">캐릭터 정보</h2>
      <div class="stats-card">
        <div class="stats-race">${race.name}</div>
        <div class="stats-level">레벨 ${profile.level}</div>
        <div class="bar"><div class="bar-fill exp" style="width:${expPct}%"></div></div>
        <div class="stat-line">경험치 ${profile.exp} / ${expNeeded}</div>
        <div class="stats-grid">
          <div class="stat-box"><span>최대 체력</span><strong>${totalStats.maxHp}</strong></div>
          <div class="stat-box"><span>최대 마나</span><strong>${totalStats.maxMana}</strong></div>
          <div class="stat-box"><span>공격력 보너스</span><strong>+${totalStats.attackBonus}</strong></div>
          <div class="stat-box"><span>방어력 보너스</span><strong>+${totalStats.defenseBonus}</strong></div>
        </div>
        <div class="stat-line">기본 종족 스텟에 장비·정수 보너스가 합산된 값입니다.</div>
        <div class="stat-line">처치한 몬스터 종류: ${profile.defeatedMonsterNames.length}</div>
        <div class="stats-skills">
          <div class="stat-line" style="font-weight:600">장착 장비</div>
          ${gearHtml}
        </div>
        <div class="stats-skills">
          <div class="stat-line" style="font-weight:600">장착 정수 스킬</div>
          ${skillsHtml}
        </div>
      </div>
      <div class="stat-line" style="text-align:center">미궁 입장까지 남은 시간: ${formatGameDuration(gameDurationFromSeconds(secondsUntilJudgment))}</div>
      <div class="nav-row">
        <button class="menu-return small" id="inventory-btn">인벤토리</button>
        <button class="menu-return small" id="equipment-btn">장비창</button>
        <button class="menu-return small" id="essence-btn">정수 창</button>
      </div>
      <button class="menu-return" id="back-btn">마을로 돌아가기</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
  document.getElementById('inventory-btn')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('equipment-btn')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('essence-btn')?.addEventListener('click', handlers.onOpenEssence);
}
