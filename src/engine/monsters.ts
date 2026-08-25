import type { Card } from './types';
import type { StatBonus } from './stat-bonus';
import type { ArmZone, Zone } from './dungeon';
import type { GearTemplate } from './gear';

export type EssenceStatBonus = StatBonus;

export interface EssenceTemplate {
  statBonus: EssenceStatBonus;
  skill: Omit<Card, 'id'>;
}

export interface MonsterDef {
  id: string;
  name: string;
  grade: number;
  maxHp: number;
  maxMana: number;
  zone: ArmZone;
  essence: EssenceTemplate;
  gearDrop: GearTemplate;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'slime',
    name: '슬라임',
    grade: 1,
    maxHp: 18,
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
    grade: 1,
    maxHp: 16,
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
    grade: 2,
    maxHp: 24,
    maxMana: 2,
    zone: 'south',
    essence: {
      statBonus: { attackBonus: 1 },
      skill: { name: '기습', cost: 1, effect: 'damage', value: 7, description: '적에게 7의 피해를 준다.' },
    },
    gearDrop: {
      name: '고블린의 녹슨 검',
      slot: 'weapon',
      statBonus: { attackBonus: 1 },
      description: '고블린이 사용하던 녹슨 검. 공격력이 오른다.',
    },
  },
  {
    id: 'rat-pack',
    name: '들쥐 떼',
    grade: 2,
    maxHp: 22,
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
    grade: 2,
    maxHp: 20,
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
    grade: 3,
    maxHp: 30,
    maxMana: 3,
    zone: 'east',
    essence: {
      statBonus: { attackBonus: 1 },
      skill: { name: '물어뜯기', cost: 2, effect: 'damage', value: 10, description: '적에게 10의 피해를 준다.' },
    },
    gearDrop: {
      name: '늑대 이빨 목걸이',
      slot: 'accessory',
      statBonus: { attackBonus: 1 },
      description: '늑대의 이빨로 만든 목걸이. 공격력이 오른다.',
    },
  },
  {
    id: 'kobold',
    name: '코볼트',
    grade: 3,
    maxHp: 28,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { defenseBonus: 1 },
      skill: { name: '창 찌르기', cost: 2, effect: 'damage', value: 9, description: '적에게 9의 피해를 준다.' },
    },
    gearDrop: {
      name: '코볼트 가죽 갑옷',
      slot: 'armor',
      statBonus: { defenseBonus: 1 },
      description: '코볼트가 입던 가죽 갑옷. 방어력이 오른다.',
    },
  },
  {
    id: 'bandit',
    name: '도적',
    grade: 4,
    maxHp: 36,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '은신 일격', cost: 1, effect: 'damage', value: 8, description: '은신 후 기습하여 8의 피해를 준다.' },
    },
    gearDrop: {
      name: '도적의 단검',
      slot: 'weapon',
      statBonus: { attackBonus: 1, maxMana: 1 },
      description: '도적이 쓰던 단검. 공격력과 마나가 오른다.',
    },
  },
  {
    id: 'skeleton-soldier',
    name: '해골 병사',
    grade: 4,
    maxHp: 34,
    maxMana: 3,
    zone: 'north',
    essence: {
      statBonus: { defenseBonus: 1, maxHp: 2 },
      skill: { name: '뼈 방패', cost: 1, effect: 'shield', value: 6, description: '방어막 6을 얻는다.' },
    },
    gearDrop: {
      name: '부서진 방패',
      slot: 'armor',
      statBonus: { defenseBonus: 2 },
      description: '해골 병사가 들던 방패. 방어력이 크게 오른다.',
    },
  },
  {
    id: 'orc-warrior',
    name: '오크 전사',
    grade: 5,
    maxHp: 42,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { maxHp: 4, attackBonus: 1 },
      skill: { name: '강타', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '오크의 전투 도끼',
      slot: 'weapon',
      statBonus: { attackBonus: 2 },
      description: '오크 전사의 도끼. 공격력이 크게 오른다.',
    },
  },
  {
    id: 'orc',
    name: '오크',
    grade: 6,
    maxHp: 50,
    maxMana: 3,
    zone: 'south',
    essence: {
      statBonus: { attackBonus: 1, maxHp: 3 },
      skill: { name: '거친 몽둥이질', cost: 2, effect: 'damage', value: 12, description: '적에게 12의 피해를 준다.' },
    },
    gearDrop: {
      name: '오크의 뼈 곤봉',
      slot: 'weapon',
      statBonus: { attackBonus: 1 },
      description: '오크가 휘두르던 뼈 곤봉. 공격력이 오른다.',
    },
  },
  {
    id: 'orc-grand-warrior',
    name: '오크 대전사',
    grade: 7,
    maxHp: 58,
    maxMana: 4,
    zone: 'south',
    essence: {
      statBonus: { attackBonus: 2 },
      skill: { name: '대지 가르기', cost: 2, effect: 'damage', value: 16, description: '적에게 16의 피해를 준다.' },
    },
    gearDrop: {
      name: '대전사의 갑주',
      slot: 'armor',
      statBonus: { defenseBonus: 2, maxHp: 3 },
      description: '오크 대전사가 입던 갑주. 방어력과 체력이 오른다.',
    },
  },
  {
    id: 'dark-knight',
    name: '암흑 기사',
    grade: 9,
    maxHp: 62,
    maxMana: 5,
    zone: 'south',
    essence: {
      statBonus: { attackBonus: 1, defenseBonus: 1 },
      skill: { name: '심판의 일격', cost: 2, effect: 'damage', value: 14, description: '적에게 14의 피해를 준다.' },
    },
    gearDrop: {
      name: '암흑기사의 대검',
      slot: 'weapon',
      statBonus: { attackBonus: 3, defenseBonus: 1 },
      description: '암흑 기사의 대검. 공격력이 매우 크게 오르고 방어력도 오른다.',
    },
  },
  {
    id: 'harpy',
    name: '하피',
    grade: 5,
    maxHp: 40,
    maxMana: 4,
    zone: 'east',
    essence: {
      statBonus: { maxMana: 1, attackBonus: 1 },
      skill: { name: '발톱 할퀴기', cost: 2, effect: 'damage', value: 12, description: '적에게 12의 피해를 준다.' },
    },
    gearDrop: {
      name: '하피의 깃털 망토',
      slot: 'armor',
      statBonus: { defenseBonus: 1, maxMana: 1 },
      description: '하피의 깃털로 짠 망토. 방어력과 마나가 오른다.',
    },
  },
  {
    id: 'dark-mage',
    name: '다크 메이지',
    grade: 6,
    maxHp: 40,
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
    grade: 6,
    maxHp: 38,
    maxMana: 5,
    zone: 'north',
    essence: {
      statBonus: { attackBonus: 2 },
      skill: { name: '저주', cost: 2, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
    },
    gearDrop: {
      name: '유령의 사슬',
      slot: 'accessory',
      statBonus: { attackBonus: 1, defenseBonus: 1 },
      description: '스펙터가 남긴 사슬. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'troll',
    name: '트롤',
    grade: 7,
    maxHp: 55,
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
    grade: 7,
    maxHp: 58,
    maxMana: 3,
    zone: 'east',
    essence: {
      statBonus: { maxHp: 8 },
      skill: { name: '짓밟기', cost: 2, effect: 'damage', value: 15, description: '적에게 15의 피해를 준다.' },
    },
    gearDrop: {
      name: '오우거의 몽둥이',
      slot: 'weapon',
      statBonus: { attackBonus: 3 },
      description: '오우거가 휘두르던 몽둥이. 공격력이 매우 크게 오른다.',
    },
  },
  {
    id: 'wyvern',
    name: '와이번',
    grade: 8,
    maxHp: 60,
    maxMana: 4,
    zone: 'west',
    essence: {
      statBonus: { defenseBonus: 2 },
      skill: { name: '급강하', cost: 2, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
    },
    gearDrop: {
      name: '와이번 가죽 장갑',
      slot: 'weapon',
      statBonus: { attackBonus: 1, defenseBonus: 1 },
      description: '와이번 가죽으로 만든 장갑. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'griffon',
    name: '그리폰',
    grade: 8,
    maxHp: 58,
    maxMana: 4,
    zone: 'east',
    essence: {
      statBonus: { attackBonus: 1, defenseBonus: 1 },
      skill: { name: '폭풍 발톱', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '그리폰 발톱 장갑',
      slot: 'weapon',
      statBonus: { attackBonus: 2, defenseBonus: 1 },
      description: '그리폰의 발톱으로 만든 장갑. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'lich',
    name: '리치',
    grade: 9,
    maxHp: 62,
    maxMana: 6,
    zone: 'north',
    essence: {
      statBonus: { maxMana: 2, attackBonus: 1 },
      skill: { name: '죽음의 손길', cost: 2, effect: 'damage', value: 14, description: '적에게 14의 피해를 준다.' },
    },
    gearDrop: {
      name: '리치의 지팡이',
      slot: 'weapon',
      statBonus: { attackBonus: 2, maxMana: 1 },
      description: '리치가 쓰던 지팡이. 공격력과 마나가 오른다.',
    },
  },
  {
    id: 'vampire-lord',
    name: '뱀파이어 로드',
    grade: 9,
    maxHp: 60,
    maxMana: 6,
    zone: 'north',
    essence: {
      statBonus: { maxHp: 5, maxMana: 1 },
      skill: { name: '흡혈 일격', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '흡혈의 망토',
      slot: 'armor',
      statBonus: { maxHp: 4, attackBonus: 1 },
      description: '뱀파이어 로드의 망토. 체력과 공격력이 오른다.',
    },
  },
  {
    id: 'dragon',
    name: '드래곤',
    grade: 10,
    maxHp: 80,
    maxMana: 6,
    zone: 'west',
    essence: {
      statBonus: { maxHp: 8, attackBonus: 2, defenseBonus: 2 },
      skill: { name: '브레스', cost: 3, effect: 'damage', value: 20, description: '적에게 20의 강력한 피해를 준다.' },
    },
    gearDrop: {
      name: '용의 비늘 갑옷',
      slot: 'armor',
      statBonus: { defenseBonus: 3, maxHp: 5 },
      description: '드래곤의 비늘로 만든 갑옷. 방어력과 체력이 매우 크게 오른다.',
    },
  },
  {
    id: 'hellfire-spirit',
    name: '지옥불 정령',
    grade: 10,
    maxHp: 85,
    maxMana: 6,
    zone: 'west',
    essence: {
      statBonus: { attackBonus: 3 },
      skill: { name: '화염 채찍', cost: 3, effect: 'damage', value: 22, description: '적에게 22의 화염 피해를 준다.' },
    },
    gearDrop: {
      name: '지옥불의 반지',
      slot: 'accessory',
      statBonus: { attackBonus: 2, maxMana: 1 },
      description: '지옥불 정령의 힘이 깃든 반지. 공격력과 마나가 오른다.',
    },
  },
];

export function expForGrade(grade: number): number {
  return grade;
}

const MAX_GRADE = 10;
const OCCASIONAL_GRADE_CHANCE = 0.2;

function rollTargetGrade(floor: number): number {
  const primaryGrades = [floor, Math.min(floor + 1, MAX_GRADE)];
  const occasionalGrade = Math.min(floor + 2, MAX_GRADE);
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
const MANA_STONE_DROP_CHANCE = 0.05;

export function rollEssenceDrop(): boolean {
  return Math.random() < ESSENCE_DROP_CHANCE;
}

export function rollManaStoneDrop(): boolean {
  return Math.random() < MANA_STONE_DROP_CHANCE;
}
