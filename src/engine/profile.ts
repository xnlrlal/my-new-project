import type { MonsterDef, MonsterGrade } from './monsters';
import { expForGrade, stoneValueForGrade } from './monsters';
import type { EquippedEssence } from './essence';
import type { EquipmentSlot, GearInstance } from './gear';
import type { EquippedGear } from './stats-calc';
import type { RaceId } from './races';
import { sanitizeResumeSession, type ResumeSession } from './session';
import type { ClockSpeed } from './village-clock';

const STORAGE_KEY = 'my-new-project:profile';
const EXP_PER_LEVEL = 20;

export type ManaStoneCounts = Partial<Record<number, number>>;

export interface PlayerProfile {
  raceId: RaceId | null;
  session: ResumeSession | null;
  villageElapsedSeconds: number;
  clockSpeed: ClockSpeed;
  lastAnsweredCycle: number | null;
  pendingJudgmentCycle: number | null;
  pendingJudgmentRemainingSeconds: number | null;
  level: number;
  exp: number;
  defeatedMonsterNames: string[];
  essences: EquippedEssence[];
  discoveredEssenceIds: string[];
  manaStones: ManaStoneCounts;
  inventoryGear: GearInstance[];
  equippedGear: EquippedGear;
  gold: number;
  // Temporary stand-in for a future "시계" equipment item gating the
  // in-dungeon clock display (see isClockVisible below). Defaults to true
  // (clock on) since there's no equippable item to actually equip/unequip
  // yet — once that item exists, this field goes away and isClockVisible()
  // reads the item's equipped state instead; no other call site changes.
  clockItemEquipped: boolean;
  // Gates the 환전소(exchange) village facility. Set true the first time
  // forceReturnFromDungeon() fires in main.ts — "다녀옴" for this facility
  // is defined as that first forced return, since that's currently the only
  // way back to the village from an active dungeon run short of death.
  // Defaults false, and resetProfile() naturally re-defaults it on death
  // since it just returns defaultProfile() — no special permadeath handling
  // needed here.
  hasVisitedDungeonExchange: boolean;
  // Last tax-year boundary (crossedTaxYear's 0-indexed yearIndex) already
  // settled — either actually charged, or silently advanced past while
  // TAX_SYSTEM_ENABLED is off (see tax.ts). Keeping this moving even while
  // the system is off means flipping it on later never retroactively bills
  // years that already passed. null = no year settled yet (still in the
  // tax-free first year).
  lastTaxedYear: number | null;
}

function defaultProfile(): PlayerProfile {
  return {
    raceId: null,
    session: null,
    villageElapsedSeconds: 0,
    clockSpeed: 1,
    lastAnsweredCycle: null,
    pendingJudgmentCycle: null,
    pendingJudgmentRemainingSeconds: null,
    level: 1,
    exp: 0,
    defeatedMonsterNames: [],
    essences: [],
    discoveredEssenceIds: [],
    manaStones: {},
    inventoryGear: [],
    equippedGear: {},
    gold: 0,
    clockItemEquipped: true,
    hasVisitedDungeonExchange: false,
    lastTaxedYear: null,
  };
}

export function resetProfile(): PlayerProfile {
  return defaultProfile();
}

// Single decision point for whether the in-dungeon clock is shown. See the
// clockItemEquipped field's comment — once a real "시계" equipment item
// exists, replace this function's body to check its equipped state instead;
// every call site (dungeon-map/battle/inventory/equipment/essence UI in
// main.ts) stays the same.
export function isClockVisible(profile: PlayerProfile): boolean {
  return profile.clockItemEquipped;
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

// Exchanges every mana stone of one grade for stone at that grade's fixed
// per-stone rate (all stones of a grade are worth the same — no individual
// variance) and clears that grade's bucket. No-op if the player holds none.
export function exchangeManaStonesForGrade(profile: PlayerProfile, grade: MonsterGrade): PlayerProfile {
  const count = profile.manaStones[grade] ?? 0;
  if (count <= 0) return profile;

  const nextManaStones = { ...profile.manaStones };
  delete nextManaStones[grade];

  return {
    ...profile,
    manaStones: nextManaStones,
    gold: profile.gold + count * stoneValueForGrade(grade),
  };
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

// Defensively parses a raw, untyped value (JSON.parse'd localStorage, or a
// bare cloud API response — cloud-profile.ts uses this too) into a valid
// PlayerProfile, field by field, so a save from before a field existed
// degrades to that field's default instead of leaving `undefined` around to
// crash something downstream. Whenever a new PlayerProfile field is added,
// add its default here too (see sanitizeResumeSession in session.ts for the
// same principle applied to the nested `session`).
export function sanitizeProfile(raw: unknown): PlayerProfile {
  if (!raw || typeof raw !== 'object') return defaultProfile();
  const parsed = raw as Record<string, unknown>;
  return {
    raceId: typeof parsed.raceId === 'string' ? (parsed.raceId as RaceId) : null,
    session: sanitizeResumeSession(parsed.session),
    villageElapsedSeconds: typeof parsed.villageElapsedSeconds === 'number' ? parsed.villageElapsedSeconds : 0,
    clockSpeed: parsed.clockSpeed === 2 || parsed.clockSpeed === 4 ? parsed.clockSpeed : 1,
    lastAnsweredCycle: typeof parsed.lastAnsweredCycle === 'number' ? parsed.lastAnsweredCycle : null,
    pendingJudgmentCycle: typeof parsed.pendingJudgmentCycle === 'number' ? parsed.pendingJudgmentCycle : null,
    pendingJudgmentRemainingSeconds:
      typeof parsed.pendingJudgmentRemainingSeconds === 'number' ? parsed.pendingJudgmentRemainingSeconds : null,
    level: typeof parsed.level === 'number' ? parsed.level : 1,
    exp: typeof parsed.exp === 'number' ? parsed.exp : 0,
    defeatedMonsterNames: Array.isArray(parsed.defeatedMonsterNames) ? (parsed.defeatedMonsterNames as string[]) : [],
    essences: Array.isArray(parsed.essences) ? (parsed.essences as EquippedEssence[]) : [],
    discoveredEssenceIds: Array.isArray(parsed.discoveredEssenceIds) ? (parsed.discoveredEssenceIds as string[]) : [],
    manaStones: parsed.manaStones && typeof parsed.manaStones === 'object' ? (parsed.manaStones as ManaStoneCounts) : {},
    inventoryGear: Array.isArray(parsed.inventoryGear) ? (parsed.inventoryGear as GearInstance[]) : [],
    equippedGear: parsed.equippedGear && typeof parsed.equippedGear === 'object' ? (parsed.equippedGear as EquippedGear) : {},
    gold: typeof parsed.gold === 'number' ? parsed.gold : 0,
    clockItemEquipped: typeof parsed.clockItemEquipped === 'boolean' ? parsed.clockItemEquipped : true,
    hasVisitedDungeonExchange: typeof parsed.hasVisitedDungeonExchange === 'boolean' ? parsed.hasVisitedDungeonExchange : false,
    lastTaxedYear: typeof parsed.lastTaxedYear === 'number' ? parsed.lastTaxedYear : null,
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    return sanitizeProfile(JSON.parse(raw));
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
