// Barbarian coming-of-age ritual ("바바리안 성인식"): a one-time, forced
// step right after character creation where the player picks one melee
// weapon and is granted a fixed set of starter armor. All items here are
// isPermanent (see gear.ts) — they're bestowed, not dropped.

import type { GearTemplate } from './gear';

export interface GrantedGearChoice {
  id: string;
  template: GearTemplate;
}

// All four occupy the single 'weapon' slot (택1) — "수호의 방패" is
// deliberately named apart from the unrelated monster-dropped "부서진
// 방패" (해골 병사 drop, armor slot) so the two are never confused in
// inventory/equipment listings.
export const WEAPON_CHOICES: GrantedGearChoice[] = [
  {
    id: 'ritual-spear',
    template: {
      name: '성지의 창',
      slot: 'weapon',
      statBonus: { attackBonus: 2 },
      description: '바바리안 성지에서 전수받은 창. 사거리로 안정적으로 적을 견제한다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-sword',
    template: {
      name: '성지의 검',
      slot: 'weapon',
      statBonus: { attackBonus: 1, defenseBonus: 1 },
      description: '바바리안 성지에서 전수받은 검. 공격과 방어의 균형이 잡혀 있다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-mace',
    template: {
      name: '성지의 둔기',
      slot: 'weapon',
      statBonus: { attackBonus: 2, maxHp: 1 },
      description: '바바리안 성지에서 전수받은 묵직한 둔기. 강한 힘과 함께 맷집도 따라온다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-shield',
    template: {
      name: '수호의 방패',
      slot: 'weapon',
      statBonus: { defenseBonus: 2 },
      description: '바바리안 성지에서 전수받은 방패. 몬스터가 떨어뜨리는 낡은 "부서진 방패"와는 다른, 성지의 축복이 깃든 물건이다.',
      isPermanent: true,
    },
  },
];

// Not a choice — granted alongside whichever weapon is picked, all at once.
export const STARTER_ARMOR: GrantedGearChoice[] = [
  {
    id: 'ritual-cloth-top',
    template: {
      name: '성지의 천 상의',
      slot: 'armor',
      statBonus: { defenseBonus: 1 },
      description: '성인식에서 받는 기본 천 상의.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-cloth-bottom',
    template: {
      name: '성지의 천 하의',
      slot: 'legwear',
      statBonus: { maxHp: 1 },
      description: '성인식에서 받는 기본 천 하의.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-sandals',
    template: {
      name: '성지의 샌들',
      slot: 'footwear',
      statBonus: { maxHp: 1 },
      description: '성인식에서 받는 기본 샌들.',
      isPermanent: true,
    },
  },
];

export function findWeaponChoice(id: string): GrantedGearChoice | undefined {
  return WEAPON_CHOICES.find((choice) => choice.id === id);
}
