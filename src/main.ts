import './style.css';
import type { GameState } from './engine/types';
import { initGame, playCard, endTurn } from './engine/engine';
import { renderMenu } from './ui/menu';
import { renderBattle } from './ui/battle';

type Screen = 'menu' | 'battle';

const app = document.querySelector<HTMLDivElement>('#app')!;

let screen: Screen = 'menu';
let state: GameState = initGame();

function render() {
  if (screen === 'menu') {
    renderMenu(app, { onStart: startBattle });
    return;
  }

  renderBattle(app, state, {
    onPlayCard: (cardId) => {
      state = playCard(state, cardId);
      render();
    },
    onEndTurn: () => {
      state = endTurn(state);
      render();
    },
    onExitToMenu: () => {
      screen = 'menu';
      render();
    },
  });
}

function startBattle() {
  state = initGame();
  screen = 'battle';
  render();
}

render();
