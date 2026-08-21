import type { Card } from './types';

export interface EssenceStatBonus {
  maxHp?: number;
  maxMana?: number;
  attackBonus?: number;
  defenseBonus?: number;
}

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
  essence: EssenceTemplate;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'slime',
    name: '슬라임',
    grade: 1,
    maxHp: 18,
    maxMana: 2,
    essence: {
      statBonus: { maxHp: 2 },
      skill: { name: '산성 방울', cost: 1, effect: 'damage', value: 4, description: '적에게 4의 산성 피해를 준다.' },
    },
  },
  {
    id: 'goblin',
    name: '고블린',
    grade: 2,
    maxHp: 24,
    maxMana: 2,
    essence: {
      statBonus: { attackBonus: 1 },
      skill: { name: '기습', cost: 1, effect: 'damage', value: 7, description: '적에게 7의 피해를 준다.' },
    },
  },
  {
    id: 'wolf',
    name: '늑대',
    grade: 3,
    maxHp: 30,
    maxMana: 3,
    essence: {
      statBonus: { attackBonus: 1 },
      skill: { name: '물어뜯기', cost: 2, effect: 'damage', value: 10, description: '적에게 10의 피해를 준다.' },
    },
  },
  {
    id: 'bandit',
    name: '도적',
    grade: 4,
    maxHp: 36,
    maxMana: 3,
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '은신 일격', cost: 1, effect: 'damage', value: 8, description: '은신 후 기습하여 8의 피해를 준다.' },
    },
  },
  {
    id: 'orc-warrior',
    name: '오크 전사',
    grade: 5,
    maxHp: 42,
    maxMana: 3,
    essence: {
      statBonus: { maxHp: 4, attackBonus: 1 },
      skill: { name: '강타', cost: 2, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
  },
  {
    id: 'dark-mage',
    name: '다크 메이지',
    grade: 6,
    maxHp: 40,
    maxMana: 5,
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '화염구', cost: 2, effect: 'damage', value: 12, description: '적에게 화염 피해 12를 준다.' },
    },
  },
  {
    id: 'troll',
    name: '트롤',
    grade: 7,
    maxHp: 55,
    maxMana: 3,
    essence: {
      statBonus: { maxHp: 6 },
      skill: { name: '재생', cost: 1, effect: 'heal', value: 8, description: '체력을 8 회복한다.' },
    },
  },
  {
    id: 'wyvern',
    name: '와이번',
    grade: 8,
    maxHp: 60,
    maxMana: 4,
    essence: {
      statBonus: { defenseBonus: 2 },
      skill: { name: '급강하', cost: 2, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
    },
  },
  {
    id: 'lich',
    name: '리치',
    grade: 9,
    maxHp: 62,
    maxMana: 6,
    essence: {
      statBonus: { maxMana: 2, attackBonus: 1 },
      skill: { name: '죽음의 손길', cost: 2, effect: 'damage', value: 14, description: '적에게 14의 피해를 준다.' },
    },
  },
  {
    id: 'dragon',
    name: '드래곤',
    grade: 10,
    maxHp: 80,
    maxMana: 6,
    essence: {
      statBonus: { maxHp: 8, attackBonus: 2, defenseBonus: 2 },
      skill: { name: '브레스', cost: 3, effect: 'damage', value: 20, description: '적에게 20의 강력한 피해를 준다.' },
    },
  },
];

export function expForGrade(grade: number): number {
  return grade;
}

export function pickRandomMonster(): MonsterDef {
  return MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
}

const ESSENCE_DROP_CHANCE = 0.001;
const MANA_STONE_DROP_CHANCE = 0.05;

export function rollEssenceDrop(): boolean {
  return Math.random() < ESSENCE_DROP_CHANCE;
}

export function rollManaStoneDrop(): boolean {
  return Math.random() < MANA_STONE_DROP_CHANCE;
}
