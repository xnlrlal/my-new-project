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

export interface GearTemplate {
  name: string;
  slot: EquipmentSlot;
  statBonus: StatBonus;
  description: string;
}

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];

export function slotLabel(slot: EquipmentSlot): string {
  return slot === 'weapon' ? '무기' : slot === 'armor' ? '방어구' : '장신구';
}

let gearCounter = 0;

export function createGearFromMonster(monsterId: string, template: GearTemplate): GearInstance {
  gearCounter += 1;
  return {
    id: `${monsterId}-gear`,
    instanceId: `gear-${monsterId}-${Date.now()}-${gearCounter}`,
    name: template.name,
    slot: template.slot,
    statBonus: template.statBonus,
    description: template.description,
  };
}

const GEAR_DROP_CHANCE = 0.03;

export function rollGearDrop(): boolean {
  return Math.random() < GEAR_DROP_CHANCE;
}
