import './style.css';
import type { GameState } from './engine/types';
import type { RaceDef } from './engine/races';
import type { MonsterDef } from './engine/monsters';
import { pickRandomMonster, rollEssenceDrop } from './engine/monsters';
import { initGame, playCard, endTurn } from './engine/engine';
import {
  loadProfile,
  saveProfile,
  grantExpForKill,
  absorbEssence,
  hasOpenEssenceSlot,
  type PlayerProfile,
  type ExpGrantResult,
} from './engine/profile';
import { createEssenceFromMonster, combineStats, essenceSkillCards, type EquippedEssence } from './engine/essence';
import { renderMenu } from './ui/menu';
import { renderCharacterSelect } from './ui/character-select';
import { renderStats } from './ui/stats';
import { renderBattle } from './ui/battle';
import { renderInventory } from './ui/inventory';

type Screen = 'menu' | 'character-select' | 'stats' | 'battle' | 'inventory';

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

function render() {
  if (screen === 'menu') {
    renderMenu(app, { onStart: () => goTo('character-select'), onOpenInventory: () => goTo('inventory') });
    return;
  }

  if (screen === 'inventory') {
    renderInventory(app, profile, { onBack: () => goTo('menu') });
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
      onStartBattle: startBattle,
      onBack: () => goTo('character-select'),
    });
    return;
  }

  if (screen === 'battle' && state) {
    renderBattle(
      app,
      state,
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
        onContinue: startBattle,
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
      }
    );
  }
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

function startBattle() {
  if (!selectedRace) return;
  currentMonster = pickRandomMonster();
  const bonusCards = essenceSkillCards(profile.essences);
  const totalStats = combineStats(selectedRace.stats, profile.essences);
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
  if (rollEssenceDrop()) {
    pendingEssence = createEssenceFromMonster(currentMonster);
  }
}

render();
