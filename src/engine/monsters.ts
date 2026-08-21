import type { Card } from './types';
import type { StatBonus } from './stat-bonus';
import type { ArmZone, Zone } from './dungeon';

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
