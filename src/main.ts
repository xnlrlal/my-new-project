import './style.css';
import type { GameState } from './engine/types';
import type { RaceDef } from './engine/races';
import type { MonsterDef } from './engine/monsters';
import { pickMonsterForFloorAndZone, rollEssenceDrop, rollManaStoneDrop } from './engine/monsters';
import { initGame, playCard, endTurn } from './engine/engine';
import {
  loadProfile,
  saveProfile,
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
import { rollGearDrop, createGearFromMonster, type EquipmentSlot } from './engine/gear';
import {
  generateMaze,
  randomStartPosition,
  cellAt,
  availableMoves,
  rollBattle,
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
import { renderStats } from './ui/stats';
import { renderBattle } from './ui/battle';
import { renderInventory } from './ui/inventory';
import { renderEquipment } from './ui/equipment';
import { renderEssenceScreen } from './ui/essence';
import { renderDungeonMap } from './ui/dungeon-map';

type Screen = 'menu' | 'character-select' | 'stats' | 'dungeon-map' | 'battle' | 'inventory' | 'equipment' | 'essence';

const PORTAL_EXP_BONUS = 2;

const app = document.querySelector<HTMLDivElement>('#app')!;

let screen: Screen = 'menu';
let profile: PlayerProfile = loadProfile();
let selectedRace: RaceDef | null = null;
let currentMonster: MonsterDef | null = null;
let state: GameState | null = null;
let expResult: ExpGrantResult | null = null;
let expChecked = false;
let dropChecked = false;
let pendingEssence: EquippedEssence | null = null;
let essenceOutcome: string | null = null;
let returnScreen: Screen = 'stats';

let dungeonFloor: 1 | 2 = 1;
let dungeonThemeZone: ArmZone | null = null;
let maze: DungeonMaze | null = null;
let pos: CellId | null = null;
let dungeonMessage: string | null = null;
let portalMessage: string | null = null;

function render() {
  if (screen === 'menu') {
    renderMenu(app, { onStart: () => goTo('character-select') });
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
        saveProfile(profile);
        render();
      },
      onUnequip: (slot: EquipmentSlot) => {
        profile = unequipGear(profile, slot);
        saveProfile(profile);
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
        goTo('stats');
      },
      onBack: () => goTo('menu'),
    });
    return;
  }

  if (screen === 'stats' && selectedRace) {
    renderStats(app, selectedRace, profile, {
      onStartBattle: enterDungeon,
      onBack: () => goTo('character-select'),
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
      onExitToMenu: exitDungeonToMenu,
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
        onContinue: () => {
          if (state?.status === 'win') {
            dungeonMessage = '전투에서 승리했다.';
            goTo('dungeon-map');
          } else if (maze && pos) {
            startZoneBattle(cellAt(maze, pos).zone);
          }
        },
        onExitToMenu: exitDungeonToMenu,
        onAbsorbEssence: () => {
          if (!pendingEssence) return;
          if (hasOpenEssenceSlot(profile)) {
            profile = absorbEssence(profile, pendingEssence);
            saveProfile(profile);
            essenceOutcome = `${pendingEssence.monsterName}의 정수를 흡수했습니다!`;
          } else {
            essenceOutcome = '장착 슬롯이 가득 차 흡수할 수 없었습니다.';
          }
          pendingEssence = null;
          render();
        },
        onDiscardEssence: () => {
          essenceOutcome = '정수를 버렸습니다.';
          pendingEssence = null;
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
  render();
}

function goTo(next: Screen) {
  screen = next;
  render();
}

function exitDungeonToMenu() {
  dungeonFloor = 1;
  dungeonThemeZone = null;
  maze = null;
  pos = null;
  goTo('menu');
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
    saveProfile(profile);
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
  expResult = null;
  expChecked = false;
  dropChecked = false;
  pendingEssence = null;
  essenceOutcome = null;
  goTo('battle');
}

function checkForExp() {
  if (!state || !currentMonster || state.status !== 'win' || expChecked) return;
  expChecked = true;
  expResult = grantExpForKill(profile, currentMonster);
  profile = expResult.profile;
  saveProfile(profile);
}

function checkForDrop() {
  if (!state || !currentMonster || state.status !== 'win' || dropChecked) return;
  dropChecked = true;

  if (rollManaStoneDrop()) {
    profile = addManaStone(profile, currentMonster.grade);
    saveProfile(profile);
  }

  if (rollGearDrop()) {
    profile = addGearToInventory(profile, createGearFromMonster(currentMonster.id, currentMonster.gearDrop));
    saveProfile(profile);
  }

  if (rollEssenceDrop()) {
    pendingEssence = createEssenceFromMonster(currentMonster);
    profile = recordEssenceDiscovery(profile, currentMonster.id);
    saveProfile(profile);
  }
}

render();
