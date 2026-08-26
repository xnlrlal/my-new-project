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
  // Whether this instance survives leaving the dungeon. A live state, not a
  // fixed record of origin: granted gear (character-creation rituals, ...)
  // starts true and monster drops start false, but a future skill/scroll is
  // expected to flip a drop's isPermanent to true in place — so always read
  // this field fresh (=== true) rather than inferring it from where the
  // item came from. stripDungeonOnlyGear() (profile.ts) is the reader;
  // called from forceReturnFromDungeon() (main.ts) whenever a dungeon visit
  // truly ends (not on floor transitions/backtracking, which keep drops).
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
    // Explicit false (not left undefined) — every monster drop starts
    // dungeon-only. A future skill/scroll can flip a specific instance's
    // isPermanent to true; stripDungeonOnlyGear() (profile.ts) always reads
    // this live, so that flip is all it takes to spare an item later.
    isPermanent: false,
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
