import type { MonsterDef } from './monsters';
import { expForGrade } from './monsters';
import type { EquippedEssence } from './essence';
import type { EquipmentSlot, GearInstance } from './gear';
import type { EquippedGear } from './stats-calc';

const STORAGE_KEY = 'my-new-project:profile';
const EXP_PER_LEVEL = 20;

export type ManaStoneCounts = Partial<Record<number, number>>;

export interface PlayerProfile {
  level: number;
  exp: number;
  defeatedMonsterNames: string[];
  essences: EquippedEssence[];
  discoveredEssenceIds: string[];
  manaStones: ManaStoneCounts;
  inventoryGear: GearInstance[];
  equippedGear: EquippedGear;
  gold: number;
}

function defaultProfile(): PlayerProfile {
  return {
    level: 1,
    exp: 0,
    defeatedMonsterNames: [],
    essences: [],
    discoveredEssenceIds: [],
    manaStones: {},
    inventoryGear: [],
    equippedGear: {},
    gold: 0,
  };
}

export function maxEssenceSlots(profile: PlayerProfile): number {
  return profile.level;
}

export function hasOpenEssenceSlot(profile: PlayerProfile): boolean {
  return profile.essences.length < maxEssenceSlots(profile);
}

export function absorbEssence(profile: PlayerProfile, essence: EquippedEssence): PlayerProfile {
  if (!hasOpenEssenceSlot(profile)) return profile;
  return { ...profile, essences: [...profile.essences, essence] };
}

export function recordEssenceDiscovery(profile: PlayerProfile, monsterId: string): PlayerProfile {
  if (profile.discoveredEssenceIds.includes(monsterId)) return profile;
  return { ...profile, discoveredEssenceIds: [...profile.discoveredEssenceIds, monsterId] };
}

export function addManaStone(profile: PlayerProfile, grade: number): PlayerProfile {
  const current = profile.manaStones[grade] ?? 0;
  return { ...profile, manaStones: { ...profile.manaStones, [grade]: current + 1 } };
}

export function totalManaStones(profile: PlayerProfile): number {
  return Object.values(profile.manaStones).reduce<number>((sum, count) => sum + (count ?? 0), 0);
}

export function addGearToInventory(profile: PlayerProfile, gear: GearInstance): PlayerProfile {
  return { ...profile, inventoryGear: [...profile.inventoryGear, gear] };
}

export function equipGear(profile: PlayerProfile, instanceId: string): PlayerProfile {
  const gear = profile.inventoryGear.find((g) => g.instanceId === instanceId);
  if (!gear) return profile;

  const remainingInventory = profile.inventoryGear.filter((g) => g.instanceId !== instanceId);
  const previouslyEquipped = profile.equippedGear[gear.slot];

  return {
    ...profile,
    inventoryGear: previouslyEquipped ? [...remainingInventory, previouslyEquipped] : remainingInventory,
    equippedGear: { ...profile.equippedGear, [gear.slot]: gear },
  };
}

export function unequipGear(profile: PlayerProfile, slot: EquipmentSlot): PlayerProfile {
  const gear = profile.equippedGear[slot];
  if (!gear) return profile;

  const nextEquipped = { ...profile.equippedGear };
  delete nextEquipped[slot];

  return {
    ...profile,
    inventoryGear: [...profile.inventoryGear, gear],
    equippedGear: nextEquipped,
  };
}

export function expToNextLevel(level: number): number {
  return level * EXP_PER_LEVEL;
}

export interface AddExpResult {
  profile: PlayerProfile;
  leveledUp: boolean;
}

export function addExp(profile: PlayerProfile, amount: number): AddExpResult {
  let level = profile.level;
  let exp = profile.exp + amount;
  let leveledUp = false;

  while (exp >= expToNextLevel(level)) {
    exp -= expToNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  return { profile: { ...profile, level, exp }, leveledUp };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return {
      level: typeof parsed.level === 'number' ? parsed.level : 1,
      exp: typeof parsed.exp === 'number' ? parsed.exp : 0,
      defeatedMonsterNames: Array.isArray(parsed.defeatedMonsterNames) ? parsed.defeatedMonsterNames : [],
      essences: Array.isArray(parsed.essences) ? parsed.essences : [],
      discoveredEssenceIds: Array.isArray(parsed.discoveredEssenceIds) ? parsed.discoveredEssenceIds : [],
      manaStones: parsed.manaStones && typeof parsed.manaStones === 'object' ? parsed.manaStones : {},
      inventoryGear: Array.isArray(parsed.inventoryGear) ? parsed.inventoryGear : [],
      equippedGear: parsed.equippedGear && typeof parsed.equippedGear === 'object' ? parsed.equippedGear : {},
      gold: typeof parsed.gold === 'number' ? parsed.gold : 0,
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable (private mode, disabled) — progress just won't persist
  }
}

export interface ExpGrantResult {
  profile: PlayerProfile;
  gained: number;
  leveledUp: boolean;
  alreadyDefeated: boolean;
}

export function grantExpForKill(profile: PlayerProfile, monster: MonsterDef): ExpGrantResult {
  if (profile.defeatedMonsterNames.includes(monster.name)) {
    return { profile, gained: 0, leveledUp: false, alreadyDefeated: true };
  }

  const gained = expForGrade(monster.grade);
  const { profile: leveledProfile, leveledUp } = addExp(profile, gained);
  const next: PlayerProfile = {
    ...leveledProfile,
    defeatedMonsterNames: [...profile.defeatedMonsterNames, monster.name],
  };

  return { profile: next, gained, leveledUp, alreadyDefeated: false };
}
