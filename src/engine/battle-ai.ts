import type { Card, GameState } from './types';
import type { RaceStats } from './races';
import type { MonsterDef } from './monsters';
import { initGame, playCard, endTurn } from './engine';

const MAX_AUTO_STEPS = 200;

function pickBestCard(hand: Card[], mana: number): Card | null {
  const affordable = hand.filter((c) => c.cost <= mana);
  if (affordable.length === 0) return null;
  return affordable.reduce((best, card) => (card.value > best.value ? card : best));
}

// Plays out a battle to completion using a simple greedy policy (always play
// the highest-value affordable card, otherwise end the turn). Used both to
// actually resolve a skipped battle and, via estimateWinProbability, to
// gauge how one-sided a matchup is before it starts.
export function autoPlayBattle(initial: GameState): GameState {
  let state = initial;
  let steps = 0;
  while (state.status === 'playing' && steps < MAX_AUTO_STEPS) {
    const card = pickBestCard(state.player.hand, state.player.mana);
    state = card ? playCard(state, card.id) : endTurn(state);
    steps++;
  }
  return state;
}

export function estimateWinProbability(
  playerStats: RaceStats,
  bonusCards: Card[],
  monster: MonsterDef,
  trials = 150
): number {
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const result = autoPlayBattle(initGame(playerStats, monster, bonusCards));
    if (result.status === 'win') wins++;
  }
  return wins / trials;
}
