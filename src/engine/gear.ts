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
  // Marks the 회중시계(pocket watch) — designnotes.md 6-3번/우선순위 1번.
  // profile.ts's isClockVisible() checks equipped gear for this flag instead
  // of the old always-on clockItemEquipped placeholder, so equipping this
  // item (any slot) is what actually turns the in-dungeon clock display on.
  isClockItem?: boolean;
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
  isClockItem?: boolean;
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

// 회중시계 — a generic dungeon find, not tied to any one monster (unlike
// gearDrop templates in monsters.ts), so it's defined here instead. No
// combat statBonus: its only effect is isClockItem gating the in-dungeon
// clock display (see isClockItem's doc comment above). isPermanent: true so
// finding it isn't wasted by the next forced dungeon return — see
// stripDungeonOnlyGear (profile.ts).
export const POCKET_WATCH_TEMPLATE: GearTemplate = {
  name: '회중시계',
  slot: 'accessory',
  statBonus: {},
  description: '문자판에 0시부터 23시까지 새겨진 낡은 회중시계. 장착하면 미궁 안에서도 지금이 며칠째 몇 시인지 확인할 수 있다.',
  isPermanent: true,
  isClockItem: true,
};

export function createPocketWatch(): GearInstance {
  return createGrantedGear('pocket-watch', POCKET_WATCH_TEMPLATE);
}

const POCKET_WATCH_DROP_CHANCE = 0.02;

export function rollPocketWatchDrop(): boolean {
  return Math.random() < POCKET_WATCH_DROP_CHANCE;
}
