import type { StatBonus } from './stat-bonus';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export interface GearDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  statBonus: StatBonus;
  description: string;
}

export interface GearInstance extends GearDef {
  instanceId: string;
}

export const GEAR_CATALOG: GearDef[] = [
  { id: 'iron-sword', name: '철검', slot: 'weapon', statBonus: { attackBonus: 1 }, description: '기본적인 철제 검. 공격력이 오른다.' },
  { id: 'war-axe', name: '전투 도끼', slot: 'weapon', statBonus: { attackBonus: 2 }, description: '묵직한 도끼. 공격력이 크게 오른다.' },
  { id: 'leather-armor', name: '가죽 갑옷', slot: 'armor', statBonus: { defenseBonus: 1, maxHp: 3 }, description: '가벼운 가죽 갑옷.' },
  { id: 'plate-armor', name: '판금 갑옷', slot: 'armor', statBonus: { defenseBonus: 2, maxHp: 5 }, description: '무거운 판금 갑옷.' },
  { id: 'mana-ring', name: '마나의 반지', slot: 'accessory', statBonus: { maxMana: 1 }, description: '최대 마나가 늘어나는 반지.' },
  { id: 'vitality-amulet', name: '활력의 목걸이', slot: 'accessory', statBonus: { maxHp: 4 }, description: '최대 체력이 늘어나는 목걸이.' },
];

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];

export function slotLabel(slot: EquipmentSlot): string {
  return slot === 'weapon' ? '무기' : slot === 'armor' ? '방어구' : '장신구';
}

let gearCounter = 0;

export function createGearInstance(def: GearDef): GearInstance {
  gearCounter += 1;
  return { ...def, instanceId: `gear-${def.id}-${Date.now()}-${gearCounter}` };
}

export function pickRandomGear(): GearDef {
  return GEAR_CATALOG[Math.floor(Math.random() * GEAR_CATALOG.length)];
}

const GEAR_DROP_CHANCE = 0.03;

export function rollGearDrop(): boolean {
  return Math.random() < GEAR_DROP_CHANCE;
}
