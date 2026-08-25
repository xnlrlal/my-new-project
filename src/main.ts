import './style.css';
import type { GameState } from './engine/types';
import { getRace, type RaceDef } from './engine/races';
import type { MonsterDef } from './engine/monsters';
import { getMonsterById, pickMonsterForFloorAndZone, rollEssenceDrop, rollManaStoneDrop } from './engine/monsters';
import { initGame, playCard, endTurn } from './engine/engine';
import type { ResumableScreen, ResumeSession } from './engine/session';
import {
  loadProfile,
  saveProfile,
  resetProfile,
  grantExpForKill,
  absorbEssence,
  hasOpenEssenceSlot,
  recordEssenceDiscovery,
  addManaStone,
  addGearToInventory,
  equipGear,
  unequipGear,
  addExp,
  isClockVisible,
  type PlayerProfile,
  type ExpGrantResult,
} from './engine/profile';
import { createEssenceFromMonster, essenceSkillCards, type EquippedEssence } from './engine/essence';
import { computeTotalStats } from './engine/stats-calc';
import { autoPlayBattle, estimateWinProbability } from './engine/battle-ai';
import { rollGearDrop, createGearFromMonster, type EquipmentSlot } from './engine/gear';
import {
  generateMaze,
  randomStartPosition,
  cellAt,
  availableMoves,
  rollBattle,
  serializeMaze,
  deserializeMaze,
  BASE_BATTLE_CHANCE,
  zoneLabel,
  type ArmZone,
  type CellId,
  type DungeonCell,
  type DungeonMaze,
  type DungeonMove,
  type SerializedDungeonMaze,
  type Zone,
} from './engine/dungeon';
import { renderMenu } from './ui/menu';
import { renderCharacterSelect } from './ui/character-select';
import { renderVillage } from './ui/village';
import {
  advanceVillageClock,
  crossedJudgmentCycle,
  formatGameDateTime,
  gameDateTimeFromElapsed,
  judgmentBoundarySeconds,
  nextJudgmentPointSeconds,
  JUDGMENT_COUNTDOWN_SECONDS,
} from './engine/village-clock';
import {
  advanceDungeonClock,
  isFloor1RevertLocked,
  shouldForceDungeonReturn,
  villageNoonAfterForcedReturn,
} from './engine/dungeon-clock';
import { renderShop } from './ui/shop';
import { renderLibrary } from './ui/library';
import { renderStats } from './ui/stats';
import { renderBattle } from './ui/battle';
import { renderInventory } from './ui/inventory';
import { renderEquipment } from './ui/equipment';
import { renderEssenceScreen } from './ui/essence';
import { renderDungeonMap } from './ui/dungeon-map';
import { renderAuth, type AuthMode } from './ui/auth';
import { signIn, signUp, signOut, getCurrentUser, isCloudConfigured, type AuthUser } from './engine/auth';
import { loadCloudProfile, saveCloudProfile } from './engine/cloud-profile';

type Screen =
  | 'auth'
  | 'menu'
  | 'character-select'
  | 'village'
  | 'stats'
  | 'dungeon-map'
  | 'battle'
  | 'inventory'
  | 'equipment'
  | 'essence'
  | 'shop'
  | 'library';

const PORTAL_EXP_BONUS = 2;

const app = document.querySelector<HTMLDivElement>('#app')!;

let screen: Screen = 'auth';
let profile: PlayerProfile = loadProfile();
let authUser: AuthUser | null = null;
let authMode: AuthMode = 'login';
let authError: string | null = null;
let authLoading = false;
let selectedRace: RaceDef | null = null;
let currentMonster: MonsterDef | null = null;
let state: GameState | null = null;
let expResult: ExpGrantResult | null = null;
let expChecked = false;
let dropChecked = false;
let pendingEssence: EquippedEssence | null = null;
let essenceOutcome: string | null = null;
let returnScreen: Screen = 'stats';
let skipEligible = false;

const SKIP_WIN_PROBABILITY_THRESHOLD = 0.99;

let dungeonFloor: 1 | 2 = 1;
let dungeonThemeZone: ArmZone | null = null;
let maze: DungeonMaze | null = null;
let pos: CellId | null = null;
let dungeonMessage: string | null = null;
let portalMessage: string | null = null;
let dungeonElapsedSeconds = 0;
let dungeonEntryVillageSeconds = 0;
// Snapshot of floor 1 taken at the moment of entering floor 2, so
// backtracking (while unlocked) resumes it exactly instead of regenerating.
let floor1Maze: DungeonMaze | null = null;
let floor1Pos: CellId | null = null;
// Same idea for floor 2, per zone: snapshotted the moment the player leaves
// a zone (reverts to floor 1), so re-entering that zone later reuses it
// instead of generating a fresh one. Only a zone's first-ever entry (no
// snapshot yet) generates a new maze.
let floor2Zones: Partial<Record<ArmZone, { maze: DungeonMaze; pos: CellId }>> = {};

const GAME_CLOCK_TICK_MS = 1000;
// Wall-clock timestamp of the last tick, purely in-memory (never persisted)
// so a page reload never "catches up" on time that passed while the tab was
// closed — the first tick after load just seeds this and advances nothing.
let lastVillageTickAt: number | null = null;

// Screens reachable while an active dungeon run exists (maze !== null) —
// dungeon-map/battle themselves plus the inventory/equipment/essence
// subscreens opened from either, since maze stays set the whole time a
// subscreen is open. Shared by the dungeonClockLabel computation below and
// by tickGameClock()'s per-second re-render while the clock is visible.
const DUNGEON_CONTEXT_SCREENS: Screen[] = ['dungeon-map', 'battle', 'inventory', 'equipment', 'essence'];

function render() {
  // Computed once per render rather than per-screen: maze !== null already
  // means "currently inside a dungeon run" for every one of
  // DUNGEON_CONTEXT_SCREENS (subscreens don't clear maze), so a single check
  // here covers all five call sites below. isClockVisible() is the one
  // on/off decision point — see its doc comment in profile.ts.
  const dungeonClockLabel =
    maze !== null && isClockVisible(profile) ? formatGameDateTime(gameDateTimeFromElapsed(dungeonElapsedSeconds)) : null;

  if (screen === 'auth') {
    renderAuth(
      app,
      { mode: authMode, error: authError, loading: authLoading, cloudConfigured: isCloudConfigured },
      {
        onSwitchMode: (mode) => {
          authMode = mode;
          authError = null;
          render();
        },
        onSubmit: (username, password) => {
          if (authMode === 'login') handleLogin(username, password);
          else handleSignup(username, password);
        },
        onGuest: () => {
          authUser = null;
          goTo('menu');
        },
      }
    );
    return;
  }

  if (screen === 'menu') {
    const hasCharacter = profile.raceId != null;
    renderMenu(app, authUser, hasCharacter, {
      onCreateCharacter: () => goTo('character-select'),
      onContinueCharacter: () => resumeCharacter(),
      onLogout: handleLogout,
      onGoToLogin: () => {
        authError = null;
        goTo('auth');
      },
    });
    return;
  }

  if (screen === 'inventory') {
    renderInventory(app, profile, dungeonClockLabel, { onBack: () => goTo(returnScreen) });
    return;
  }

  if (screen === 'equipment') {
    renderEquipment(app, profile, dungeonClockLabel, {
      onBack: () => goTo(returnScreen),
      onEquip: (instanceId) => {
        profile = equipGear(profile, instanceId);
        persistProfile();
        render();
      },
      onUnequip: (slot: EquipmentSlot) => {
        profile = unequipGear(profile, slot);
        persistProfile();
        render();
      },
    });
    return;
  }

  if (screen === 'essence') {
    renderEssenceScreen(app, profile, dungeonClockLabel, { onBack: () => goTo(returnScreen) });
    return;
  }

  if (screen === 'character-select') {
    renderCharacterSelect(app, {
      onSelect: (race) => {
        selectedRace = race;
        profile = { ...profile, raceId: race.id };
        goTo('village');
      },
      onBack: () => goTo('menu'),
    });
    return;
  }

  if (screen === 'village') {
    renderVillage(
      app,
      profile.raceId != null,
      {
        dateTime: gameDateTimeFromElapsed(profile.villageElapsedSeconds),
        speed: profile.clockSpeed,
        secondsUntilJudgment: nextJudgmentPointSeconds(profile.villageElapsedSeconds) - profile.villageElapsedSeconds,
        pendingJudgmentRemainingSeconds:
          profile.pendingJudgmentRemainingSeconds !== null ? Math.ceil(profile.pendingJudgmentRemainingSeconds) : null,
      },
      {
        onContinue: () => goTo('stats'),
        onBack: () => goTo('character-select'),
        onOpenInventory: () => openSubScreen('inventory'),
        onOpenEquipment: () => openSubScreen('equipment'),
        onOpenShop: () => goTo('shop'),
        onOpenLibrary: () => goTo('library'),
        onQuitToMenu: () => goTo('menu'),
        onSetSpeed: (speed) => {
          profile = { ...profile, clockSpeed: speed };
          persistProfile();
          render();
        },
        onSkip: () => {
          advanceProfileVillageTime(nextJudgmentPointSeconds(profile.villageElapsedSeconds));
          persistProfile();
          render();
        },
        onAcceptJudgment: () => {
          const cycle = profile.pendingJudgmentCycle;
          profile = { ...profile, lastAnsweredCycle: cycle, pendingJudgmentCycle: null, pendingJudgmentRemainingSeconds: null };
          dungeonEntryVillageSeconds = cycle !== null ? judgmentBoundarySeconds(cycle) : profile.villageElapsedSeconds;
          enterDungeon();
        },
        onDeclineJudgment: () => {
          profile = { ...profile, lastAnsweredCycle: profile.pendingJudgmentCycle, pendingJudgmentCycle: null, pendingJudgmentRemainingSeconds: null };
          persistProfile();
          render();
        },
      }
    );
    return;
  }

  if (screen === 'shop') {
    renderShop(app, { onBack: () => goTo('village') });
    return;
  }

  if (screen === 'library') {
    renderLibrary(app, { onBack: () => goTo('village') });
    return;
  }

  if (screen === 'stats' && selectedRace) {
    renderStats(app, selectedRace, profile, nextJudgmentPointSeconds(profile.villageElapsedSeconds) - profile.villageElapsedSeconds, {
      onBack: () => goTo('village'),
      onOpenInventory: () => openSubScreen('inventory'),
      onOpenEquipment: () => openSubScreen('equipment'),
      onOpenEssence: () => openSubScreen('essence'),
    });
    return;
  }

  if (screen === 'dungeon-map' && maze && pos) {
    const cell = cellAt(maze, pos);
    const moves = availableMoves(maze, pos);
    const floorLabel = dungeonFloor === 1 ? '미궁 1층' : `${zoneLabel(dungeonThemeZone!)} 미궁 2층`;
    renderDungeonMap(app, floorLabel, dungeonFloor, cell, moves, dungeonMessage, portalMessage, isFloor1RevertLocked(dungeonElapsedSeconds), dungeonClockLabel, {
      onMove: handleMove,
      onEnterPortal: enterFloorTwo,
      onRevertToFloor1: revertToFloor1,
      onOpenInventory: () => openSubScreen('inventory'),
      onOpenEquipment: () => openSubScreen('equipment'),
      onOpenEssence: () => openSubScreen('essence'),
    });
    return;
  }

  if (screen === 'battle' && state) {
    const floorLabel = dungeonFloor === 1 ? '미궁 1층' : `${zoneLabel(dungeonThemeZone!)} 미궁 2층`;
    renderBattle(
      app,
      state,
      floorLabel,
      dungeonClockLabel,
      skipEligible,
      expResult,
      { pending: pendingEssence, outcome: essenceOutcome },
      {
        onPlayCard: (cardId) => {
          state = playCard(state!, cardId);
          afterStateChange();
        },
        onEndTurn: () => {
          state = endTurn(state!);
          afterStateChange();
        },
        onSkip: () => {
          state = autoPlayBattle(state!);
          afterStateChange();
        },
        onContinue: () => {
          dungeonMessage = '전투에서 승리했다.';
          goTo('dungeon-map');
        },
        onAcknowledgeDeath: handleDeath,
        onAbsorbEssence: () => {
          if (!pendingEssence) return;
          if (hasOpenEssenceSlot(profile)) {
            profile = absorbEssence(profile, pendingEssence);
            essenceOutcome = `${pendingEssence.monsterName}의 정수를 흡수했습니다!`;
          } else {
            essenceOutcome = '장착 슬롯이 가득 차 흡수할 수 없었습니다.';
          }
          pendingEssence = null;
          persistProfile();
          render();
        },
        onDiscardEssence: () => {
          essenceOutcome = '정수를 버렸습니다.';
          pendingEssence = null;
          persistProfile();
          render();
        },
        onOpenInventory: () => openSubScreen('inventory'),
        onOpenEquipment: () => openSubScreen('equipment'),
        onOpenEssence: () => openSubScreen('essence'),
      }
    );
  }
}

function openSubScreen(next: Screen) {
  returnScreen = screen;
  goTo(next);
}

function afterStateChange() {
  checkForExp();
  checkForDrop();
  persistProfile();
  render();
}

function goTo(next: Screen) {
  screen = next;
  persistProfile();
  render();
}

function enterDungeon() {
  dungeonFloor = 1;
  dungeonThemeZone = null;
  maze = generateMaze(null);
  dungeonElapsedSeconds = 0;
  floor1Maze = null;
  floor1Pos = null;
  floor2Zones = {};
  arriveAt(randomStartPosition(), BASE_BATTLE_CHANCE, '미궁에 들어섰다. 주변을 살핀다.');
}

// Time's up: the dungeon closes around the player regardless of what
// they're doing — "전투 중이라도 즉시 강제귀환, 유예 없음". Progress earned
// so far (profile: level/items/gear/essences/mana stones) is kept; this
// isn't a loss, just an abrupt, involuntary end to the run, unlike death.
// Village time is set to "그날 정오" (entry's 06:00 + 6h) regardless of how
// many in-dungeon days actually passed, per spec — not the same kind of
// exit exitDungeonToMenu used to be (that was a player-triggered escape
// hatch and was removed entirely to close the portal-farming exploit; this
// only ever fires automatically from the time system, never on demand).
function forceReturnFromDungeon() {
  dungeonFloor = 1;
  dungeonThemeZone = null;
  maze = null;
  pos = null;
  dungeonMessage = null;
  portalMessage = null;
  dungeonElapsedSeconds = 0;
  floor1Maze = null;
  floor1Pos = null;
  floor2Zones = {};
  state = null;
  currentMonster = null;
  skipEligible = false;
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  profile = { ...profile, villageElapsedSeconds: villageNoonAfterForcedReturn(dungeonEntryVillageSeconds) };
  dungeonEntryVillageSeconds = 0;
  goTo('village');
}

// Reuses a zone's floor-2 maze if the player has been there before this run
// (see floor2Zones' declaration comment) — only a zone's very first entry
// ever generates a fresh maze. "최초 미궁 진입을 제외하고 역행 시엔 재사용이
// 원칙" applies symmetrically to floor 1 and every floor-2 zone alike.
function enterFloorTwo(themeZone: ArmZone) {
  // Snapshot floor 1 exactly as it stands so backtracking can resume it
  // later instead of regenerating (see floor1Maze's declaration comment).
  floor1Maze = maze;
  floor1Pos = pos;
  dungeonFloor = 2;
  dungeonThemeZone = themeZone;

  const saved = floor2Zones[themeZone];
  if (saved) {
    maze = saved.maze;
    pos = saved.pos;
    dungeonMessage = `${zoneLabel(themeZone)} 미궁(2층)으로 돌아왔다.`;
    portalMessage = null;
    goTo('dungeon-map');
  } else {
    maze = generateMaze(themeZone);
    arriveAt(randomStartPosition(), BASE_BATTLE_CHANCE, `${zoneLabel(themeZone)} 미궁(2층)에 들어섰다. 주변을 살핀다.`);
  }
}

// Only reachable from floor 2's portal cell, and only before the 7-day
// revert lock — enforced again here (not just hidden in the UI) in case the
// lock crosses between render and click. Reuses the floor 1 snapshot taken
// on the way up rather than generating a new maze, so this can't be abused
// to re-farm floor 1's portal EXP the way the removed "메인 메뉴로" could.
function revertToFloor1() {
  if (dungeonFloor !== 2 || !floor1Maze || !floor1Pos || isFloor1RevertLocked(dungeonElapsedSeconds)) return;
  // Snapshot this floor-2 zone exactly as it stands so re-entering it later
  // reuses it instead of generating a fresh one.
  if (dungeonThemeZone && maze && pos) {
    floor2Zones = { ...floor2Zones, [dungeonThemeZone]: { maze, pos } };
  }
  dungeonFloor = 1;
  dungeonThemeZone = null;
  maze = floor1Maze;
  pos = floor1Pos;
  floor1Maze = null;
  floor1Pos = null;
  dungeonMessage = '1층으로 돌아왔다.';
  portalMessage = null;
  goTo('dungeon-map');
}

function handleMove(move: DungeonMove) {
  arriveAt(move.next, move.battleChance, '조용히 이동했다.');
}

// Shared by both entering a fresh maze and moving within one, so the very
// first placement in a dungeon rolls for a battle just like any other step.
function arriveAt(id: CellId, battleChance: number, safeMessage: string) {
  if (!maze) return;
  pos = id;
  const cell = cellAt(maze, id);

  if (cell.portal) {
    handlePortalArrival(cell);
    goTo('dungeon-map');
    return;
  }

  portalMessage = null;
  if (rollBattle(battleChance)) {
    startZoneBattle(cell.zone);
  } else {
    dungeonMessage = safeMessage;
    goTo('dungeon-map');
  }
}

function handlePortalArrival(cell: DungeonCell) {
  dungeonMessage = null;
  if (!maze || !cell.portal) return;

  if (!maze.portalsFound.has(cell.portal)) {
    maze.portalsFound.add(cell.portal);
    const result = addExp(profile, PORTAL_EXP_BONUS);
    profile = result.profile;
    persistProfile();
    portalMessage = `경험치 +${PORTAL_EXP_BONUS} 획득!${result.leveledUp ? ' 레벨 업!' : ''}`;
  } else {
    portalMessage = null;
  }
}

function startZoneBattle(zone: Zone) {
  if (!selectedRace) return;
  currentMonster = pickMonsterForFloorAndZone(dungeonFloor, zone);
  const bonusCards = essenceSkillCards(profile.essences);
  const totalStats = computeTotalStats(selectedRace.stats, profile.essences, profile.equippedGear);
  state = initGame(totalStats, currentMonster, bonusCards);
  skipEligible = estimateWinProbability(totalStats, bonusCards, currentMonster) >= SKIP_WIN_PROBABILITY_THRESHOLD;
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  goTo('battle');
}

// Losing is permanent: the whole save (level, inventory, essences, gear,
// discovered codex, resume session — everything) resets, matching the
// roguelike death rule. All cleanup happens before goTo('menu') so its
// built-in persistProfile() call captures the already-reset state instead
// of resurrecting the battle that was just lost.
function handleDeath() {
  profile = resetProfile();
  selectedRace = null;
  currentMonster = null;
  state = null;
  dungeonFloor = 1;
  dungeonThemeZone = null;
  maze = null;
  pos = null;
  dungeonMessage = null;
  portalMessage = null;
  dungeonElapsedSeconds = 0;
  dungeonEntryVillageSeconds = 0;
  floor1Maze = null;
  floor1Pos = null;
  floor2Zones = {};
  skipEligible = false;
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  goTo('menu');
}

function checkForExp() {
  if (!state || !currentMonster || state.status !== 'win' || expChecked) return;
  expChecked = true;
  expResult = grantExpForKill(profile, currentMonster);
  profile = expResult.profile;
  persistProfile();
}

function checkForDrop() {
  if (!state || !currentMonster || state.status !== 'win' || dropChecked) return;
  dropChecked = true;

  if (rollManaStoneDrop()) {
    profile = addManaStone(profile, currentMonster.grade);
    persistProfile();
  }

  if (rollGearDrop()) {
    profile = addGearToInventory(profile, createGearFromMonster(currentMonster.id, currentMonster.gearDrop));
    persistProfile();
  }

  if (rollEssenceDrop()) {
    pendingEssence = createEssenceFromMonster(currentMonster);
    profile = recordEssenceDiscovery(profile, currentMonster.id);
    persistProfile();
  }
}

function toResumableScreen(s: Screen): ResumableScreen | null {
  switch (s) {
    case 'village':
    case 'stats':
    case 'dungeon-map':
    case 'battle':
    case 'inventory':
    case 'equipment':
    case 'essence':
    case 'shop':
    case 'library':
      return s;
    default:
      return null;
  }
}

function serializeFloor2Zones(
  zones: Partial<Record<ArmZone, { maze: DungeonMaze; pos: CellId }>>
): Partial<Record<ArmZone, { maze: SerializedDungeonMaze; pos: CellId }>> {
  const result: Partial<Record<ArmZone, { maze: SerializedDungeonMaze; pos: CellId }>> = {};
  for (const [zone, saved] of Object.entries(zones) as [ArmZone, { maze: DungeonMaze; pos: CellId }][]) {
    result[zone] = { maze: serializeMaze(saved.maze), pos: saved.pos };
  }
  return result;
}

function deserializeFloor2Zones(
  zones: Partial<Record<ArmZone, { maze: SerializedDungeonMaze; pos: CellId }>>
): Partial<Record<ArmZone, { maze: DungeonMaze; pos: CellId }>> {
  const result: Partial<Record<ArmZone, { maze: DungeonMaze; pos: CellId }>> = {};
  for (const [zone, saved] of Object.entries(zones) as [ArmZone, { maze: SerializedDungeonMaze; pos: CellId }][]) {
    result[zone] = { maze: deserializeMaze(saved.maze), pos: saved.pos };
  }
  return result;
}

// Snapshots exactly what's needed to resume the current screen later
// (including mid-battle: hand/deck/hp/log all live on `state`). Returns
// undefined while on a non-gameplay screen (auth/menu/character-select) so
// persistProfile() leaves the last real resume point untouched instead of
// clobbering it — handleDeath() clears all module state before reaching
// 'menu' so this can't resurrect the run that was just lost.
function captureSession(): ResumeSession | undefined {
  const resumable = toResumableScreen(screen);
  if (!resumable) return undefined;
  return {
    screen: resumable,
    returnScreen: toResumableScreen(returnScreen) ?? 'stats',
    dungeonFloor,
    dungeonThemeZone,
    maze: maze ? serializeMaze(maze) : null,
    pos,
    floor1Maze: floor1Maze ? serializeMaze(floor1Maze) : null,
    floor1Pos,
    floor2Zones: serializeFloor2Zones(floor2Zones),
    dungeonMessage,
    portalMessage,
    dungeonElapsedSeconds,
    dungeonEntryVillageSeconds,
    currentMonsterId: currentMonster?.id ?? null,
    state,
    skipEligible,
    expResult,
    expChecked,
    dropChecked,
    pendingEssence,
    essenceOutcome,
  };
}

// Refreshes the resume snapshot (see captureSession) and caches to
// localStorage immediately (so the game stays fully playable offline/as a
// guest), but does not touch the network. Used by the once-a-second clock
// ticks (village and dungeon alike) so idle time is never lost on a same-tab
// reload without pushing a network write every single second.
function persistProfileLocalOnly() {
  const captured = captureSession();
  if (captured !== undefined) {
    profile = { ...profile, session: captured };
  }
  saveProfile(profile);
}

// Same as persistProfileLocalOnly(), plus a background cloud sync for
// logged-in players. Used everywhere state changes from a real action
// (screen transitions, card plays, gear changes, etc.) rather than from
// ticking, so cloud sync stays bounded by how often the player actually
// does something.
function persistProfile() {
  persistProfileLocalOnly();
  if (authUser) {
    saveCloudProfile(authUser.id, profile).catch(() => {
      // best-effort background sync; localStorage already has the data
    });
  }
}

// Restores every module variable a saved ResumeSession touched, then
// navigates to the exact screen the player left off on (village if there
// is no session yet, e.g. a character that was just created).
function resumeCharacter() {
  if (!profile.raceId) return;
  const session = profile.session;
  if (!session) {
    selectedRace = getRace(profile.raceId);
    goTo('village');
    return;
  }
  // profile.session is already sanitized to a valid ResumeSession by
  // sanitizeProfile() (see profile.ts/session.ts) before it ever reaches
  // here, so this shouldn't throw in practice. The try/catch is a last-resort
  // safety net against anything that slips through anyway (an unrecognized
  // raceId/monster id, say) — falling back to village loses only the
  // in-progress dungeon navigation state, never profile.raceId or any of the
  // character's actual progress (level/gear/essences/gold), which live
  // entirely outside `session` and are untouched here.
  try {
    // render() has no fallback branch for 'dungeon-map'/'battle' without
    // their required companion data (maze+pos / state) — it would just
    // leave the previous screen frozen on screen instead of painting
    // anything. Treat that combination as unresumable too.
    if (session.screen === 'dungeon-map' && !(session.maze && session.pos)) {
      throw new Error('Saved dungeon-map session is missing its maze/position');
    }
    if (session.screen === 'battle' && !session.state) {
      throw new Error('Saved battle session is missing its battle state');
    }

    selectedRace = getRace(profile.raceId);
    returnScreen = session.returnScreen;
    dungeonFloor = session.dungeonFloor;
    dungeonThemeZone = session.dungeonThemeZone;
    maze = session.maze ? deserializeMaze(session.maze) : null;
    pos = session.pos;
    floor1Maze = session.floor1Maze ? deserializeMaze(session.floor1Maze) : null;
    floor1Pos = session.floor1Pos;
    floor2Zones = deserializeFloor2Zones(session.floor2Zones);
    dungeonMessage = session.dungeonMessage;
    portalMessage = session.portalMessage;
    dungeonElapsedSeconds = session.dungeonElapsedSeconds;
    dungeonEntryVillageSeconds = session.dungeonEntryVillageSeconds;
    currentMonster = session.currentMonsterId ? getMonsterById(session.currentMonsterId) : null;
    state = session.state;
    skipEligible = session.skipEligible;
    expResult = session.expResult;
    expChecked = session.expChecked;
    dropChecked = session.dropChecked;
    pendingEssence = session.pendingEssence;
    essenceOutcome = session.essenceOutcome;
    goTo(session.screen);
  } catch (err) {
    console.error('Failed to resume saved session, falling back to village:', err);
    goTo('village');
  }
}

async function adoptLoggedInProfile(user: AuthUser) {
  authUser = user;
  const cloud = await loadCloudProfile(user.id);
  if (cloud) {
    profile = cloud;
    saveProfile(profile);
  } else {
    // first time this account has logged in: push whatever local/guest
    // progress exists up to the cloud so it isn't lost
    await saveCloudProfile(user.id, profile);
  }
  authError = null;
  authLoading = false;
  goTo('menu');
}

async function handleLogin(username: string, password: string) {
  authLoading = true;
  authError = null;
  render();
  const result = await signIn(username, password);
  if (!result.ok || !result.user) {
    authLoading = false;
    authError = result.error ?? '로그인에 실패했습니다.';
    render();
    return;
  }
  await adoptLoggedInProfile(result.user);
}

async function handleSignup(username: string, password: string) {
  authLoading = true;
  authError = null;
  render();
  const result = await signUp(username, password);
  if (!result.ok || !result.user) {
    authLoading = false;
    authError = result.error ?? '회원가입에 실패했습니다.';
    render();
    return;
  }
  await adoptLoggedInProfile(result.user);
}

async function handleLogout() {
  await signOut();
  authUser = null;
  goTo('auth');
}

// Moves villageElapsedSeconds to newElapsed, opening a judgment window
// (30 real-second decision timer) if doing so crosses an unanswered 30-day/
// 06:00 boundary. Shared by the tick (gradual advance) and the skip button
// (jumps straight to the next boundary) so both go through the same
// crossing-detection logic instead of duplicating it.
function advanceProfileVillageTime(newElapsed: number) {
  const crossedCycle = crossedJudgmentCycle(profile.villageElapsedSeconds, newElapsed, profile.lastAnsweredCycle);
  profile =
    crossedCycle !== null
      ? { ...profile, villageElapsedSeconds: newElapsed, pendingJudgmentCycle: crossedCycle, pendingJudgmentRemainingSeconds: JUDGMENT_COUNTDOWN_SECONDS }
      : { ...profile, villageElapsedSeconds: newElapsed };
}

// Drives whichever of the two clocks currently applies: while maze !== null
// (an active dungeon run) the dungeon clock advances and is checked for a
// forced floor closure; otherwise (village/stats/shop/library/inventory/
// equipment/menu — state-based, not screen-based, as before) the village
// clock advances, judgment window included. The two are mutually exclusive
// by construction. Neither runs before a character exists.
function tickGameClock() {
  const now = Date.now();
  if (lastVillageTickAt === null) {
    lastVillageTickAt = now;
    return;
  }
  const realDeltaSeconds = (now - lastVillageTickAt) / 1000;
  lastVillageTickAt = now;

  if (!profile.raceId) return;

  if (maze !== null) {
    dungeonElapsedSeconds = advanceDungeonClock(dungeonElapsedSeconds, realDeltaSeconds);
    if (shouldForceDungeonReturn(dungeonElapsedSeconds, dungeonFloor)) {
      forceReturnFromDungeon();
      return;
    }
    persistProfileLocalOnly();
    if (isClockVisible(profile) && DUNGEON_CONTEXT_SCREENS.includes(screen)) render();
    return;
  }

  const newElapsed = advanceVillageClock(profile.villageElapsedSeconds, realDeltaSeconds, profile.clockSpeed);

  if (profile.pendingJudgmentRemainingSeconds !== null) {
    // The 30-second decision countdown is real time, not scaled by
    // clockSpeed — it's decision pressure on the player, not game time.
    const remaining = profile.pendingJudgmentRemainingSeconds - realDeltaSeconds;
    profile =
      remaining <= 0
        ? { ...profile, villageElapsedSeconds: newElapsed, lastAnsweredCycle: profile.pendingJudgmentCycle, pendingJudgmentCycle: null, pendingJudgmentRemainingSeconds: null }
        : { ...profile, villageElapsedSeconds: newElapsed, pendingJudgmentRemainingSeconds: remaining };
  } else {
    advanceProfileVillageTime(newElapsed);
  }

  saveProfile(profile);
  if (screen === 'village') render();
}

async function init() {
  render();
  setInterval(tickGameClock, GAME_CLOCK_TICK_MS);
  if (isCloudConfigured) {
    const existingUser = await getCurrentUser();
    if (existingUser) {
      await adoptLoggedInProfile(existingUser);
      return;
    }
  }
  goTo('auth');
}

init();
