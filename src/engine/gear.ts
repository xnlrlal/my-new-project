import type { StatBonus } from './stat-bonus';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'legwear' | 'footwear';

export interface GearDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  statBonus: StatBonus;
  description: string;
  // Whether this instance survives leaving the dungeon. Granted gear
  // (character-creation rituals, shop purchases) is permanent; any future
  // dungeon-only loot (넘버링 아이템/부속물 등, designnotes.md 3-7번) is
  // expected to start false and read this field live rather than inferring
  // it from where the item came from. stripDungeonOnlyGear() (profile.ts)
  // is the reader; called from forceReturnFromDungeon() (main.ts) whenever
  // a dungeon visit truly ends (not on floor transitions/backtracking).
  isPermanent?: boolean;
  // Marks the 회중시계(pocket watch) — designnotes.md 6-3번/우선순위 1번.
  // profile.ts's isClockVisible() checks equipped gear for this flag instead
  // of the old always-on clockItemEquipped placeholder, so equipping this
  // item (any slot) is what actually turns the in-dungeon clock display on.
  isClockItem?: boolean;
  // 장비 내구도(designnotes.md 3-5번) — undefined면 "내구도 개념 없음"(무한,
  // 절대 파손되지 않음)이라는 뜻이다. 지금은 성인식 방어구(armor/footwear
  // 슬롯, ritual.ts)에만 부여되어 있다 — profile.ts의
  // damageEquippedGearForBodyPart()가 이 필드가 있는 장비만 대상으로
  // 삼는다.
  maxDurability?: number;
}

export interface GearInstance extends GearDef {
  instanceId: string;
  // 현재 내구도 — undefined면 maxDurability(정의돼 있다면) 그대로 풀피
  // 취급한다. maxDurability 자체가 없는 장비에서는 의미 없는 필드.
  durability?: number;
}

export interface GearTemplate {
  name: string;
  slot: EquipmentSlot;
  statBonus: StatBonus;
  description: string;
  isPermanent?: boolean;
  isClockItem?: boolean;
  maxDurability?: number;
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

// Gear granted outright (not dropped by a kill) — e.g. the barbarian
// coming-of-age ritual's weapon/armor, or the pocket watch bought in the
// shop. `id` identifies the template, and template.isPermanent carries
// through so the instance is flagged too.
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
    isClockItem: template.isClockItem,
    maxDurability: template.maxDurability,
    durability: template.maxDurability,
  };
}

// 순수 표시용 포맷터 — maxDurability가 없는(내구도 개념 없는) 장비는 빈
// 문자열을 반환해 equipment.ts가 아예 줄을 안 그리게 한다.
export function durabilityText(gear: GearInstance): string {
  if (gear.maxDurability === undefined) return '';
  const current = gear.durability ?? gear.maxDurability;
  return `내구도 ${current}/${gear.maxDurability}`;
}

// 회중시계 — designnotes.md 6-3번: 마을 상점(ui/shop.ts)에서 스톤으로 구매하는
// 품목이다. No combat statBonus: its only effect is isClockItem gating the in-dungeon
// clock display (see isClockItem's doc comment above). isPermanent: true so
// buying it isn't wasted by the next forced dungeon return — see
// stripDungeonOnlyGear (profile.ts).
export const POCKET_WATCH_TEMPLATE: GearTemplate = {
  name: '회중시계',
  slot: 'accessory',
  statBonus: {},
  description: '문자판에 0시부터 23시까지 새겨진 낡은 회중시계. 장착하면 미궁 안에서도 지금이 며칠째 몇 시인지 확인할 수 있다.',
  isPermanent: true,
  isClockItem: true,
};

// 상점 판매가 — 마스터 설정에 구체적인 가격이 없어 잡은 1차 초안, 요청하면
// 언제든 조정 가능.
export const POCKET_WATCH_PRICE = 300;

export function createPocketWatch(): GearInstance {
  return createGrantedGear('pocket-watch', POCKET_WATCH_TEMPLATE);
}
