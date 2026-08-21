import type { Actor, ActorId, Card, GameState, LogEntry } from './types';
import { buildDeck } from './cards';
import type { RaceStats } from './races';
import type { MonsterDef } from './monsters';

const HAND_SIZE = 4;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function drawCards(actor: Actor, count: number): Actor {
  let deck = actor.deck;
  let discard = actor.discard;
  const hand = [...actor.hand];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = shuffle(discard);
      discard = [];
    }
    const [card, ...rest] = deck;
    hand.push(card);
    deck = rest;
  }

  return { ...actor, hand, deck, discard };
}

function createActor(
  id: ActorId,
  name: string,
  stats: { maxHp: number; maxMana: number; attackBonus: number; defenseBonus: number },
  bonusCards: Card[] = []
): Actor {
  const base: Actor = {
    id,
    name,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    shield: 0,
    mana: stats.maxMana,
    maxMana: stats.maxMana,
    attackBonus: stats.attackBonus,
    defenseBonus: stats.defenseBonus,
    hand: [],
    deck: shuffle(buildDeck(bonusCards)),
    discard: [],
  };
  return drawCards(base, HAND_SIZE);
}

export function initGame(playerStats: RaceStats, monster: MonsterDef, bonusCards: Card[] = []): GameState {
  return {
    turn: 1,
    player: createActor('player', '플레이어', playerStats, bonusCards),
    enemy: createActor('enemy', monster.name, { maxHp: monster.maxHp, maxMana: monster.maxMana, attackBonus: 0, defenseBonus: 0 }),
    enemyGrade: monster.grade,
    log: [{ turn: 1, actor: 'player', message: `${monster.name}(을)를 만났다! 전투 시작!` }],
    status: 'playing',
  };
}

function appendLog(state: GameState, entry: Omit<LogEntry, 'turn'>): LogEntry[] {
  return [...state.log, { ...entry, turn: state.turn }];
}

function applyCard(state: GameState, source: ActorId, card: Card): GameState {
  const targetId: ActorId = card.effect === 'heal' || card.effect === 'shield' ? source : source === 'player' ? 'enemy' : 'player';
  const sourceActor = state[source];
  const targetActor = state[targetId];

  let updatedTarget: Actor = targetActor;
  let message = '';

  switch (card.effect) {
    case 'damage': {
      const totalDamage = card.value + sourceActor.attackBonus;
      const absorbed = Math.min(targetActor.shield, totalDamage);
      const remaining = totalDamage - absorbed;
      updatedTarget = {
        ...targetActor,
        shield: targetActor.shield - absorbed,
        hp: Math.max(0, targetActor.hp - remaining),
      };
      message = `${sourceActor.name}이(가) [${card.name}]로 ${targetActor.name}에게 ${totalDamage}의 피해!`;
      break;
    }
    case 'heal': {
      updatedTarget = { ...targetActor, hp: Math.min(targetActor.maxHp, targetActor.hp + card.value) };
      message = `${sourceActor.name}이(가) [${card.name}]로 체력을 ${card.value} 회복!`;
      break;
    }
    case 'shield': {
      const totalShield = card.value + sourceActor.defenseBonus;
      updatedTarget = { ...targetActor, shield: targetActor.shield + totalShield };
      message = `${sourceActor.name}이(가) [${card.name}]로 방어막 ${totalShield}을 얻음!`;
      break;
    }
  }

  const updatedSource: Actor =
    source === targetId
      ? { ...updatedTarget, mana: sourceActor.mana - card.cost, hand: sourceActor.hand.filter((c) => c.id !== card.id), discard: [...sourceActor.discard, card] }
      : { ...sourceActor, mana: sourceActor.mana - card.cost, hand: sourceActor.hand.filter((c) => c.id !== card.id), discard: [...sourceActor.discard, card] };

  const next: GameState = {
    ...state,
    [source]: updatedSource,
    [targetId]: source === targetId ? updatedSource : updatedTarget,
    log: appendLog(state, { actor: source, message }),
  };

  return checkGameOver(next);
}

export function playCard(state: GameState, cardId: string): GameState {
  if (state.status !== 'playing') return state;
  const card = state.player.hand.find((c) => c.id === cardId);
  if (!card || card.cost > state.player.mana) return state;
  return applyCard(state, 'player', card);
}

function checkGameOver(state: GameState): GameState {
  if (state.enemy.hp <= 0) return { ...state, status: 'win' };
  if (state.player.hp <= 0) return { ...state, status: 'lose' };
  return state;
}

function enemyAct(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  const playable = state.enemy.hand.filter((c) => c.cost <= state.enemy.mana);
  if (playable.length === 0) return state;
  const card = playable[Math.floor(Math.random() * playable.length)];
  return applyCard(state, 'enemy', card);
}

export function endTurn(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  let next = state;
  while (next.status === 'playing' && next.enemy.hand.some((c) => c.cost <= next.enemy.mana)) {
    const before = next;
    next = enemyAct(next);
    if (next === before) break;
  }
  if (next.status !== 'playing') return next;

  const nextTurn = next.turn + 1;
  const refreshedPlayer = drawCards({ ...next.player, mana: next.player.maxMana }, HAND_SIZE - next.player.hand.length);
  const refreshedEnemy = drawCards({ ...next.enemy, mana: next.enemy.maxMana }, HAND_SIZE - next.enemy.hand.length);

  return {
    ...next,
    turn: nextTurn,
    player: refreshedPlayer,
    enemy: refreshedEnemy,
    log: [...next.log, { turn: nextTurn, actor: 'player', message: `--- ${nextTurn}턴 시작 ---` }],
  };
}
