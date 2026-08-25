import type { StatBonus } from './stat-bonus';

// 'legwear'/'footwear' exist only for the barbarian coming-of-age starter
// gear (천 하의/샌들) — every monster drop still only ever uses
// 'weapon'/'armor'/'accessory', so this is a purely additive extension.
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'legwear' | 'footwear';

export interface GearDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  statBonus: StatBonus;
  description: string;
  // Marks gear granted outright (character-creation rituals, ...) rather
  // than dropped by a monster. Not read anywhere yet — reserved for an
  // upcoming dungeon-drop decay system that needs to spare permanent gear.
  // Always true when set; omitted (undefined/falsy) for ordinary drops.
  isPermanent?: boolean;
}

export interface GearInstance extends GearDef {
  instanceId: string;
}

export interface GearTemplate {
  name: string;
  slot: EquipmentSlot;
  statBonus: StatBonus;
  description: string;
  isPermanent?: boolean;
}

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'legwear', 'footwear', 'accessory'];

export function slotLabel(slot: EquipmentSlot): string {
  switch (slot) {
    case 'weapon':
      return '무기';
    case 'armor':
      return '방어구';
    case 'legwear':
      return '하의';
    case 'footwear':
      return '신발';
    default:
      return '장신구';
  }
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

// Same shape as createGearFromMonster but for gear granted outright (not
// dropped) — e.g. the barbarian coming-of-age ritual's weapon/armor. `id`
// identifies the template (not tied to a monster), and template.isPermanent
// carries through so the instance is flagged too.
export function createGrantedGear(id: string, template: GearTemplate): GearInstance {
  gearCounter += 1;
  return {
    id,
    instanceId: `gear-${id}-${Date.now()}-${gearCounter}`,
    name: template.name,
    slot: template.slot,
    statBonus: template.statBonus,
    description: template.description,
    isPermanent: template.isPermanent,
  };
}

const GEAR_DROP_CHANCE = 0.03;

export function rollGearDrop(): boolean {
  return Math.random() < GEAR_DROP_CHANCE;
}
