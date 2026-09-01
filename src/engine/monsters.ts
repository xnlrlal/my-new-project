import type { Card } from './types';
import type { StatBonus } from './stat-bonus';
import type { ArmZone, Zone } from './dungeon';
import type { GearTemplate } from './gear';

export type EssenceStatBonus = StatBonus;

export interface EssenceTemplate {
  statBonus: EssenceStatBonus;
  skill: Omit<Card, 'id'>;
}

// 1 = 최강(가장 강함), 9 = 최약(가장 약함) — 숫자가 작을수록 강한 등급제.
export type MonsterGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const STRONGEST_GRADE: MonsterGrade = 1;
const WEAKEST_GRADE: MonsterGrade = 9;

export interface MonsterDef {
  id: string;
  name: string;
  grade: MonsterGrade;
  // 체력 풀 통일(전 몬스터 100) 이후, 등급에 따른 강함 차이는 전부 아래 세
  // 필드로 표현된다 — combatStatsForGrade()가 이 셋을 등급 하나로부터
  // 도출한다. 명중/치명타 관련 세부스탯(accuracy/flexibility/perceptionJam/
  // obsession/poisonResist)은 여전히 미부여라 engine.ts에서 0 고정.
  strength: number; // 공격력 — engine.ts의 STRENGTH_ATTACK_COEF로 카드 피해 %가산
  dexterity: number; // 방어력 — 상시 피해 감소 %(engine.ts)
  willpower: number; // 자연재생력 — 라운드당 최대체력 회복 %(engine.ts)
  maxHp: number;
  maxMana: number;
  zone: ArmZone;
  essence: EssenceTemplate;
  gearDrop: GearTemplate;
}

// 체력을 전부 100으로 통일하면서, "몬스터가 세다"는 감각을 체력 풀 크기
// 대신 공격력/방어력/재생력 세 스탯의 등급별 선형 증가로 재구성한 1차
// 초안 — 정확한 체감은 플레이테스트로 다시 맞출 필요가 있다(설계 논의
// 참고). tier=0(9등급, 최약)~8(1등급, 최강)을 기준으로:
//   - 공격력(strength): tier당 +1 — engine.ts에서 카드 피해에 10%p씩 가산
//   - 방어력(dexterity): tier당 +2 — 상시 피해 감소 %p(최대 48%, 60% 캡 안쪽)
//   - 재생력(willpower): 5등급 이하(더 강한 절반)에만 부여 — 최상위 몬스터일수록
//     장기전에서 더 버티는 쪽을 재생력으로 표현
function combatStatsForGrade(grade: MonsterGrade): { strength: number; dexterity: number; willpower: number } {
  const tier = WEAKEST_GRADE - grade;
  return {
    strength: tier,
    dexterity: tier * 2,
    willpower: grade <= 5 ? (6 - grade) * 2 : 0,
  };
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'slime',
    name: '슬라임',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 2,
    zone: 'south',
    essence: {
      statBonus: { maxHp: 2 },
      skill: { name: '산성 방울', cost: 1, effect: 'damage', value: 4, description: '적에게 4의 산성 피해를 준다.' },
    },
    gearDrop: {
      name: '끈적한 젤리 장갑',
      slot: 'accessory',
      statBonus: { maxHp: 1 },
      description: '슬라임의 끈적한 점액이 굳어 만들어진 장갑. 체력이 소폭 오른다.',
    },
  },
  {
    id: 'bat',
    name: '박쥐',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 3,
    zone: 'north',
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '날카로운 이빨', cost: 1, effect: 'damage', value: 5, description: '적에게 5의 피해를 준다.' },
    },
    gearDrop: {
      name: '박쥐 날개 장식',
      slot: 'accessory',
      statBonus: { maxMana: 1 },
      description: '박쥐의 날개로 만든 장식. 마나가 오른다.',
    },
  },
  {
    id: 'goblin',
    name: '고블린',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 2,
    zone: 'south',
    essence: {
      statBonus: { strength: 1 },
      skill: { name: '기습', cost: 1, effect: 'damage', value: 7, description: '적에게 7의 피해를 준다.' },
    },
    gearDrop: {
      name: '고블린의 녹슨 검',
      slot: 'weapon',
      statBonus: { strength: 1 },
      description: '고블린이 사용하던 녹슨 검. 공격력이 오른다.',
    },
  },
  {
    id: 'rat-pack',
    name: '들쥐 떼',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 2,
    zone: 'east',
    essence: {
      statBonus: { maxHp: 3 },
      skill: { name: '물어뜯기 연타', cost: 1, effect: 'damage', value: 6, description: '적에게 6의 피해를 준다.' },
    },
    gearDrop: {
      name: '쥐가죽 조끼',
      slot: 'armor',
      statBonus: { maxHp: 2 },
      description: '들쥐 가죽으로 만든 조끼. 체력이 오른다.',
    },
  },
  {
    id: 'wisp',
    name: '도깨비불',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 3,
    zone: 'west',
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '불꽃 튀기기', cost: 1, effect: 'damage', value: 6, description: '적에게 6의 피해를 준다.' },
    },
    gearDrop: {
      name: '도깨비불 부적',
      slot: 'accessory',
      statBonus: { maxMana: 1 },
      description: '도깨비불의 기운이 깃든 부적. 마나가 오른다.',
    },
  },
  {
    id: 'wolf',
    name: '늑대',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    zone: 'east',
    essence: {
      statBonus: { strength: 1 },
      skill: { name: '물어뜯기', cost: 2, effect: 'damage', value: 10, description: '적에게 10의 피해를 준다.' },
    },
    gearDrop: {
      name: '늑대 이빨 목걸이',
      slot: 'accessory',
      statBonus: { strength: 1 },
      description: '늑대의 이빨로 만든 목걸이. 공격력이 오른다.',
    },
  },
  {
    id: 'kobold',
    name: '코볼트',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { dexterity: 1 },
      skill: { name: '창 찌르기', cost: 2, effect: 'damage', value: 9, description: '적에게 9의 피해를 준다.' },
    },
    gearDrop: {
      name: '코볼트 가죽 갑옷',
      slot: 'armor',
      statBonus: { dexterity: 1 },
      description: '코볼트가 입던 가죽 갑옷. 방어력이 오른다.',
    },
  },
  {
    id: 'bandit',
    name: '도적',
    grade: 7,
    ...combatStatsForGrade(7),
    maxHp: 100,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '은신 일격', cost: 1, effect: 'damage', value: 8, description: '은신 후 기습하여 8의 피해를 준다.' },
    },
    gearDrop: {
      name: '도적의 단검',
      slot: 'weapon',
      statBonus: { strength: 1, maxMana: 1 },
      description: '도적이 쓰던 단검. 공격력과 마나가 오른다.',
    },
  },
  {
    id: 'skeleton-soldier',
    name: '해골 병사',
    grade: 7,
    ...combatStatsForGrade(7),
    maxHp: 100,
    maxMana: 3,
    zone: 'north',
    essence: {
      statBonus: { dexterity: 1, maxHp: 2 },
      skill: { name: '뼈 방패', cost: 1, effect: 'shield', value: 6, description: '방어막 6을 얻는다.' },
    },
    gearDrop: {
      name: '부서진 방패',
      slot: 'armor',
      statBonus: { dexterity: 2 },
      description: '해골 병사가 들던 방패. 방어력이 크게 오른다.',
    },
  },
  {
    id: 'orc-warrior',
    name: '오크 전사',
    grade: 6,
    ...combatStatsForGrade(6),
    maxHp: 100,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { maxHp: 4, strength: 1 },
      skill: { name: '강타', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '오크의 전투 도끼',
      slot: 'weapon',
      statBonus: { strength: 2 },
      description: '오크 전사의 도끼. 공격력이 크게 오른다.',
    },
  },
  {
    id: 'orc',
    name: '오크',
    grade: 5,
    ...combatStatsForGrade(5),
    maxHp: 100,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { strength: 1, maxHp: 3 },
      skill: { name: '거친 몽둥이질', cost: 2, effect: 'damage', value: 12, description: '적에게 12의 피해를 준다.' },
    },
    gearDrop: {
      name: '오크의 뼈 곤봉',
      slot: 'weapon',
      statBonus: { strength: 1 },
      description: '오크가 휘두르던 뼈 곤봉. 공격력이 오른다.',
    },
  },
  {
    id: 'orc-grand-warrior',
    name: '오크 대전사',
    grade: 4,
    ...combatStatsForGrade(4),
    maxHp: 100,
    maxMana: 4,
    zone: 'south',
    essence: {
      statBonus: { strength: 2 },
      skill: { name: '대지 가르기', cost: 2, effect: 'damage', value: 16, description: '적에게 16의 피해를 준다.' },
    },
    gearDrop: {
      name: '대전사의 갑주',
      slot: 'armor',
      statBonus: { dexterity: 2, maxHp: 3 },
      description: '오크 대전사가 입던 갑주. 방어력과 체력이 오른다.',
    },
  },
  {
    id: 'dark-knight',
    name: '암흑 기사',
    grade: 2,
    ...combatStatsForGrade(2),
    maxHp: 100,
    maxMana: 5,
    zone: 'south',
    essence: {
      statBonus: { strength: 1, dexterity: 1 },
      skill: { name: '심판의 일격', cost: 2, effect: 'damage', value: 14, description: '적에게 14의 피해를 준다.' },
    },
    gearDrop: {
      name: '암흑기사의 대검',
      slot: 'weapon',
      statBonus: { strength: 3, dexterity: 1 },
      description: '암흑 기사의 대검. 공격력이 매우 크게 오르고 방어력도 오른다.',
    },
  },
  {
    id: 'harpy',
    name: '하피',
    grade: 6,
    ...combatStatsForGrade(6),
    maxHp: 100,
    maxMana: 4,
    zone: 'east',
    essence: {
      statBonus: { maxMana: 1, strength: 1 },
      skill: { name: '발톱 할퀴기', cost: 2, effect: 'damage', value: 12, description: '적에게 12의 피해를 준다.' },
    },
    gearDrop: {
      name: '하피의 깃털 망토',
      slot: 'armor',
      statBonus: { dexterity: 1, maxMana: 1 },
      description: '하피의 깃털로 짠 망토. 방어력과 마나가 오른다.',
    },
  },
  {
    id: 'dark-mage',
    name: '다크 메이지',
    grade: 5,
    ...combatStatsForGrade(5),
    maxHp: 100,
    maxMana: 5,
    zone: 'west',
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '화염구', cost: 2, effect: 'damage', value: 12, description: '적에게 화염 피해 12를 준다.' },
    },
    gearDrop: {
      name: '어둠의 로브',
      slot: 'armor',
      statBonus: { maxMana: 2 },
      description: '다크 메이지가 입던 로브. 마나가 크게 오른다.',
    },
  },
  {
    id: 'spectre',
    name: '스펙터',
    grade: 5,
    ...combatStatsForGrade(5),
    maxHp: 100,
    maxMana: 5,
    zone: 'north',
    essence: {
      statBonus: { strength: 2 },
      skill: { name: '저주', cost: 2, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
    },
    gearDrop: {
      name: '유령의 사슬',
      slot: 'accessory',
      statBonus: { strength: 1, dexterity: 1 },
      description: '스펙터가 남긴 사슬. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'troll',
    name: '트롤',
    grade: 4,
    ...combatStatsForGrade(4),
    maxHp: 100,
    maxMana: 3,
    zone: 'west',
    essence: {
      statBonus: { maxHp: 6 },
      skill: { name: '재생', cost: 1, effect: 'heal', value: 8, description: '체력을 8 회복한다.' },
    },
    gearDrop: {
      name: '트롤 가죽 갑옷',
      slot: 'armor',
      statBonus: { maxHp: 5 },
      description: '트롤의 두꺼운 가죽 갑옷. 체력이 크게 오른다.',
    },
  },
  {
    id: 'ogre',
    name: '오우거',
    grade: 4,
    ...combatStatsForGrade(4),
    maxHp: 100,
    maxMana: 3,
    zone: 'east',
    essence: {
      statBonus: { maxHp: 8 },
      skill: { name: '짓밟기', cost: 2, effect: 'damage', value: 15, description: '적에게 15의 피해를 준다.' },
    },
    gearDrop: {
      name: '오우거의 몽둥이',
      slot: 'weapon',
      statBonus: { strength: 3 },
      description: '오우거가 휘두르던 몽둥이. 공격력이 매우 크게 오른다.',
    },
  },
  {
    id: 'wyvern',
    name: '와이번',
    grade: 3,
    ...combatStatsForGrade(3),
    maxHp: 100,
    maxMana: 4,
    zone: 'west',
    essence: {
      statBonus: { dexterity: 2 },
      skill: { name: '급강하', cost: 2, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
    },
    gearDrop: {
      name: '와이번 가죽 장갑',
      slot: 'weapon',
      statBonus: { strength: 1, dexterity: 1 },
      description: '와이번 가죽으로 만든 장갑. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'griffon',
    name: '그리폰',
    grade: 3,
    ...combatStatsForGrade(3),
    maxHp: 100,
    maxMana: 4,
    zone: 'east',
    essence: {
      statBonus: { strength: 1, dexterity: 1 },
      skill: { name: '폭풍 발톱', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '그리폰 발톱 장갑',
      slot: 'weapon',
      statBonus: { strength: 2, dexterity: 1 },
      description: '그리폰의 발톱으로 만든 장갑. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'lich',
    name: '리치',
    grade: 2,
    ...combatStatsForGrade(2),
    maxHp: 100,
    maxMana: 6,
    zone: 'north',
    essence: {
      statBonus: { maxMana: 2, strength: 1 },
      skill: { name: '죽음의 손길', cost: 2, effect: 'damage', value: 14, description: '적에게 14의 피해를 준다.' },
    },
    gearDrop: {
      name: '리치의 지팡이',
      slot: 'weapon',
      statBonus: { strength: 2, maxMana: 1 },
      description: '리치가 쓰던 지팡이. 공격력과 마나가 오른다.',
    },
  },
  {
    id: 'vampire-lord',
    name: '뱀파이어 로드',
    grade: 2,
    ...combatStatsForGrade(2),
    maxHp: 100,
    maxMana: 6,
    zone: 'north',
    essence: {
      statBonus: { maxHp: 5, maxMana: 1 },
      skill: { name: '흡혈 일격', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '흡혈의 망토',
      slot: 'armor',
      statBonus: { maxHp: 4, strength: 1 },
      description: '뱀파이어 로드의 망토. 체력과 공격력이 오른다.',
    },
  },
  {
    id: 'dragon',
    name: '드래곤',
    grade: 1,
    ...combatStatsForGrade(1),
    maxHp: 100,
    maxMana: 6,
    zone: 'west',
    essence: {
      statBonus: { maxHp: 8, strength: 2, dexterity: 2 },
      skill: { name: '브레스', cost: 3, effect: 'damage', value: 20, description: '적에게 20의 강력한 피해를 준다.' },
    },
    gearDrop: {
      name: '용의 비늘 갑옷',
      slot: 'armor',
      statBonus: { dexterity: 3, maxHp: 5 },
      description: '드래곤의 비늘로 만든 갑옷. 방어력과 체력이 매우 크게 오른다.',
    },
  },
  {
    id: 'hellfire-spirit',
    name: '지옥불 정령',
    grade: 1,
    ...combatStatsForGrade(1),
    maxHp: 100,
    maxMana: 6,
    zone: 'west',
    essence: {
      statBonus: { strength: 3 },
      skill: { name: '화염 채찍', cost: 3, effect: 'damage', value: 22, description: '적에게 22의 화염 피해를 준다.' },
    },
    gearDrop: {
      name: '지옥불의 반지',
      slot: 'accessory',
      statBonus: { strength: 2, maxMana: 1 },
      description: '지옥불 정령의 힘이 깃든 반지. 공격력과 마나가 오른다.',
    },
  },
];

// Grade 1 (strongest) is worth the most exp, grade 9 (weakest) the least —
// the inverse of the raw grade number, since grade itself now runs the
// opposite direction (1 = strongest).
export function expForGrade(grade: number): number {
  return WEAKEST_GRADE + 1 - grade;
}

// 마석 환전소 등급별 환전율(마석 1개당 스톤). 9등급 = 20스톤을 기준선으로,
// 등급이 오를수록 배율이 매 단계 완만해지는 곡선(×4.00 → ×2.50 → ×2.00 →
// ×1.70 → ×1.47 → ×1.36 → ×1.235 → ×1.19)은 유지한 채 절대값만 재조정됨.
// 이전 설계(9등급=500)는 "5층까지 탐험하는 플레이어" 가정으로 시뮬레이션해
// 정했으나, 실제로는 1~2층까지만 구현되어 있어 저층 플레이어 기준으로
// 재검증함: rollTargetGrade(1)={9:40%,8:40%,7:20%}, rollTargetGrade(2)=
// {8:40%,7:40%,6:20%} 실측 분포와 현재 미궁 시계 스케일(하루 60초) 기준
// 연간 최대 기대 수입(~14.6만 스톤)은 연간 세금 70만/혼령각인 80만에는
// 크게 못 미침 — 두 지출 모두 아직 미구현인 3층 이상을 전제로 한 목표이므로,
// TAX_SYSTEM_ENABLED는 그 시점까지 계속 OFF로 유지하기로 함(별도 결정).
const STONE_VALUE_BY_GRADE: Record<MonsterGrade, number> = {
  9: 20,
  8: 80,
  7: 200,
  6: 400,
  5: 680,
  4: 1000,
  3: 1360,
  2: 1680,
  1: 2000,
};

export function stoneValueForGrade(grade: MonsterGrade): number {
  return STONE_VALUE_BY_GRADE[grade];
}

const OCCASIONAL_GRADE_CHANCE = 0.2;

function clampGrade(g: number): MonsterGrade {
  return Math.min(WEAKEST_GRADE, Math.max(STRONGEST_GRADE, g)) as MonsterGrade;
}

// Deeper floors should trend toward stronger (numerically lower) monsters —
// mirrors the pre-inversion "grade = floor, capped at the top" progression,
// just expressed toward STRONGEST_GRADE instead of away from grade 1.
function rollTargetGrade(floor: number): number {
  const primaryGrades = [clampGrade(WEAKEST_GRADE - floor + 1), clampGrade(WEAKEST_GRADE - floor)];
  const occasionalGrade = clampGrade(WEAKEST_GRADE - floor - 1);
  const useOccasional = Math.random() < OCCASIONAL_GRADE_CHANCE;
  return useOccasional ? occasionalGrade : primaryGrades[Math.floor(Math.random() * primaryGrades.length)];
}

export function getMonsterById(id: string): MonsterDef {
  const monster = MONSTERS.find((m) => m.id === id);
  if (!monster) throw new Error(`Unknown monster: ${id}`);
  return monster;
}

export function pickMonsterForFloorAndZone(floor: number, zone: Zone): MonsterDef {
  const targetGrade = rollTargetGrade(floor);
  const pool = zone === 'center' ? MONSTERS : MONSTERS.filter((m) => m.zone === zone);

  const exact = pool.filter((m) => m.grade === targetGrade);
  if (exact.length > 0) return exact[Math.floor(Math.random() * exact.length)];

  let closest: MonsterDef[] = [];
  let bestDiff = Infinity;
  for (const m of pool) {
    const diff = Math.abs(m.grade - targetGrade);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = [m];
    } else if (diff === bestDiff) {
      closest.push(m);
    }
  }
  return closest[Math.floor(Math.random() * closest.length)];
}

const ESSENCE_DROP_CHANCE = 0.001;
const MANA_STONE_DROP_CHANCE = 0.9;

export function rollEssenceDrop(): boolean {
  return Math.random() < ESSENCE_DROP_CHANCE;
}

export function rollManaStoneDrop(): boolean {
  return Math.random() < MANA_STONE_DROP_CHANCE;
}
