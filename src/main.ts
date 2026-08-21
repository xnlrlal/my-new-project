import './style.css';
import type { GameState } from './engine/types';
import type { RaceDef } from './engine/races';
import type { MonsterDef } from './engine/monsters';
import { pickMonsterForFloor, rollEssenceDrop, rollManaStoneDrop } from './engine/monsters';
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
  type PlayerProfile,
  type ExpGrantResult,
} from './engine/profile';
import { createEssenceFromMonster, essenceSkillCards, type EquippedEssence } from './engine/essence';
import { computeTotalStats } from './engine/stats-calc';
import { pickRandomGear, rollGearDrop, createGearInstance, type EquipmentSlot } from './engine/gear';
import { renderMenu } from './ui/menu';
import { renderCharacterSelect } from './ui/character-select';
import { renderStats } from './ui/stats';
import { renderBattle } from './ui/battle';
import { renderInventory } from './ui/inventory';
import { renderEquipment } from './ui/equipment';
import { renderEssenceScreen } from './ui/essence';

type Screen = 'menu' | 'character-select' | 'stats' | 'battle' | 'inventory' | 'equipment' | 'essence';

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
let dungeonFloor = 1;

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

  if (screen === 'battle' && state) {
    renderBattle(
      app,
      state,
      dungeonFloor,
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
          if (state?.status === 'win') advanceFloor();
          else retryFloor();
        },
        onExitToMenu: () => goTo('menu'),
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

function enterDungeon() {
  dungeonFloor = 1;
  startFloorBattle();
}

function advanceFloor() {
  dungeonFloor += 1;
  startFloorBattle();
}

function retryFloor() {
  startFloorBattle();
}

function startFloorBattle() {
  if (!selectedRace) return;
  currentMonster = pickMonsterForFloor(dungeonFloor);
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
    profile = addManaStone(profile);
    saveProfile(profile);
  }

  if (rollGearDrop()) {
    profile = addGearToInventory(profile, createGearInstance(pickRandomGear()));
    saveProfile(profile);
  }

  if (rollEssenceDrop()) {
    pendingEssence = createEssenceFromMonster(currentMonster);
    profile = recordEssenceDiscovery(profile, currentMonster.id);
    saveProfile(profile);
  }
}

render();
