import type { MonsterDef, MonsterGrade } from './monsters';
import { expForGrade, stoneValueForGrade } from './monsters';
import type { EquippedEssence } from './essence';
import { createGrantedGear, createPocketWatch, POCKET_WATCH_PRICE, EQUIPMENT_SLOTS, type EquipmentSlot, type GearInstance } from './gear';
import type { EquippedGear } from './stats-calc';
import type { RaceId } from './races';
import type { BodyPart } from './types';
import { getConsumable, type ConsumableId } from './consumables';
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
  // 사냥 숙련도(designnotes.md 3-1번, hunting-proficiency.ts)의 데이터 기반 —
  // defeatedMonsterNames("처치한 적 있는가", exp 최초 지급 판정 전용)와 달리
  // 몬스터 id별 누적 처치 "횟수"를 센다. 같은 몬스터를 exp 없이 반복 처치해도
  // (alreadyDefeated===true) 계속 늘어난다 — grantExpForKill과 별개로
  // recordMonsterKill()이 관리한다.
  monsterKillCounts: Partial<Record<string, number>>;
  essences: EquippedEssence[];
  discoveredEssenceIds: string[];
  manaStones: ManaStoneCounts;
  // 소모품(designnotes.md 6-1번, consumables.ts) — 마석과 같은 카운터
  // 저장 방식. 개별 인스턴스가 없어 GearInstance/EquippedEssence와 달리
  // instanceId 개념이 필요 없다.
  consumables: Partial<Record<ConsumableId, number>>;
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
  // 동료 NPC(designnotes.md 10번 "파티(결속)", 최소 구현) — npc.ts의
  // NpcDef.id 하나만 저장한다(전투 중 실제 HP/카드 등은 GameState.companion
  // 쪽에 있고, ResumeSession.state가 그걸 통째로 들고 있어 별도 저장이
  // 필요 없다 — session.ts 참고). null = 동료 없음. 최대 1명까지만
  // (1차 구현 범위, 교체/해산 UI 없음 — 전투 중 쓰러지면 자동으로 null이
  // 됨). 페르마데스 원칙에 따라 사망 시 resetProfile()로 함께 초기화.
  companionNpcId: string | null;
  // Wall-clock timestamp (Date.now()) of the last time this profile was
  // actually persisted (main.ts's persistProfileLocalOnly stamps it on
  // every local save). Lets adoptLoggedInProfile/restoreLoggedInSession
  // (main.ts) tell a genuinely newer save from a stale one when local and
  // cloud disagree, instead of always trusting one side blindly — that
  // blind trust used to let an unlucky network error on cloud read wipe a
  // real cloud save with a blank local one, and let a same-tab reload
  // silently roll back a local change whose background cloud sync hadn't
  // landed yet. Defaults to 0 ("never saved") so a genuinely untouched
  // profile always loses to any real saved data on either side.
  updatedAt: number;
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
    monsterKillCounts: {},
    essences: [],
    discoveredEssenceIds: [],
    manaStones: {},
    consumables: {},
    inventoryGear: [],
    equippedGear: {},
    gold: 0,
    hasVisitedDungeonExchange: false,
    lastTaxedYear: null,
    hasCompletedComingOfAge: false,
    companionNpcId: null,
    achievementStatBonus: {},
    achievementHp2PctGranted: false,
    achievementHp01PctGranted: false,
    updatedAt: 0,
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

export function consumableCount(profile: PlayerProfile, id: ConsumableId): number {
  return profile.consumables[id] ?? 0;
}

function addConsumable(profile: PlayerProfile, id: ConsumableId, amount = 1): PlayerProfile {
  return { ...profile, consumables: { ...profile.consumables, [id]: consumableCount(profile, id) + amount } };
}

// 마을 상점(ui/shop.ts)의 소모품 구매 — 회중시계(buyPocketWatch)와 달리
// 보유 여부로 막지 않는다: 소모품은 반복 구매가 전제인 자원이라, 스톤이
// 부족할 때만 아무 일도 일어나지 않는다.
export function buyConsumable(profile: PlayerProfile, id: ConsumableId): PlayerProfile {
  const def = getConsumable(id);
  if (profile.gold < def.price) return profile;
  return addConsumable({ ...profile, gold: profile.gold - def.price }, id);
}

// 전투 중 붕대 사용(main.ts) 등, 실제로 아이템을 소비할 때 호출한다. 재고가
// 없으면 no-op — 호출부가 미리 consumableCount()로 확인해야 하는 책임은
// 그대로 호출부에 있다(UI가 버튼 자체를 비활성화하는 식으로).
export function consumeItem(profile: PlayerProfile, id: ConsumableId): PlayerProfile {
  const count = consumableCount(profile, id);
  if (count <= 0) return profile;
  const nextConsumables = { ...profile.consumables };
  if (count <= 1) delete nextConsumables[id];
  else nextConsumables[id] = count - 1;
  return { ...profile, consumables: nextConsumables };
}

export function addGearToInventory(profile: PlayerProfile, gear: GearInstance): PlayerProfile {
  return { ...profile, inventoryGear: [...profile.inventoryGear, gear] };
}

// True once the player owns a 회중시계, equipped or not — used to grey out
// the shop's "구매" button (ui/shop.ts) so a second copy can't be bought as
// pointless clutter (it's a one-off tool item, not a stackable resource).
export function hasPocketWatch(profile: PlayerProfile): boolean {
  return (
    profile.inventoryGear.some((gear) => gear.isClockItem === true) ||
    Object.values(profile.equippedGear).some((gear) => gear?.isClockItem === true)
  );
}

// 마을 상점(ui/shop.ts)의 회중시계 구매 — 스톤이 부족하거나 이미 보유 중이면
// (hasPocketWatch) 아무 것도 하지 않고 profile을 그대로 반환한다. 구매만 할 뿐
// 자동으로 장착하지는 않음 — 다른 gear와 동일하게 장비창에서 직접 장착한다.
export function buyPocketWatch(profile: PlayerProfile): PlayerProfile {
  if (profile.gold < POCKET_WATCH_PRICE || hasPocketWatch(profile)) return profile;
  return addGearToInventory({ ...profile, gold: profile.gold - POCKET_WATCH_PRICE }, createPocketWatch());
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

// 장비 내구도(designnotes.md 3-5번)와 부위 손상(3-3번, body-parts.ts)을
// 잇는 다리 — 몸통 손상은 방어구(armor, 상의) 슬롯을, 다리 손상은 신발
// (footwear) 슬롯을 깎는다. 마스터 설정이 확정한 유일한 사례(성인식
// 샌들이 고블린 덫에 망가짐)를 그대로 반영한 매핑 — 팔 손상은 대응하는
// 방어구 슬롯이 아직 없어(6-2번 "어깨 보호대" 후보 참고) 대상 밖이고,
// legwear(하의)도 아직 근거가 없어 제외했다(ritual.ts 주석 참고).
function slotForBodyPart(part: BodyPart): EquipmentSlot | null {
  switch (part) {
    case 'torso':
      return 'armor';
    case 'leftLeg':
    case 'rightLeg':
      return 'footwear';
    default:
      return null;
  }
}

const DURABILITY_LOSS_PER_HIT = 1; // 1차 추정치 — 손상 1회당 내구도 -1

export interface BodyPartDurabilityResult {
  profile: PlayerProfile;
  // 장비가 이번 호출로 완전히 파괴됐을 때만 채워진다 — 매 손상마다 "내구도
  // -1" 같은 문구를 띄우면 로그가 지나치게 시끄러워지므로, 실제로 뭔가
  // 사라졌을 때만 알린다.
  message: string | null;
}

// main.ts가 전투 중 새로 손상된 부위(GameState.player.damagedParts의 새
// 항목)마다 호출한다. 대응 슬롯이 비어있거나, 장비에 애초에 내구도 개념이
// 없으면(maxDurability undefined) 아무 일도 일어나지 않는다. 내구도가
// 0에 닿으면 그 장비는 인벤토리로 돌아가지 않고 완전히 사라진다 — "신발
// 이라고 부르기도 애매한 수준"이라는 서술처럼 수리 불가능한 파손으로 다룬
// 1차 판단(수리 시스템은 미확정이라 다루지 않음).
export function damageEquippedGearForBodyPart(profile: PlayerProfile, part: BodyPart): BodyPartDurabilityResult {
  const slot = slotForBodyPart(part);
  if (!slot) return { profile, message: null };
  const gear = profile.equippedGear[slot];
  if (!gear || gear.maxDurability === undefined) return { profile, message: null };

  const currentDurability = gear.durability ?? gear.maxDurability;
  const nextDurability = Math.max(0, currentDurability - DURABILITY_LOSS_PER_HIT);

  if (nextDurability <= 0) {
    const nextEquipped = { ...profile.equippedGear };
    delete nextEquipped[slot];
    return {
      profile: { ...profile, equippedGear: nextEquipped },
      message: `${gear.name}이(가) 완전히 망가져 사라졌다.`,
    };
  }

  return {
    profile: { ...profile, equippedGear: { ...profile.equippedGear, [slot]: { ...gear, durability: nextDurability } } },
    message: null,
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
    monsterKillCounts:
      parsed.monsterKillCounts && typeof parsed.monsterKillCounts === 'object'
        ? (parsed.monsterKillCounts as Partial<Record<string, number>>)
        : {},
    essences: Array.isArray(parsed.essences) ? (parsed.essences as EquippedEssence[]) : [],
    discoveredEssenceIds: Array.isArray(parsed.discoveredEssenceIds) ? (parsed.discoveredEssenceIds as string[]) : [],
    manaStones: parsed.manaStones && typeof parsed.manaStones === 'object' ? (parsed.manaStones as ManaStoneCounts) : {},
    consumables:
      parsed.consumables && typeof parsed.consumables === 'object' ? (parsed.consumables as Partial<Record<ConsumableId, number>>) : {},
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
    companionNpcId: typeof parsed.companionNpcId === 'string' ? parsed.companionNpcId : null,
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
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

export function monsterKillCount(profile: PlayerProfile, monsterId: string): number {
  return profile.monsterKillCounts[monsterId] ?? 0;
}

// exp 지급(grantExpForKill, "최초 처치만")과 달리 이 몬스터를 몇 번째 잡든
// 매번 호출한다 — 사냥 숙련도(hunting-proficiency.ts)는 반복 처치 자체가
// 목적이므로 alreadyDefeated 여부와 무관하게 계속 누적돼야 한다.
export function recordMonsterKill(profile: PlayerProfile, monsterId: string): PlayerProfile {
  return { ...profile, monsterKillCounts: { ...profile.monsterKillCounts, [monsterId]: monsterKillCount(profile, monsterId) + 1 } };
}

// 동료 NPC(designnotes.md 10번, npc.ts) — 이미 동료가 있으면 no-op(1차
// 구현은 동시에 1명까지만, 교체 UI 없음). main.ts가 전투불능 상태의 NPC를
// "동료로 삼는다" 선택했을 때 호출한다.
export function recruitCompanion(profile: PlayerProfile, npcId: string): PlayerProfile {
  if (profile.companionNpcId) return profile;
  return { ...profile, companionNpcId: npcId };
}

// 동료가 전투 중 쓰러졌을 때(GameState.companion이 null이 됨, engine.ts의
// checkCompanionFallen) 세이브 쪽 기록도 맞춰 지운다 — main.ts가 전투 종료
// 후 이 둘의 불일치를 감지하면 호출한다.
export function clearCompanion(profile: PlayerProfile): PlayerProfile {
  if (!profile.companionNpcId) return profile;
  return { ...profile, companionNpcId: null };
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
