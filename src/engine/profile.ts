import type { MonsterDef, MonsterGrade } from './monsters';
import { expForGrade, stoneValueForGrade } from './monsters';
import type { EquippedEssence } from './essence';
import { createGrantedGear, EQUIPMENT_SLOTS, type EquipmentSlot, type GearInstance } from './gear';
import type { EquippedGear } from './stats-calc';
import type { RaceId } from './races';
import { sanitizeResumeSession, type ResumeSession } from './session';
import { SECONDS_PER_HOUR, type ClockSpeed } from './village-clock';
import { STARTER_ARMOR, findWeaponChoice } from './ritual';
import type { StatBonus } from './stat-bonus';

const STORAGE_KEY = 'my-new-project:profile';
const EXP_PER_LEVEL = 20;

// Bumped whenever a save-incompatible change lands (e.g. the 4필드→육체/정신/
// 이능+세부스탯 스탯 체계 교체) — sanitizeProfile() below forces a full reset
// on mismatch rather than trying to field-by-field migrate, since the old
// GearInstance/EquippedEssence.statBonus objects it holds use a different
// calculation entirely (see CURRENT_SCHEMA_VERSION's usage below).
// v3: 오크를 플레이어 종족에서 완전히 제거 + 수인 추가 + 메인스탯 스케일
// 재조정(races.ts) — raceId: 'orc'인 구세이브가 getRace()에서 더는 유효하지
// 않으므로, 이 버전 상승만으로 그런 세이브까지 전부 안전하게 초기화된다.
const CURRENT_SCHEMA_VERSION = 3;

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
  // Set true once the barbarian coming-of-age ritual (무기 선택 +
  // 기본 방어구 지급, ui/ritual.ts) has been completed — gates the
  // forced 'ritual' screen right after character-select from ever
  // showing again. Defaults false, and resetProfile() naturally
  // re-defaults it on death since it just returns defaultProfile() —
  // a new character always goes through the ritual again.
  hasCompletedComingOfAge: boolean;
  // See CURRENT_SCHEMA_VERSION's comment above. Written on every save;
  // checked on every load (sanitizeProfile) to decide whether a save-
  // incompatible change means this save must be reset rather than parsed.
  schemaVersion: number;
  // Permanent stat bonus accumulated from achievements (currently only ever
  // touches `mind`), fed into computeTotalStats() as one more StatBonus
  // source alongside essences/gear. Defaults to {} and resetProfile()
  // naturally wipes it on death like every other achievement field below —
  // permadeath means every achievement must be earned again from scratch.
  achievementStatBonus: StatBonus;
  // One-shot gates for the two HP-crisis achievements (see GameState.
  // lowestPlayerHpRatio / checkForAchievements in main.ts) — each can only
  // ever grant its bonus once per character lifetime. The third achievement
  // ("첫 처치") needs no such flag: profile.defeatedMonsterNames.length === 0
  // is already an exact, naturally-resetting proxy for "this character has
  // never defeated anything yet" (see checkForExp in main.ts).
  achievementHp2PctGranted: boolean;
  achievementHp01PctGranted: boolean;
}

function defaultProfile(): PlayerProfile {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
    hasVisitedDungeonExchange: false,
    lastTaxedYear: null,
    hasCompletedComingOfAge: false,
    achievementStatBonus: {},
    achievementHp2PctGranted: false,
    achievementHp01PctGranted: false,
  };
}

export function resetProfile(): PlayerProfile {
  return defaultProfile();
}

// Single decision point for whether the in-dungeon clock is shown — true iff
// the player has a 회중시계(pocket watch, gear.ts) equipped in any slot. Was
// a standalone always-true placeholder field (clockItemEquipped) before that
// item existed; every call site (dungeon-map/battle/inventory/equipment/
// essence UI in main.ts) reads through this function, so none needed to
// change when the placeholder was replaced.
export function isClockVisible(profile: PlayerProfile): boolean {
  return Object.values(profile.equippedGear).some((gear) => gear?.isClockItem === true);
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

// Grants the chosen ritual weapon plus the fixed starter armor set,
// equipping all four directly (not routed through inventoryGear — the
// character is meant to walk out of the ritual already dressed), and marks
// the ritual done. No-op (returns profile unchanged) if the weapon id isn't
// recognized or the ritual was already completed, so a stray double-call
// can't re-grant gear onto an already-equipped character.
//
// Also pins villageElapsedSeconds to exactly -3h ("0일차 21:00", 3 hours
// before the very first midnight) regardless of how long the player
// lingered on the ritual screen first. Narrative reason: exactly 3 hours of
// walk-to-the-dungeon time before the next midnight dungeon opening, for
// the future 2D top-down transition.
//
// This used to be +21h ("1일차 21:00", a positive value past day 1's own
// midnight) — but nextJudgmentPointSeconds/crossedJudgmentCycle treat
// elapsed=0 as cycle 0's boundary, so starting *after* it made the game
// search for the *next* 30-day cycle instead, skipping the character's
// first-ever judgment window a full 30 days ahead (to day 31, not day 1).
// Starting negative (before elapsed=0) instead means the character simply
// hasn't reached cycle 0's boundary yet, so the first judgment correctly
// lands 3 hours later at day 1 00:00. gameDateTimeFromElapsed
// (village-clock.ts) handles negative input correctly (Euclidean modulo,
// not JS's sign-preserving `%`) so this displays as "0일차 21:00", not a
// crash or a clamped "1일차 00:00".
//
// Deliberately barbarian-only — scoped to this ritual-completion function,
// not defaultProfile()/character-select's raceId-setting — since other
// races will get their own character-creation flow (and own start time)
// later.
export function completeComingOfAge(profile: PlayerProfile, weaponChoiceId: string): PlayerProfile {
  if (profile.hasCompletedComingOfAge) return profile;
  const weaponChoice = findWeaponChoice(weaponChoiceId);
  if (!weaponChoice) return profile;

  const granted = [weaponChoice, ...STARTER_ARMOR].map((choice) => createGrantedGear(choice.id, choice.template));
  const equippedGear: EquippedGear = { ...profile.equippedGear };
  for (const gear of granted) {
    equippedGear[gear.slot] = gear;
  }

  return { ...profile, equippedGear, hasCompletedComingOfAge: true, villageElapsedSeconds: -3 * SECONDS_PER_HOUR };
}

export interface StripDungeonOnlyGearResult {
  profile: PlayerProfile;
  removedCount: number;
}

// Removes every non-permanent (dungeon-only, see isPermanent's doc comment
// in gear.ts) gear instance from both inventoryGear and equippedGear.
// Called exactly once a dungeon visit truly ends (forceReturnFromDungeon()
// in main.ts) — never on floor transitions/backtracking, which are still
// "the same visit" and must leave drops untouched. Death doesn't need this
// either: resetProfile() already wipes everything. No slot is auto-refilled
// from inventory afterward — a slot left empty here (e.g. a permanent
// weapon that was unequipped in favor of a drop) behaves like any other
// empty slot the player equips manually.
export function stripDungeonOnlyGear(profile: PlayerProfile): StripDungeonOnlyGearResult {
  const isKeeper = (gear: GearInstance) => gear.isPermanent === true;

  const inventoryGear = profile.inventoryGear.filter(isKeeper);
  const equippedGear: EquippedGear = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const gear = profile.equippedGear[slot];
    if (gear && isKeeper(gear)) equippedGear[slot] = gear;
  }

  const removedFromInventory = profile.inventoryGear.length - inventoryGear.length;
  const removedFromEquipped = EQUIPMENT_SLOTS.filter((slot) => profile.equippedGear[slot] && !equippedGear[slot]).length;

  return {
    profile: { ...profile, inventoryGear, equippedGear },
    removedCount: removedFromInventory + removedFromEquipped,
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
  // A schema-incompatible save (e.g. one written before the stat-system
  // rewrite) is reset wholesale rather than migrated field-by-field — see
  // CURRENT_SCHEMA_VERSION's comment. Unlike every other field below, this
  // isn't a "fill in a safe default and keep going" case: the old
  // GearInstance/EquippedEssence.statBonus objects nested inside raceId/
  // equippedGear/essences/inventoryGear use a different calculation
  // entirely, so partial recovery would silently drop stat bonuses instead
  // of failing loudly.
  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) return defaultProfile();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
    hasVisitedDungeonExchange: typeof parsed.hasVisitedDungeonExchange === 'boolean' ? parsed.hasVisitedDungeonExchange : false,
    lastTaxedYear: typeof parsed.lastTaxedYear === 'number' ? parsed.lastTaxedYear : null,
    hasCompletedComingOfAge: typeof parsed.hasCompletedComingOfAge === 'boolean' ? parsed.hasCompletedComingOfAge : false,
    achievementStatBonus:
      parsed.achievementStatBonus && typeof parsed.achievementStatBonus === 'object' ? (parsed.achievementStatBonus as StatBonus) : {},
    achievementHp2PctGranted: typeof parsed.achievementHp2PctGranted === 'boolean' ? parsed.achievementHp2PctGranted : false,
    achievementHp01PctGranted: typeof parsed.achievementHp01PctGranted === 'boolean' ? parsed.achievementHp01PctGranted : false,
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
