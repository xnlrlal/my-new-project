import './style.css';
import type { GameState } from './engine/types';
import type { RaceDef } from './engine/races';
import type { MonsterDef } from './engine/monsters';
import { pickRandomMonster } from './engine/monsters';
import { initGame, playCard, endTurn } from './engine/engine';
import { loadProfile, saveProfile, grantExpForKill, type PlayerProfile, type ExpGrantResult } from './engine/profile';
import { renderMenu } from './ui/menu';
import { renderCharacterSelect } from './ui/character-select';
import { renderStats } from './ui/stats';
import { renderBattle } from './ui/battle';

type Screen = 'menu' | 'character-select' | 'stats' | 'battle';

const app = document.querySelector<HTMLDivElement>('#app')!;

let screen: Screen = 'menu';
let profile: PlayerProfile = loadProfile();
let selectedRace: RaceDef | null = null;
let currentMonster: MonsterDef | null = null;
let state: GameState | null = null;
let expResult: ExpGrantResult | null = null;

function render() {
  if (screen === 'menu') {
    renderMenu(app, { onStart: () => goTo('character-select') });
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
    renderBattle(app, state, expResult, {
      onPlayCard: (cardId) => {
        state = playCard(state!, cardId);
        checkForExp();
        render();
      },
      onEndTurn: () => {
        state = endTurn(state!);
        checkForExp();
        render();
      },
      onExitToMenu: () => goTo('menu'),
    });
  }
}

function goTo(next: Screen) {
  screen = next;
  render();
}

function startBattle() {
  if (!selectedRace) return;
  currentMonster = pickRandomMonster();
  state = initGame(selectedRace.stats, currentMonster);
  expResult = null;
  goTo('battle');
}

function checkForExp() {
  if (!state || !currentMonster || state.status !== 'win' || expResult) return;
  expResult = grantExpForKill(profile, currentMonster);
  profile = expResult.profile;
  saveProfile(profile);
}

render();
