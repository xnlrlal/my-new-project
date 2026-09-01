import type { Actor, ActorId, Card, GameState, LogEntry, StatusEffect } from './types';
import { buildDeck } from './cards';
import type { RaceStats } from './races';
import type { MonsterDef } from './monsters';
import { applyStatusEffect, bleedHealMultiplier, isStunned, tickStatusEffects } from './status-effects';

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
  stats: {
    maxHp: number;
    maxMana: number;
    strength: number;
    dexterity: number;
    accuracy: number;
    flexibility: number;
    perceptionJam: number;
    obsession: number;
    poisonResist: number;
    willpower: number;
  },
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
    strength: stats.strength,
    dexterity: stats.dexterity,
    accuracy: stats.accuracy,
    flexibility: stats.flexibility,
    perceptionJam: stats.perceptionJam,
    obsession: stats.obsession,
    poisonResist: stats.poisonResist,
    willpower: stats.willpower,
    statusEffects: [],
    hand: [],
    deck: shuffle(buildDeck(bonusCards)),
    discard: [],
  };
  return drawCards(base, HAND_SIZE);
}

// startingHp lets a caller carry HP over from a previous battle in the same
// dungeon run (see dungeonHp in main.ts) instead of always beginning at full
// health. Clamped to [0, maxHp] so a stale value from before a maxHp change
// (gear/essence swapped mid-run) can never overheal or go negative. Omitted
// (or undefined) means "start at full", which is what every other caller
// (a brand-new dungeon entry, or the skip-probability simulation with no
// carried HP to pass) still gets.
// initialStatusEffects lets a caller fold in status effects the player
// already picked up outside of battle (e.g. the bleed from stepping on a
// goblin trap — see main.ts's pendingStatusEffects) so they apply from turn
// 1 of whichever real fight follows. ambush pre-applies a 1-turn stun to
// represent being caught off guard (see status-effects.ts's isStunned/
// endTurn ordering — this works correctly because the stun is present in
// the very first GameState, before any playCard/endTurn call ever runs).
export function initGame(
  playerStats: RaceStats,
  monster: MonsterDef,
  bonusCards: Card[] = [],
  startingHp?: number,
  initialStatusEffects: StatusEffect[] = [],
  ambush = false
): GameState {
  const player = createActor('player', '플레이어', playerStats, bonusCards);
  const hp = startingHp === undefined ? player.maxHp : Math.min(Math.max(0, startingHp), player.maxHp);
  const statusEffects = ambush ? applyStatusEffect(initialStatusEffects, 'stun', 1) : initialStatusEffects;
  return {
    turn: 1,
    player: { ...player, hp, statusEffects },
    // A dungeon-carried-over low HP counts as already having been "at that
    // level during this battle" — the player is genuinely at risk from the
    // first card played, not just from damage dealt after this point.
    lowestPlayerHpRatio: hp / player.maxHp,
    enemy: createActor('enemy', monster.name, {
      maxHp: monster.maxHp,
      maxMana: monster.maxMana,
      strength: 0,
      dexterity: 0,
      // 몬스터는 아직 명중/치명타 관련 세부스탯 데이터가 없음(MonsterDef에
      // 필드 자체가 없음) — 근력과 동일하게 0 고정. 향후 밸런스 패스에서
      // 몬스터별 데이터를 부여할 때 여기 하드코딩을 대체하면 됨.
      accuracy: 0,
      flexibility: 0,
      perceptionJam: 0,
      obsession: 0,
      poisonResist: 0,
      willpower: 0,
    }),
    enemyGrade: monster.grade,
    log: [{ turn: 1, actor: 'player', message: `${monster.name}(을)를 만났다! 전투 시작!` }],
    status: 'playing',
  };
}

function appendLog(state: GameState, entry: Omit<LogEntry, 'turn'>): LogEntry[] {
  return [...state.log, { ...entry, turn: state.turn }];
}

// 2단계: 데미지 카드에 명중→치명타 판정 레이어를 얹는다. 카드 코스트/마나
// 게이팅(playCard/enemyAct의 cost <= mana 체크)은 이 레이어와 무관하게
// applyCard 바깥(호출부)에서 그대로 유지된다 — 미스여도 카드는 정상 소비됨
// (핸드→디스카드 이동, 코스트 차감은 applyCard 하단에서 공통 처리).
const BASE_HIT_CHANCE = 90;
const HIT_CHANCE_MIN = 20;
const HIT_CHANCE_MAX = 99;
const ACCURACY_HIT_COEF = 2; // 명중률 1당 명중 확률 +2%p
const FLEXIBILITY_EVADE_COEF = 2; // 유연성 1당 상대 명중 확률 -2%p
const PERCEPTION_JAM_COEF = 1.5; // 인식방해 1당 상대 명중 확률 -1.5%p

const BASE_CRIT_CHANCE = 5;
const FLEXIBILITY_CRIT_COEF = 1; // 유연성 1당 치명타 확률 +1%p

const BASE_CRIT_MULTIPLIER = 1.5;
const OBSESSION_CRIT_COEF = 0.02; // 집착 1당 치명타 배율 +0.02
const MAX_CRIT_MULTIPLIER = 2;

// 3단계: 명중/치명타 판정을 통과한 피해에 방어력 경감을 얹는다. 손재주는
// 기존 방어막 카드 보정과 별개로, 카드를 쓰지 않아도 매번 적용되는 상시
// 방어를 제공한다 — 방어막(shield)은 이 경감이 끝난 뒤의 최종 피해를
// 흡수하는 순서(먼저 %로 깎고, 남은 값을 shield가 흡수)로 처리된다.
const DEXTERITY_DEFENSE_COEF = 2; // 손재주 1당 상시 피해 감소 -2%p
const MAX_DEFENSE_REDUCTION = 60; // 최대 60%까지만 경감 — 완전 무적 방지(명중/치명타 캡과 같은 원칙)

function defenseReduction(defender: Actor): number {
  return clampPercent(defender.dexterity * DEXTERITY_DEFENSE_COEF, 0, MAX_DEFENSE_REDUCTION);
}

// 인내심을 자연재생력으로 삼아, 매 라운드 종료 시 최대체력의 일정 %를
// 회복시킨다 — 전투 사이에 회복 수단이 사실상 없어 체력이 그대로 누적
// 소모되던 문제(설계 논의 참고)를 완화하기 위한 축. 인내심이 0인 몬스터는
// (아직 세부스탯이 없어 전원 0 고정) 지금은 영향받지 않는다.
const WILLPOWER_REGEN_COEF = 0.5; // 인내심 1당 라운드 종료 시 최대체력의 +0.5%

function applyRegenTick(actor: Actor): { actor: Actor; healed: number } {
  const healed = Math.round(actor.maxHp * ((actor.willpower * WILLPOWER_REGEN_COEF) / 100));
  if (healed <= 0 || actor.hp >= actor.maxHp) return { actor, healed: 0 };
  const cappedHeal = Math.min(healed, actor.maxHp - actor.hp);
  return { actor: { ...actor, hp: actor.hp + cappedHeal }, healed: cappedHeal };
}

function clampPercent(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// attacker가 defender를 공격할 때의 명중 확률(%). defender의 유연성(회피)과
// 인식방해(상대 명중률 교란) 둘 다 이 확률을 깎는다.
function hitChance(attacker: Actor, defender: Actor): number {
  return clampPercent(
    BASE_HIT_CHANCE + attacker.accuracy * ACCURACY_HIT_COEF - defender.flexibility * FLEXIBILITY_EVADE_COEF - defender.perceptionJam * PERCEPTION_JAM_COEF,
    HIT_CHANCE_MIN,
    HIT_CHANCE_MAX
  );
}

function critChance(attacker: Actor): number {
  return clampPercent(BASE_CRIT_CHANCE + attacker.flexibility * FLEXIBILITY_CRIT_COEF, 0, 100);
}

function critMultiplier(attacker: Actor): number {
  return Math.min(MAX_CRIT_MULTIPLIER, BASE_CRIT_MULTIPLIER + attacker.obsession * OBSESSION_CRIT_COEF);
}

function applyCard(state: GameState, source: ActorId, card: Card): GameState {
  const targetId: ActorId = card.effect === 'heal' || card.effect === 'shield' ? source : source === 'player' ? 'enemy' : 'player';
  const sourceActor = state[source];
  const targetActor = state[targetId];

  let updatedTarget: Actor = targetActor;
  let message = '';

  switch (card.effect) {
    case 'damage': {
      const isHit = Math.random() * 100 < hitChance(sourceActor, targetActor);
      const isCrit = isHit && Math.random() * 100 < critChance(sourceActor);
      const rawDamage = isHit ? Math.round((card.value + sourceActor.strength) * (isCrit ? critMultiplier(sourceActor) : 1)) : 0;
      const reductionPct = defenseReduction(targetActor);
      const totalDamage = Math.round(rawDamage * (1 - reductionPct / 100));
      const absorbed = Math.min(targetActor.shield, totalDamage);
      const remaining = totalDamage - absorbed;
      const inflicted = isHit && card.appliesStatusEffect;
      updatedTarget = {
        ...targetActor,
        shield: targetActor.shield - absorbed,
        hp: Math.max(0, targetActor.hp - remaining),
        statusEffects: inflicted
          ? applyStatusEffect(targetActor.statusEffects, card.appliesStatusEffect!.type, card.appliesStatusEffect!.duration)
          : targetActor.statusEffects,
      };
      const statusSuffix = inflicted
        ? ` (${card.appliesStatusEffect!.type === 'poison' ? '독' : card.appliesStatusEffect!.type === 'bleed' ? '출혈' : '기절'} 부여)`
        : '';
      // 방어력으로 실제로 뭔가 깎였을 때만 그 사실을 로그에 덧붙인다(0%면
      // rawDamage===totalDamage라 문구가 안 붙음).
      const defenseSuffix = rawDamage > totalDamage ? ` (방어로 ${rawDamage - totalDamage} 경감)` : '';
      message = !isHit
        ? `${sourceActor.name}이(가) [${card.name}]로 공격했지만 ${targetActor.name}이(가) 회피했다!`
        : isCrit
          ? `${sourceActor.name}이(가) [${card.name}]로 ${targetActor.name}에게 치명타! ${totalDamage}의 피해!${defenseSuffix}${statusSuffix}`
          : `${sourceActor.name}이(가) [${card.name}]로 ${targetActor.name}에게 ${totalDamage}의 피해!${defenseSuffix}${statusSuffix}`;
      break;
    }
    case 'heal': {
      const healValue = Math.floor(card.value * bleedHealMultiplier(targetActor));
      updatedTarget = { ...targetActor, hp: Math.min(targetActor.maxHp, targetActor.hp + healValue) };
      message = `${sourceActor.name}이(가) [${card.name}]로 체력을 ${healValue} 회복!`;
      break;
    }
    case 'shield': {
      const totalShield = card.value + sourceActor.dexterity;
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

  return trackLowestPlayerHp(checkGameOver(next));
}

// Keeps lowestPlayerHpRatio current after every single card resolution (not
// just at turn boundaries) — see its doc comment on GameState. Cheap no-op
// once the ratio stops improving (min never increases).
function trackLowestPlayerHp(state: GameState): GameState {
  const ratio = state.player.hp / state.player.maxHp;
  return ratio < state.lowestPlayerHpRatio ? { ...state, lowestPlayerHpRatio: ratio } : state;
}

export function playCard(state: GameState, cardId: string): GameState {
  if (state.status !== 'playing') return state;
  if (isStunned(state.player)) return state;
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

// 상태이상 틱은 턴이 "끝날 때"가 아니라 이 함수 맨 앞, 적의 행동 페이즈보다
// 먼저 처리한다. 그래야 이번 호출의 적 행동 중에 방금 건 상태이상(예:
// 기절)이 이번 틱에 휩쓸려 즉시 사라지지 않고, 다음 endTurn() 호출까지
// 고스란히 남아있다가 그때 가서야 감소/소멸한다 — 즉 "적이 이번 턴 끝에
// 기절을 걸면 정확히 다음 한 턴을 통째로 막는다"는 의도가 스냅샷 없이
// 자연히 성립한다(status-effects.ts의 tickStatusEffects 문서 참고).
export function endTurn(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  const playerTick = tickStatusEffects(state.player, '플레이어');
  const enemyTick = tickStatusEffects(state.enemy, state.enemy.name);
  let next: GameState = {
    ...state,
    player: playerTick.actor,
    enemy: enemyTick.actor,
    log: [
      ...state.log,
      ...playerTick.messages.map((message) => ({ turn: state.turn, actor: 'player' as const, message })),
      ...enemyTick.messages.map((message) => ({ turn: state.turn, actor: 'enemy' as const, message })),
    ],
  };
  next = trackLowestPlayerHp(checkGameOver(next));
  if (next.status !== 'playing') return next;

  if (!enemyTick.wasStunned) {
    while (next.status === 'playing' && next.enemy.hand.some((c) => c.cost <= next.enemy.mana)) {
      const before = next;
      next = enemyAct(next);
      if (next === before) break;
    }
    if (next.status !== 'playing') return next;
  }

  // 라운드(플레이어 턴 + 적 턴)가 완전히 끝난 시점에 자연재생력을 적용한다 —
  // 다음 라운드 마나 리필과 같은 지점이라, "라운드마다 한 번" 원칙이 자연히
  // 지켜진다. 인내심이 없는 쪽(현재 모든 몬스터)은 healed===0이라 로그도 안
  // 붙는다.
  const playerRegen = applyRegenTick(next.player);
  const enemyRegen = applyRegenTick(next.enemy);
  next = {
    ...next,
    player: playerRegen.actor,
    enemy: enemyRegen.actor,
    log: [
      ...next.log,
      ...(playerRegen.healed > 0 ? [{ turn: next.turn, actor: 'player' as const, message: `자연재생력으로 체력을 ${playerRegen.healed} 회복했다.` }] : []),
      ...(enemyRegen.healed > 0
        ? [{ turn: next.turn, actor: 'enemy' as const, message: `${next.enemy.name}이(가) 자연재생력으로 체력을 ${enemyRegen.healed} 회복했다.` }]
        : []),
    ],
  };

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
