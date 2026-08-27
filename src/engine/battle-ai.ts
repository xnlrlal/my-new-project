import type { Card, GameState, StatusEffect } from './types';
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
    const afterCard = card ? playCard(state, card.id) : state;
    // playCard no-ops (unchanged reference) when the player is stunned —
    // fall through to endTurn() instead of retrying the same no-op card
    // every step until MAX_AUTO_STEPS is exhausted.
    state = afterCard === state ? endTurn(state) : afterCard;
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
    const afterCard = playCard(next, card.id);
    // Stunned (or any other no-op) -> stop retrying and fall through to
    // endTurn() below, same reasoning as autoPlayBattle above.
    if (afterCard === next) break;
    next = afterCard;
  }
  if (next.status === 'playing') next = endTurn(next);
  return next;
}

export function estimateWinProbability(
  playerStats: RaceStats,
  bonusCards: Card[],
  monster: MonsterDef,
  startingHp?: number,
  // 고블린 덫/기습 등 전투 시작 전부터 붙어있는 상태이상을 시뮬레이션에도
  // 반영해, 그런 상황의 "예상 승률" 표시가 정직하게 낮게 나오도록 한다.
  initialStatusEffects: StatusEffect[] = [],
  ambush = false,
  // 2단계(명중/치명타 확률 판정) 도입 이후 전투 결과 분산이 커져, 150회로는
  // 승률 추정치가 흔들리기 쉬워 300회로 상향(설계 논의에서 제안된 값).
  trials = 300
): number {
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const result = autoPlayBattle(initGame(playerStats, monster, bonusCards, startingHp, initialStatusEffects, ambush));
    if (result.status === 'win') wins++;
  }
  return wins / trials;
}
