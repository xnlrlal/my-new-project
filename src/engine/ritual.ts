// Barbarian coming-of-age ritual ("바바리안 성인식"): a one-time, forced
// step right after character creation where the player picks one melee
// weapon and is granted a fixed set of starter armor. All items here are
// isPermanent (see gear.ts) — they're bestowed, not dropped.

import type { GearTemplate } from './gear';

export interface GrantedGearChoice {
  id: string;
  template: GearTemplate;
}

// All six occupy the single 'weapon' slot (택1) — "수호의 방패" is
// deliberately named apart from the unrelated monster-dropped "부서진
// 방패" (해골 병사 drop, armor slot) so the two are never confused in
// inventory/equipment listings.
export const WEAPON_CHOICES: GrantedGearChoice[] = [
  {
    id: 'ritual-spear',
    template: {
      name: '성지의 창',
      slot: 'weapon',
      statBonus: { strength: 2 },
      description: '바바리안 성지에서 전수받은 창. 사거리로 안정적으로 적을 견제한다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-sword',
    template: {
      name: '성지의 검',
      slot: 'weapon',
      statBonus: { strength: 1, dexterity: 1 },
      description: '바바리안 성지에서 전수받은 검. 공격과 방어의 균형이 잡혀 있다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-mace',
    template: {
      name: '성지의 둔기',
      slot: 'weapon',
      // maxHp 대신 손재주(=상시 피해 감소%, engine.ts) — "맷집"이라는 서술은
      // 체력을 불리는 게 아니라 얻어맞아도 덜 아픈 쪽에 더 가깝다는 판단.
      statBonus: { strength: 2, dexterity: 1 },
      description: '바바리안 성지에서 전수받은 묵직한 둔기. 강한 힘과 함께 맷집도 따라온다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-shield',
    template: {
      name: '수호의 방패',
      slot: 'weapon',
      statBonus: { dexterity: 2 },
      description: '바바리안 성지에서 전수받은 방패. 몬스터가 떨어뜨리는 낡은 "부서진 방패"와는 다른, 성지의 축복이 깃든 물건이다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-greatsword',
    template: {
      name: '성지의 대검',
      slot: 'weapon',
      statBonus: { strength: 3 },
      description: '바바리안 성지에서 전수받은 거대한 대검. 원래는 두 손으로 다뤄야 할 무게지만, 바바리안의 신체 능력은 이것마저 한 손으로 휘두르게 한다.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-bow',
    template: {
      name: '성지의 활',
      slot: 'weapon',
      statBonus: { accuracy: 3 },
      // 원거리 무기 컨셉이지만, 화살 소모 시스템은 아직 구현되지 않았다
      // (별도 항목) — 지금은 다른 5종과 똑같이 스탯 보너스만 있는 정상
      // 선택지다. 화살 시스템이 생기면 그때 연결한다.
      description: '바바리안 성지에서 전수받은 활. 화살이 떨어져도 시위를 당길 힘과 눈은 여전하다.',
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
      statBonus: { dexterity: 1 },
      description: '성인식에서 받는 기본 천 상의.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-cloth-bottom',
    template: {
      name: '성지의 천 하의',
      slot: 'legwear',
      // maxHp 대신 손재주(=상시 피해 감소%) — 기본 방어구 슬롯이라 방어 축과 자연스럽게 연결.
      statBonus: { dexterity: 1 },
      description: '성인식에서 받는 기본 천 하의.',
      isPermanent: true,
    },
  },
  {
    id: 'ritual-sandals',
    template: {
      name: '성지의 샌들',
      slot: 'footwear',
      // maxHp 대신 인내심(=자연재생력%) — 두 기본 방어구가 각각 방어/재생 한
      // 축씩 맡도록 나눔.
      statBonus: { willpower: 1 },
      description: '성인식에서 받는 기본 샌들.',
      isPermanent: true,
    },
  },
];

export function findWeaponChoice(id: string): GrantedGearChoice | undefined {
  return WEAPON_CHOICES.find((choice) => choice.id === id);
}
