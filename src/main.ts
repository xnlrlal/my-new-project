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
  type Zone,
} from './engine/dungeon';
import { renderMenu } from './ui/menu';
import { renderCharacterSelect } from './ui/character-select';
import { renderVillage } from './ui/village';
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

function render() {
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
    renderInventory(app, profile, { onBack: () => goTo(returnScreen) });
    return;
  }

  if (screen === 'equipment') {
    renderEquipment(app, profile, {
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
    renderEssenceScreen(app, profile, { onBack: () => goTo(returnScreen) });
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
    renderVillage(app, profile.raceId != null, {
      onContinue: () => goTo('stats'),
      onBack: () => goTo('character-select'),
      onOpenInventory: () => openSubScreen('inventory'),
      onOpenEquipment: () => openSubScreen('equipment'),
      onOpenShop: () => goTo('shop'),
      onOpenLibrary: () => goTo('library'),
    });
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
    renderStats(app, selectedRace, profile, {
      onStartBattle: enterDungeon,
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
    renderDungeonMap(app, floorLabel, dungeonFloor, cell, moves, dungeonMessage, portalMessage, {
      onMove: handleMove,
      onEnterPortal: enterFloorTwo,
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
  arriveAt(randomStartPosition(), BASE_BATTLE_CHANCE, '미궁에 들어섰다. 주변을 살핀다.');
}

function enterFloorTwo(themeZone: ArmZone) {
  dungeonFloor = 2;
  dungeonThemeZone = themeZone;
  maze = generateMaze(themeZone);
  arriveAt(randomStartPosition(), BASE_BATTLE_CHANCE, `${zoneLabel(themeZone)} 미궁(2층)에 들어섰다. 주변을 살핀다.`);
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
    dungeonMessage,
    portalMessage,
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

// Always caches to localStorage immediately (so the game stays fully
// playable offline/as a guest), and additionally syncs to the cloud in the
// background whenever a user is logged in. Also refreshes the resume
// snapshot (see captureSession) so "이어하기" always reflects reality.
function persistProfile() {
  const captured = captureSession();
  if (captured !== undefined) {
    profile = { ...profile, session: captured };
  }
  saveProfile(profile);
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
  selectedRace = getRace(profile.raceId);
  const session = profile.session;
  if (!session) {
    goTo('village');
    return;
  }
  returnScreen = session.returnScreen;
  dungeonFloor = session.dungeonFloor;
  dungeonThemeZone = session.dungeonThemeZone;
  maze = session.maze ? deserializeMaze(session.maze) : null;
  pos = session.pos;
  dungeonMessage = session.dungeonMessage;
  portalMessage = session.portalMessage;
  currentMonster = session.currentMonsterId ? getMonsterById(session.currentMonsterId) : null;
  state = session.state;
  skipEligible = session.skipEligible;
  expResult = session.expResult;
  expChecked = session.expChecked;
  dropChecked = session.dropChecked;
  pendingEssence = session.pendingEssence;
  essenceOutcome = session.essenceOutcome;
  goTo(session.screen);
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

async function init() {
  render();
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
