import type { Actor, StatusEffect, StatusEffectType } from './types';

// 카드 값처럼 3배 스케일업했었으나(2/3→6/9), 실전에서 스택 3개(예: 고블린
// 덫을 연달아 밟은 뒤 우회 기습까지 당하는 경우)만 쌓여도 "9×3스택×3턴=81"
// 로 100 체력의 대부분을 혼자 태워버리는 게 확인되어 되돌림. 카드는
// "한 번의 선택"이라 3배가 적절했지만, 상태이상은 스택(최대 5)×지속시간
// (보통 3턴)으로 곱연산이 붙어 같은 배율을 적용하면 안 됐음 — 원래 값
// (2/3)이 여전히 100 체력 기준으로도 스택 1개당 2~3%로 유의미하고, 최대
// 5스택이 쌓여도 "심각하지만 그것만으로 즉사는 아닌" 수준(45=최대체력의
// 45%)이 되도록 이 값으로 되돌렸다.
const POISON_DAMAGE_PER_STACK = 2;
const BLEED_DAMAGE_PER_STACK = 3;
const MAX_STACKS = 5;
const POISON_RESIST_COEF = 5; // 독내성 1당 독 피해 -5%p
const POISON_RESIST_MAX = 80; // 최대 80% 경감 — 완전 면역은 없음(명중/치명타 캡과 같은 원칙)
const BLEED_HEAL_MULTIPLIER = 0.5; // 출혈 활성 중 자신의 회복 카드 효과

// 이미 걸려있는 상태이상을 다시 부여하면 스택만 늘고(최대 MAX_STACKS),
// 지속시간은 "기존 남은 턴 vs 새로 건 지속시간" 중 긴 쪽으로 갱신된다 —
// 둘을 더하지 않는다("2턴 남았는데 새로 3턴짜리에 또 걸림" = 5턴이 아니라 3턴).
export function applyStatusEffect(effects: StatusEffect[], type: StatusEffectType, duration: number): StatusEffect[] {
  const existing = effects.find((e) => e.type === type);
  if (!existing) return [...effects, { type, stacks: 1, remainingTurns: duration }];
  return effects.map((e) =>
    e.type === type ? { ...e, stacks: Math.min(MAX_STACKS, e.stacks + 1), remainingTurns: Math.max(e.remainingTurns, duration) } : e
  );
}

export function isStunned(actor: Actor): boolean {
  return actor.statusEffects.some((e) => e.type === 'stun' && e.remainingTurns > 0);
}

// 출혈이 활성 상태면 이 배율을 회복 카드 값에 곱한다(즉시 0.5배, 반내림).
export function bleedHealMultiplier(actor: Actor): number {
  return actor.statusEffects.some((e) => e.type === 'bleed' && e.remainingTurns > 0) ? BLEED_HEAL_MULTIPLIER : 1;
}

export interface StatusTickResult {
  actor: Actor;
  messages: string[];
  // 이번 틱 "이전"(감소 전) 기준으로 기절 상태였는지 — engine.ts의 endTurn()이
  // 이번 호출에서 적의 행동 페이즈를 건너뛸지 결정하는 데 쓴다. 감소는 이
  // 함수 안에서 이미 끝나므로, 호출부는 반환된 actor.statusEffects를 그대로
  // 쓰면 되고 이 플래그만 별도로 참고하면 된다.
  wasStunned: boolean;
}

// engine.ts의 endTurn() 맨 앞, 적의 행동 페이즈보다 먼저 호출된다 — 턴 끝이
// 아니라 턴 시작 시점에 틱하는 이유는 endTurn()의 doc 코멘트 참고: 이렇게
// 해야 "이번 호출의 적 행동으로 방금 건 상태이상"이 이번 틱에 휩쓸려
// 즉시 사라지지 않고, 정확히 다음 한 턴을 온전히 막을 수 있다.
export function tickStatusEffects(actor: Actor, actorLabel: string): StatusTickResult {
  const wasStunned = isStunned(actor);
  const messages: string[] = [];
  let hp = actor.hp;

  for (const effect of actor.statusEffects) {
    if (effect.remainingTurns <= 0) continue;
    if (effect.type === 'poison') {
      const raw = POISON_DAMAGE_PER_STACK * effect.stacks;
      const reduction = Math.min(POISON_RESIST_MAX, actor.poisonResist * POISON_RESIST_COEF);
      const dmg = Math.max(0, Math.round(raw * (1 - reduction / 100)));
      if (dmg > 0) {
        hp = Math.max(0, hp - dmg);
        messages.push(`${actorLabel}이(가) 독 피해로 ${dmg}의 피해를 입었다!`);
      }
    } else if (effect.type === 'bleed') {
      const dmg = BLEED_DAMAGE_PER_STACK * effect.stacks;
      hp = Math.max(0, hp - dmg);
      messages.push(`${actorLabel}이(가) 출혈로 ${dmg}의 피해를 입었다!`);
    }
  }

  if (wasStunned) {
    messages.push(`${actorLabel}이(가) 기절 상태라 이번 턴 아무 행동도 하지 못했다!`);
  }

  const nextEffects = actor.statusEffects.map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 })).filter((e) => e.remainingTurns > 0);

  return { actor: { ...actor, hp, statusEffects: nextEffects }, messages, wasStunned };
}

// 순수 표시용 포맷터 — battle.ts가 이 문자열을 그대로 꽂아 넣기만 한다.
// StatusEffect[] 자체는 이 함수와 무관하게 계속 순수 데이터로 남으므로,
// 나중에 아이콘 렌더링으로 바뀌어도 데이터 구조는 그대로 재사용 가능하다.
const STATUS_EFFECT_LABELS: Record<StatusEffectType, string> = { poison: '독', bleed: '출혈', stun: '기절' };

export function statusEffectsText(effects: StatusEffect[]): string {
  if (effects.length === 0) return '';
  return effects
    .map((e) => (e.type === 'stun' ? `기절(${e.remainingTurns}턴)` : `${STATUS_EFFECT_LABELS[e.type]} x${e.stacks}(${e.remainingTurns}턴)`))
    .join(' · ');
}
