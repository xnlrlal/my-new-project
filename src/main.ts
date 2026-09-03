import './style.css';
import type { GameState } from './engine/types';
import { getRace, type RaceDef } from './engine/races';
import type { MonsterDef, MonsterGrade } from './engine/monsters';
import { getMonsterById, pickMonsterForFloorAndZone, rollEssenceDrop, rollManaStoneDrop } from './engine/monsters';
import { initGame, playCard, endTurn } from './engine/engine';
import { hasBleed, removeStatusEffect } from './engine/status-effects';
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
  buyPocketWatch,
  exchangeManaStonesForGrade,
  completeComingOfAge,
  stripDungeonOnlyGear,
  damageEquippedGearForBodyPart,
  buyConsumable,
  consumeItem,
  consumableCount,
  monsterKillCount,
  recordMonsterKill,
  type PlayerProfile,
  type ExpGrantResult,
} from './engine/profile';
import { createEssenceFromMonster, essenceSkillCards, type EquippedEssence } from './engine/essence';
import { computeTotalStats } from './engine/stats-calc';
import { applyStatBonuses } from './engine/stat-bonus';
import { huntingProficiencyBonus, huntingProficiencyLabel, huntingProficiencyTier } from './engine/hunting-proficiency';
import { autoPlayOneTurn, estimateWinProbability } from './engine/battle-ai';
import { rollGearDrop, createGearFromMonster, type EquipmentSlot } from './engine/gear';
import {
  generateMaze,
  randomStartPosition,
  cellAt,
  availableMoves,
  rollBattle,
  resolveTrap,
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
import { renderRitual } from './ui/ritual';
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
  packSizeForDay,
  shouldForceDungeonReturn,
  villageNoonAfterForcedReturn,
} from './engine/dungeon-clock';
import { renderShop } from './ui/shop';
import { renderLibrary } from './ui/library';
import { renderExchange } from './ui/exchange';
import { applyAnnualTaxIfCrossed, ANNUAL_TAX_AMOUNT } from './engine/tax';
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
  | 'ritual'
  | 'village'
  | 'stats'
  | 'dungeon-map'
  | 'battle'
  | 'inventory'
  | 'equipment'
  | 'essence'
  | 'shop'
  | 'library'
  | 'exchange';

const PORTAL_EXP_BONUS = 2;
// 전투 없이 안전하게 이동할 때마다 자연재생력(인내심)만큼 소량 회복시킨다 —
// 전투 중 회복(engine.ts의 WILLPOWER_REGEN_COEF, 라운드당)과 별개 축이라
// 계수도 따로 둔다. 인내심이 없으면(장비/정수를 얻기 전) 0이라 아무 효과
// 없음 — 지금은 성지의 샌들(ritual.ts)이 유일한 원천.
const OUT_OF_COMBAT_REGEN_COEF = 2; // 인내심 1당 안전한 이동 1칸당 최대체력의 +2% (engine.ts의 WILLPOWER_REGEN_COEF와 같은 이유로 재상향)

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
// Raw estimateWinProbability() result for the current battle, computed once
// in startZoneBattle — the auto-battle button (battle.ts) reads this to
// show "예상 승률 N%" and to decide its safe/risky wording, but auto-battle
// itself is never gated by it (see battleMode below).
let winProbability: number | null = null;
// 'manual' | 'auto' — a sticky player preference, not a per-battle flag: once
// switched to 'auto' it stays 'auto' across dungeon-map navigation, subscreens,
// and separate (non-pack) encounters alike, so the player only has to turn it
// on once instead of re-enabling it every fight. goTo() stops any in-flight
// timer whenever the player leaves the battle screen (so auto-battle never
// keeps progressing off-screen) and restarts it whenever they arrive back at
// 'battle' with battleMode still 'auto' — that one spot covers a fresh
// encounter (startZoneBattle -> goTo('battle')), a 무리 continuation (which
// never even leaves the battle screen), and returning from a subscreen mid-fight.
// Never persisted (see captureSession's comment below): a reload always
// resumes into manual, so auto-battle never silently keeps running in the
// background after a refresh the player didn't expect. It's also force-reset
// to manual on death/forced-return, since those tear down the whole run.
let battleMode: 'manual' | 'auto' = 'manual';
// Pending "advance one more turn" callback for auto-battle mode. Only ever
// one in flight; startAutoBattleTurnLoop()/stopAutoBattleTurnLoop() are the
// sole writers, so there's never a need to track more than a single handle.
let autoBattleTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_BATTLE_TURN_DELAY_MS = 450;
// Why the last permadeath happened — transient, never persisted, shown
// once on the menu screen after a tax death (battle death already has its
// own on-screen banner before handleDeath() runs, so it doesn't need this).
let deathReason: 'battle' | 'tax' | null = null;
// One-shot "세금이 징수되었습니다" flash message for the village screen —
// set when a tax payment actually goes through, consumed (read once, then
// cleared) the next time the village screen renders.
let lastTaxMessage: string | null = null;
// Same one-shot pattern for "네 미궁 한정 장비가 사라졌다" — set only when
// forceReturnFromDungeon() actually removed something, independent of
// lastTaxMessage so both can show together on the same forced return.
let lastDungeonGearLossMessage: string | null = null;
// Same one-shot pattern for "미궁이 폐쇄되었다" — set on every call to
// forceReturnFromDungeon() (its only caller is the dungeon-clock timeout
// check, so every forced return is in fact a closure), independent of the
// tax/gear-loss messages so all three can show together on the same return.
let lastDungeonClosedMessage: string | null = null;

let dungeonFloor: 1 | 2 = 1;
let dungeonThemeZone: ArmZone | null = null;
let maze: DungeonMaze | null = null;
let pos: CellId | null = null;
let dungeonMessage: string | null = null;
let portalMessage: string | null = null;
let dungeonElapsedSeconds = 0;
let dungeonEntryVillageSeconds = 0;
// Player HP carried across battles for the current dungeon run (mirrors
// `maze`: non-null only while a run is active). Reset to full only on a
// brand-new dungeon entry (enterDungeon); floor transitions leave it
// untouched. Kept in sync with the live battle state in afterStateChange()
// so it's current even if a forced return interrupts a fight mid-turn.
let dungeonHp: number | null = null;
// 부위 손상(body-parts.ts)과 장비 내구도(profile.ts의
// damageEquippedGearForBodyPart)를 잇는 커서 — state.player.damagedParts는
// 전투 동안 항목만 계속 늘어나는 배열이라, 이 카운트 이후로 새로 추가된
// 항목만 골라 afterStateChange()에서 한 번씩 내구도에 반영한다. 새 전투가
// 시작될 때(startZoneBattle)는 0으로, 저장된 전투를 이어할 때
// (resumeCharacter)는 복원된 state의 현재 길이로 맞춰 — 재시작 시 이미
// 반영된 손상을 또 깎지 않는다.
let processedDamagedPartsCount = 0;
// 몬스터 무리 스폰(dungeon-clock.ts의 packSizeForDay) — 무작위 전투가
// 발동하는 순간 packSizeForDay로 정해진 마릿수를 packTotal에 담고,
// packRemaining은 "이번 전투 이후로 몇 마리가 더 남았는지"를 센다.
// 배틀 화면의 "탐험 계속하기"가 packRemaining>0이면 dungeon-map으로
// 돌아가는 대신 같은 구역에서 다음 전투를 바로 연다(startZoneBattle).
// 함정 기습처럼 몬스터가 특정 개체로 강제되는 조우는 무리 취급하지
// 않는다(packTotal=1). 강제 귀환/사망/층 이동 시 둘 다 초기화됨.
let packTotal = 1;
let packRemaining = 0;
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
    const taxDeathNotice = deathReason === 'tax';
    deathReason = null;
    renderMenu(app, authUser, hasCharacter, taxDeathNotice, {
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
        goTo(race.id === 'barbarian' && !profile.hasCompletedComingOfAge ? 'ritual' : 'village');
      },
      onBack: () => goTo('menu'),
    });
    return;
  }

  if (screen === 'ritual') {
    renderRitual(app, {
      onSelectWeapon: (weaponId) => {
        profile = completeComingOfAge(profile, weaponId);
        goTo('village');
      },
    });
    return;
  }

  if (screen === 'village') {
    const taxMessage = lastTaxMessage;
    lastTaxMessage = null;
    const gearLossMessage = lastDungeonGearLossMessage;
    lastDungeonGearLossMessage = null;
    const dungeonClosedMessage = lastDungeonClosedMessage;
    lastDungeonClosedMessage = null;
    renderVillage(
      app,
      profile.raceId != null,
      profile.hasVisitedDungeonExchange,
      dungeonClosedMessage,
      taxMessage,
      gearLossMessage,
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
        onOpenExchange: () => goTo('exchange'),
        onQuitToMenu: () => goTo('menu'),
        onSetSpeed: (speed) => {
          profile = { ...profile, clockSpeed: speed };
          persistProfile();
          render();
        },
        onSkip: () => {
          if (advanceProfileVillageTime(nextJudgmentPointSeconds(profile.villageElapsedSeconds))) return;
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
    renderShop(app, profile, {
      onBack: () => goTo('village'),
      onBuyPocketWatch: () => {
        profile = buyPocketWatch(profile);
        persistProfile();
        render();
      },
      onBuyBandage: () => {
        profile = buyConsumable(profile, 'bandage');
        persistProfile();
        render();
      },
    });
    return;
  }

  if (screen === 'exchange') {
    renderExchange(app, profile, {
      onBack: () => goTo('village'),
      onExchangeGrade: (grade: MonsterGrade) => {
        profile = exchangeManaStonesForGrade(profile, grade);
        persistProfile();
        render();
      },
    });
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
    const baseFloorLabel = dungeonFloor === 1 ? '미궁 1층' : `${zoneLabel(dungeonThemeZone!)} 미궁 2층`;
    // 무리 조우일 때만 진행률을 덧붙인다(packTotal===1이면 평범한 1:1 전투).
    const floorLabel = packTotal > 1 ? `${baseFloorLabel} · 무리 ${packTotal - packRemaining}/${packTotal}` : baseFloorLabel;
    renderBattle(
      app,
      state,
      floorLabel,
      dungeonClockLabel,
      battleMode,
      winProbability,
      expResult,
      { pending: pendingEssence, outcome: essenceOutcome },
      consumableCount(profile, 'bandage'),
      currentMonster ? huntingProficiencyLabel(monsterKillCount(profile, currentMonster.id)) : null,
      {
        onPlayCard: (cardId) => {
          if (battleMode !== 'manual') return;
          state = playCard(state!, cardId);
          afterStateChange();
        },
        onEndTurn: () => {
          if (battleMode !== 'manual') return;
          state = endTurn(state!);
          afterStateChange();
        },
        onSwitchToAuto: () => {
          battleMode = 'auto';
          render();
          startAutoBattleTurnLoop();
        },
        onSwitchToManual: () => {
          battleMode = 'manual';
          stopAutoBattleTurnLoop();
          render();
        },
        onContinue: () => {
          // 무리가 아직 남아있으면 지도로 돌아가지 않고 같은 구역에서 바로
          // 다음 전투를 연다 — "무리 자체는 개별적으로 쉽고, 반복되는
          // 소모전이 진짜 위협"이라는 설계 의도(designnotes.md 3-1번)대로
          // 도중에 쉴 틈 없이 이어지는 게 핵심이라 안전한 이동 취급을 하지
          // 않는다(applyOutOfCombatRegen 미적용).
          if (packRemaining > 0 && maze && pos) {
            packRemaining -= 1;
            startZoneBattle(cellAt(maze, pos).zone);
            return;
          }
          dungeonMessage = '전투에서 승리했다.';
          goTo('dungeon-map');
        },
        onAcknowledgeDeath: () => handleDeath('battle'),
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
        onUseBandage: () => {
          if (!state || consumableCount(profile, 'bandage') <= 0 || !hasBleed(state.player)) return;
          profile = consumeItem(profile, 'bandage');
          state = {
            ...state,
            player: { ...state.player, statusEffects: removeStatusEffect(state.player.statusEffects, 'bleed') },
            log: [...state.log, { turn: state.turn, actor: 'player', message: '붕대를 사용해 출혈을 멎게 했다.' }],
          };
          persistProfile();
          render();
        },
      }
    );
  }
}

function openSubScreen(next: Screen) {
  returnScreen = screen;
  goTo(next);
}

function afterStateChange() {
  // Keep the run's carried HP current as the fight progresses, not just at
  // its end, so an interrupting forced return (which can fire mid-turn)
  // captures the right value.
  if (state) dungeonHp = state.player.hp;
  applyNewBodyPartDurabilityLoss();
  checkForAchievements();
  checkForExp();
  checkForDrop();
  persistProfile();
  render();
}

// state.player.damagedParts(body-parts.ts)는 전투 동안 항목만 늘어나는
// 배열이라, processedDamagedPartsCount 이후로 새로 추가된 부위만 골라
// 장비 내구도(profile.ts의 damageEquippedGearForBodyPart)에 반영한다.
// 장비가 이번 호출로 완전히 파괴됐을 때만 전투 로그에 한 줄 덧붙인다 —
// afterStateChange()가 매 턴 호출되므로 여기서 커서를 갱신해두지 않으면
// 같은 손상을 다음 호출에서 또 반영해버린다.
function applyNewBodyPartDurabilityLoss() {
  if (!state) return;
  const damagedParts = state.player.damagedParts;
  if (damagedParts.length <= processedDamagedPartsCount) return;

  const newParts = damagedParts.slice(processedDamagedPartsCount);
  processedDamagedPartsCount = damagedParts.length;

  for (const part of newParts) {
    const result = damageEquippedGearForBodyPart(profile, part);
    profile = result.profile;
    if (result.message && state) {
      state = { ...state, log: [...state.log, { turn: state.turn, actor: 'player', message: result.message }] };
    }
  }
}

function goTo(next: Screen) {
  // Centralized so every way of leaving the battle screen (winning,
  // acknowledging death, opening a subscreen, a forced return interrupting
  // mid-fight, ...) reliably stops any in-flight auto-battle turn — a single
  // check here instead of one at each individual exit path. battleMode itself
  // is left untouched (it's a sticky preference — see its declaration), so
  // the timer just pauses while off the battle screen instead of the mode
  // silently flipping back to manual.
  if (screen === 'battle' && next !== 'battle') {
    stopAutoBattleTurnLoop();
  }
  screen = next;
  persistProfile();
  render();
  // Arriving at (or back at) the battle screen with auto-battle still the
  // active preference resumes the loop — covers a fresh encounter, a 무리
  // continuation, and returning from a subscreen mid-fight, all in one place.
  if (next === 'battle' && battleMode === 'auto') {
    startAutoBattleTurnLoop();
  }
}

// Schedules the next automatic turn (see AUTO_BATTLE_TURN_DELAY_MS) while
// battleMode is 'auto' and the battle is still playing; self-terminates
// once the fight ends (win/lose) or the player switches back to manual, so
// callers never need to explicitly stop it except via stopAutoBattleTurnLoop
// (switching to manual, or leaving the battle screen — see goTo above).
function startAutoBattleTurnLoop() {
  stopAutoBattleTurnLoop();
  if (battleMode !== 'auto' || !state || state.status !== 'playing') return;
  autoBattleTimer = setTimeout(() => {
    autoBattleTimer = null;
    if (battleMode !== 'auto' || !state || state.status !== 'playing') return;
    state = autoPlayOneTurn(state);
    afterStateChange();
    startAutoBattleTurnLoop();
  }, AUTO_BATTLE_TURN_DELAY_MS);
}

function stopAutoBattleTurnLoop() {
  if (autoBattleTimer !== null) {
    clearTimeout(autoBattleTimer);
    autoBattleTimer = null;
  }
}

function enterDungeon() {
  dungeonFloor = 1;
  dungeonThemeZone = null;
  maze = generateMaze(null, true);
  dungeonElapsedSeconds = 0;
  floor1Maze = null;
  floor1Pos = null;
  floor2Zones = {};
  packTotal = 1;
  packRemaining = 0;
  // Brand-new dungeon entry is the only place HP resets to full — floor
  // transitions and backtracking leave whatever's left in dungeonHp alone.
  dungeonHp = selectedRace ? computeTotalStats(selectedRace.stats, profile.essences, profile.equippedGear, profile.achievementStatBonus).maxHp : null;
  arriveAt(randomStartPosition(), BASE_BATTLE_CHANCE, '미궁에 들어섰다. 주변을 살핀다.');
}

// Time's up: the dungeon closes around the player regardless of what
// they're doing — "전투 중이라도 즉시 강제귀환, 유예 없음". Progress earned
// so far (profile: level/exp/essences/mana stones/permanent gear) is kept;
// this isn't a loss, just an abrupt, involuntary end to the run, unlike
// death. Non-permanent gear (ordinary monster drops — see isPermanent in
// gear.ts) does NOT survive the trip back: it's dungeon-only by design and
// gets stripped below, the one point where a visit truly ends.
// Village time is set to "그날 정오" (entry's 00:00 + 12h) regardless of how
// many in-dungeon days actually passed, per spec — not the same kind of
// exit exitDungeonToMenu used to be (that was a player-triggered escape
// hatch and was removed entirely to close the portal-farming exploit; this
// only ever fires automatically from the time system, never on demand).
function forceReturnFromDungeon() {
  const prevElapsed = profile.villageElapsedSeconds;
  const newElapsed = villageNoonAfterForcedReturn(dungeonEntryVillageSeconds);

  lastDungeonClosedMessage = '미궁이 폐쇄되어 마을로 강제 귀환했다.';

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
  dungeonHp = null;
  currentMonster = null;
  winProbability = null;
  battleMode = 'manual';
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  dungeonEntryVillageSeconds = 0;
  packTotal = 1;
  packRemaining = 0;

  // villageElapsedSeconds is frozen for the entire dungeon visit and then
  // jumps straight from prevElapsed to newElapsed here — a normal tick-based
  // crossing check never runs across that gap. Checking tax here too is
  // what stops "just stay in the dungeon" from dodging it indefinitely:
  // this only ever delays settlement until the player is forced back out,
  // never skips it (see crossedTaxYear/applyAnnualTaxIfCrossed).
  const taxOutcome = applyAnnualTaxIfCrossed(profile, prevElapsed, newElapsed);
  if (taxOutcome.died) {
    handleDeath('tax');
    return;
  }
  const gearOutcome = stripDungeonOnlyGear(taxOutcome.profile);
  profile = { ...gearOutcome.profile, villageElapsedSeconds: newElapsed, hasVisitedDungeonExchange: true };
  if (taxOutcome.taxedYear !== null) {
    lastTaxMessage = `${taxOutcome.taxedYear + 2}년차 세금 ${ANNUAL_TAX_AMOUNT.toLocaleString()}스톤이 징수되었습니다. (잔액: ${profile.gold.toLocaleString()}스톤)`;
  }
  if (gearOutcome.removedCount > 0) {
    lastDungeonGearLossMessage = '미궁에서 얻은 장비는 미궁 밖에서는 사용할 수 없어 사라졌다.';
  }
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
  packTotal = 1;
  packRemaining = 0;

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
  packTotal = 1;
  packRemaining = 0;
  goTo('dungeon-map');
}

// 고블린 덫이 감지된 칸으로 이동하면 선택의 여지 없이 그 자리에 숨어있던
// 고블린에게 기습당한다(battleChance=1로 항상 전투, ambush=true로 1턴
// 기절 선적용, 몬스터는 'goblin'으로 강제). 뻔히 보이는 덫을 일부러 밟는
// 선택지는 제거됨(설계 논의 참고) — 덫이 있다는 건 곧 거기 고블린이 있다는
// 뜻이라, 그 방향으로 가지 않는 것 자체가 유일한 회피 수단이다. 이 전투를
// 이기면 resolveTrap()이 그 칸의 덫을 지워 다음부터는 안전해진다.
function handleMove(move: DungeonMove) {
  if (move.trapChoice === 'ambush') {
    if (maze) resolveTrap(maze, move.next);
    arriveAt(move.next, 1, '조용히 이동했다.', { forcedMonsterId: 'goblin', ambush: true });
    return;
  }
  arriveAt(move.next, move.battleChance, '조용히 이동했다.');
}

// 전투로 이어지지 않은 이동(안전한 이동/포탈 도달)에서만 호출 — 전투로
// 이어지면 그 전투 자체의 라운드별 재생(engine.ts)이 대신 적용된다.
function applyOutOfCombatRegen() {
  if (!selectedRace || dungeonHp === null) return;
  const totalStats = computeTotalStats(selectedRace.stats, profile.essences, profile.equippedGear, profile.achievementStatBonus);
  const healed = Math.round(totalStats.maxHp * ((totalStats.willpower * OUT_OF_COMBAT_REGEN_COEF) / 100));
  if (healed <= 0) return;
  dungeonHp = Math.min(totalStats.maxHp, dungeonHp + healed);
}

// Shared by both entering a fresh maze and moving within one, so the very
// first placement in a dungeon rolls for a battle just like any other step.
function arriveAt(id: CellId, battleChance: number, safeMessage: string, options?: { forcedMonsterId?: string; ambush?: boolean }) {
  if (!maze) return;
  pos = id;
  const cell = cellAt(maze, id);

  if (cell.portal) {
    applyOutOfCombatRegen();
    handlePortalArrival(cell);
    goTo('dungeon-map');
    return;
  }

  portalMessage = null;
  if (rollBattle(battleChance)) {
    const forcedMonsterId = options?.forcedMonsterId;
    const ambush = options?.ambush ?? false;
    // 몬스터가 특정 개체로 강제된 조우(함정 기습)는 무리로 취급하지 않는다
    // — 무리는 무작위 조우에만 적용된다.
    packTotal = forcedMonsterId ? 1 : packSizeForDay(dungeonFloor, dungeonElapsedSeconds);
    packRemaining = packTotal - 1;
    startZoneBattle(cell.zone, { forcedMonsterId, ambush });
  } else {
    applyOutOfCombatRegen();
    dungeonMessage = safeMessage;
    goTo('dungeon-map');
  }
}

// Rewards only the very first portal opened in this floor's maze, regardless
// of direction — "누가 이 층에서 제일 먼저 포탈에 도달했는가"에는 층당 답이
// 하나뿐이어야 한다 (지금은 싱글플레이라 항상 본인이지만, 이 "층당 유일한
// 보상" 규칙 자체는 지금부터 정확히 지켜져야 함). portalsFound는 그대로
// 방향별 방문 기록으로 계속 채워지지만(이 함수 밖에서 쓰이는 곳은 없고
// 순수 기록용), 보상 지급 여부는 "이 미로에서 어떤 방향이든 이미 하나라도
// 열렸는가"(portalsFound.size, 추가 직전에 확인)로만 판단한다. 층간 역행은
// 같은 DungeonMaze 인스턴스(따라서 같은 portalsFound)를 재사용하므로
// 별도 처리 없이 자연히 중복 지급이 막히고, 새 미궁 진입은 generateMaze()가
// 매번 빈 Set을 새로 만들어주므로 마찬가지로 자연히 초기화된다.
function handlePortalArrival(cell: DungeonCell) {
  dungeonMessage = null;
  if (!maze || !cell.portal) return;

  const alreadyRewardedThisFloor = maze.portalsFound.size > 0;
  maze.portalsFound.add(cell.portal);

  if (!alreadyRewardedThisFloor) {
    const result = addExp(profile, PORTAL_EXP_BONUS);
    profile = result.profile;
    persistProfile();
    portalMessage = `경험치 +${PORTAL_EXP_BONUS} 획득!${result.leveledUp ? ' 레벨 업!' : ''}`;
  } else {
    portalMessage = null;
  }
}

function startZoneBattle(zone: Zone, options?: { forcedMonsterId?: string; ambush?: boolean }) {
  if (!selectedRace) return;
  currentMonster = options?.forcedMonsterId ? getMonsterById(options.forcedMonsterId) : pickMonsterForFloorAndZone(dungeonFloor, zone);
  const bonusCards = essenceSkillCards(profile.essences);
  const baseStats = computeTotalStats(selectedRace.stats, profile.essences, profile.equippedGear, profile.achievementStatBonus);
  // 사냥 숙련도(designnotes.md 3-1번, hunting-proficiency.ts) — 이 몬스터
  // 상대로만 적용되는 보너스라 computeTotalStats(범용 스탯)에는 넣지 않고,
  // 전투 시작 시점에 이 몬스터 한정으로 한 겹 더 얹는다.
  const totalStats = applyStatBonuses(baseStats, [{ statBonus: huntingProficiencyBonus(monsterKillCount(profile, currentMonster.id)) }]);
  // Carry HP left over from the previous battle in this run (clamped inside
  // initGame against the just-recomputed maxHp, in case gear/essences
  // changed mid-run); a brand-new run has no carried HP yet, so fall back to
  // full via undefined.
  const startingHp = dungeonHp ?? undefined;
  const ambush = options?.ambush ?? false;
  state = initGame(totalStats, currentMonster, bonusCards, startingHp, [], ambush);
  dungeonHp = state.player.hp;
  processedDamagedPartsCount = 0;
  winProbability = estimateWinProbability(totalStats, bonusCards, currentMonster, startingHp, [], ambush);
  // battleMode is deliberately left as-is here — it's a sticky preference
  // (see its declaration comment), and goTo('battle') below restarts the
  // auto-battle loop for this new monster's state if 'auto' is still active.
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  goTo('battle');
}

// Death is permanent regardless of cause (battle loss or unpaid annual
// tax): the whole save (level, inventory, essences, gear, discovered codex,
// resume session — everything) resets, matching the roguelike death rule.
// All cleanup happens before goTo('menu') so its built-in persistProfile()
// call captures the already-reset state instead of resurrecting whatever
// was in progress. `reason` only drives which one-shot message the player
// sees afterward (see `deathReason`) — battle deaths already show their own
// banner on the battle screen before this runs, so menu.ts only surfaces
// the reason for 'tax'.
function handleDeath(reason: 'battle' | 'tax') {
  deathReason = reason;
  profile = resetProfile();
  selectedRace = null;
  currentMonster = null;
  state = null;
  dungeonHp = null;
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
  winProbability = null;
  battleMode = 'manual';
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  packTotal = 1;
  packRemaining = 0;
  goTo('menu');
}

// HP-crisis achievements: checked on every state change regardless of
// win/lose/still-playing, since the condition is "HP dropped to X% at some
// point during the fight," not "you won after it happened." Both can grant
// independently in the same battle (0.1% implies 2% was also crossed) — a
// deliberate design choice, not an oversight. Uses state.lowestPlayerHpRatio
// (engine.ts) rather than the live current HP so a mid-turn dip that got
// healed before this function runs is still caught.
function checkForAchievements() {
  if (!state) return;
  const lowest = state.lowestPlayerHpRatio;
  const grants: string[] = [];
  let bonus = profile.achievementStatBonus;

  if (lowest <= 0.001 && !profile.achievementHp01PctGranted) {
    profile = { ...profile, achievementHp01PctGranted: true };
    bonus = { ...bonus, mind: (bonus.mind ?? 0) + 3 };
    grants.push('업적 달성: 사경을 헤매다 (생명력 0.1% 이하) — 정신 영구 +3!');
  }
  if (lowest <= 0.02 && !profile.achievementHp2PctGranted) {
    profile = { ...profile, achievementHp2PctGranted: true };
    bonus = { ...bonus, mind: (bonus.mind ?? 0) + 1 };
    grants.push('업적 달성: 위기 극복 (생명력 2% 이하) — 정신 영구 +1!');
  }
  if (grants.length === 0) return;

  profile = { ...profile, achievementStatBonus: bonus };
  state = { ...state, log: [...state.log, ...grants.map((message) => ({ turn: state!.turn, actor: 'player' as const, message }))] };
}

function checkForExp() {
  if (!state || !currentMonster || state.status !== 'win' || expChecked) return;
  expChecked = true;
  // "생애 첫 처치" 업적: defeatedMonsterNames가 비어있는 상태에서 벌어지는
  // 다음 성공 처치가 정확히 그 첫 처치다(3번 조사 결과 참고) — 별도 플래그
  // 없이 이 길이 자체가 유일하게 정확한 시점을 알려준다.
  const wasBeforeFirstKill = profile.defeatedMonsterNames.length === 0;
  expResult = grantExpForKill(profile, currentMonster);
  profile = expResult.profile;
  if (wasBeforeFirstKill && !expResult.alreadyDefeated) {
    profile = {
      ...profile,
      achievementStatBonus: { ...profile.achievementStatBonus, mind: (profile.achievementStatBonus.mind ?? 0) + 1 },
    };
    state = { ...state, log: [...state.log, { turn: state.turn, actor: 'player', message: '업적 달성: 첫 사냥 — 정신 영구 +1!' }] };
  }

  // 사냥 숙련도(hunting-proficiency.ts) — exp와 달리 alreadyDefeated 여부와
  // 무관하게 이 몬스터를 잡을 때마다 누적된다. checkForExp가 이미 "이번
  // 승리를 정확히 한 번만 반영"하는 시점(expChecked 가드)이라, 별도의
  // session-persisted 플래그 없이 여기서 함께 처리한다.
  const beforeTier = huntingProficiencyTier(monsterKillCount(profile, currentMonster.id));
  profile = recordMonsterKill(profile, currentMonster.id);
  const afterTier = huntingProficiencyTier(monsterKillCount(profile, currentMonster.id));
  if (afterTier > beforeTier) {
    state = {
      ...state,
      log: [...state.log, { turn: state.turn, actor: 'player', message: `${currentMonster.name} 사냥 숙련도가 올랐다! (Lv.${afterTier})` }],
    };
  }

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
    case 'ritual':
    case 'village':
    case 'stats':
    case 'dungeon-map':
    case 'battle':
    case 'inventory':
    case 'equipment':
    case 'essence':
    case 'shop':
    case 'library':
    case 'exchange':
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
    dungeonHp,
    winProbability,
    expResult,
    expChecked,
    dropChecked,
    pendingEssence,
    essenceOutcome,
    packTotal,
    packRemaining,
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
    processedDamagedPartsCount = state?.player.damagedParts.length ?? 0;
    dungeonHp = session.dungeonHp;
    winProbability = session.winProbability;
    // battleMode is intentionally not restored from the session — resuming
    // always starts in manual, per design (see battleMode's declaration).
    battleMode = 'manual';
    expResult = session.expResult;
    expChecked = session.expChecked;
    dropChecked = session.dropChecked;
    pendingEssence = session.pendingEssence;
    essenceOutcome = session.essenceOutcome;
    packTotal = session.packTotal;
    packRemaining = session.packRemaining;
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
// 00:00 boundary. Shared by the tick (gradual advance) and the skip button
// (jumps straight to the next boundary) so both go through the same
// crossing-detection logic instead of duplicating it.
// Returns true if this advance triggered a tax death (profile has already
// been reset and the screen already moved to 'menu' — callers should stop
// immediately rather than proceeding to persist/render whatever they had
// queued next).
function advanceProfileVillageTime(newElapsed: number): boolean {
  const prevElapsed = profile.villageElapsedSeconds;

  // Tax is settled before the judgment-cycle check below, using the same
  // prevElapsed -> newElapsed span: on the (regularly recurring, every 12th
  // cycle) day both a tax-year boundary and a judgment boundary fall on,
  // tax resolves first — if it kills the character there is no save left
  // for a judgment window to open on.
  const taxOutcome = applyAnnualTaxIfCrossed(profile, prevElapsed, newElapsed);
  if (taxOutcome.died) {
    handleDeath('tax');
    return true;
  }
  profile = taxOutcome.profile;
  if (taxOutcome.taxedYear !== null) {
    lastTaxMessage = `${taxOutcome.taxedYear + 2}년차 세금 ${ANNUAL_TAX_AMOUNT.toLocaleString()}스톤이 징수되었습니다. (잔액: ${profile.gold.toLocaleString()}스톤)`;
  }

  const crossedCycle = crossedJudgmentCycle(profile.villageElapsedSeconds, newElapsed, profile.lastAnsweredCycle);
  profile =
    crossedCycle !== null
      ? // Snap to the cycle's exact 00:00 boundary rather than `newElapsed`
        // (which may have overshot it within this tick) — the judgment
        // window is meant to freeze the display at exactly 00:00 from the
        // moment it opens, not just once tickGameClock's pending-judgment
        // branch takes over on the next tick.
        {
          ...profile,
          villageElapsedSeconds: judgmentBoundarySeconds(crossedCycle),
          pendingJudgmentCycle: crossedCycle,
          pendingJudgmentRemainingSeconds: JUDGMENT_COUNTDOWN_SECONDS,
        }
      : { ...profile, villageElapsedSeconds: newElapsed };
  return false;
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

  if (profile.pendingJudgmentRemainingSeconds !== null) {
    // The village clock is frozen at this cycle's 00:00 boundary for the
    // whole decision window ("멈춘 시간" — the player hasn't answered yet,
    // so no game time passes). Only the 30-second decision countdown itself
    // moves, and it's real time, not scaled by clockSpeed — it's decision
    // pressure on the player, not game time.
    const boundary =
      profile.pendingJudgmentCycle !== null ? judgmentBoundarySeconds(profile.pendingJudgmentCycle) : profile.villageElapsedSeconds;
    const remaining = profile.pendingJudgmentRemainingSeconds - realDeltaSeconds;
    profile =
      remaining <= 0
        ? { ...profile, villageElapsedSeconds: boundary, lastAnsweredCycle: profile.pendingJudgmentCycle, pendingJudgmentCycle: null, pendingJudgmentRemainingSeconds: null }
        : { ...profile, villageElapsedSeconds: boundary, pendingJudgmentRemainingSeconds: remaining };
  } else {
    const newElapsed = advanceVillageClock(profile.villageElapsedSeconds, realDeltaSeconds, profile.clockSpeed);
    if (advanceProfileVillageTime(newElapsed)) return;
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
