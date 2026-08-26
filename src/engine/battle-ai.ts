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
// the highest-value affordable card, otherwise end the turn). Used only by
// estimateWinProbability's simulation now — the real-time auto-battle mode
// uses autoPlayOneTurn below instead, so it can pause and render between
// turns. Left as its own step-counted loop (rather than rewritten in terms
// of autoPlayOneTurn) to avoid touching the exact behavior the 150-trial
// simulation already relies on.
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

// Plays exactly one player turn with the same greedy policy as
// autoPlayBattle (play every affordable card, highest value first, then end
// the turn once) — used by the real-time auto-battle mode so each turn can
// be rendered and the player can switch back to manual between turns.
export function autoPlayOneTurn(state: GameState): GameState {
  let next = state;
  while (next.status === 'playing') {
    const card = pickBestCard(next.player.hand, next.player.mana);
    if (!card) break;
    next = playCard(next, card.id);
  }
  if (next.status === 'playing') next = endTurn(next);
  return next;
}

export function estimateWinProbability(
  playerStats: RaceStats,
  bonusCards: Card[],
  monster: MonsterDef,
  startingHp?: number,
  // 2단계(명중/치명타 확률 판정) 도입 이후 전투 결과 분산이 커져, 150회로는
  // 승률 추정치가 흔들리기 쉬워 300회로 상향(설계 논의에서 제안된 값).
  trials = 300
): number {
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const result = autoPlayBattle(initGame(playerStats, monster, bonusCards, startingHp));
    if (result.status === 'win') wins++;
  }
  return wins / trials;
}
