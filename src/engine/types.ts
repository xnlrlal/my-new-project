export type CardEffect = 'damage' | 'heal' | 'shield';

export type StatusEffectType = 'poison' | 'bleed' | 'stun';

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
  remainingTurns: number;
}

export interface Card {
  id: string;
  name: string;
  cost: number;
  effect: CardEffect;
  value: number;
  description: string;
  // 명중 시(applyCard의 damage 분기에서만 확인) 대상에게 상태이상을 부여한다.
  // 지금은 '관통'(cards.ts) 하나만 이 필드를 쓴다 — 상태이상 시스템의 최소
  // 실사용 경로(status-effects.ts 설계 문서 참고).
  appliesStatusEffect?: { type: StatusEffectType; duration: number };
}

export type ActorId = 'player' | 'enemy';

export interface Actor {
  id: ActorId;
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  mana: number;
  maxMana: number;
  strength: number;
  // 손재주 — 방어막 카드 보정(구 defenseBonus 계승)에 더해, 상시 피해 감소(%)의
  // 원천이기도 하다(engine.ts의 DEXTERITY_DEFENSE_COEF).
  dexterity: number;
  // 2단계(확률 판정)에서 추가된 네 필드 — applyCard의 명중/치명타 판정에 쓰임
  // (engine.ts). 나머지 세부스탯(인지력/민첩성/시각/후각/독내성)은 아직 어떤
  // 전투 판정도 소비하지 않아 Actor에 싣지 않았다 — 각각을 실제로 쓰는
  // 단계에서 필요한 만큼만 추가하는 편이 낫다는 판단.
  accuracy: number; // 명중률 — 내 명중 판정 보정
  flexibility: number; // 유연성 — 상대 명중 판정 회피 + 내 치명타 확률
  perceptionJam: number; // 인식방해 — 상대가 나를 공격할 때 상대 명중률 저하
  obsession: number; // 집착 — 내 치명타 피해 배율
  poisonResist: number; // 독내성 — 독 상태이상 피해 경감(status-effects.ts)
  // 인내심 — 자연재생력. 매 라운드 종료 시 최대체력의 일정 %를 회복시킨다
  // (engine.ts의 WILLPOWER_REGEN_COEF).
  willpower: number;
  statusEffects: StatusEffect[];
  hand: Card[];
  deck: Card[];
  discard: Card[];
}

export interface LogEntry {
  turn: number;
  actor: ActorId;
  message: string;
}

export type GameStatus = 'playing' | 'win' | 'lose';

export interface GameState {
  turn: number;
  player: Actor;
  enemy: Actor;
  enemyGrade: number;
  // 원거리(활 등) 몬스터인지 — engine.ts의 즉사(헤드샷) 판정이 이 필드로
  // 근접/원거리를 구분한다(designnotes.md 3-2번 참고).
  enemyRanged: boolean;
  log: LogEntry[];
  status: GameStatus;
  // 이 전투 동안 player.hp/maxHp가 도달한 최저 비율(0~1). initGame이 시작
  // HP 기준으로 세팅하고, applyCard가 데미지 적용 직후마다 갱신한다 — 턴
  // 중간에 위기를 겪었다가 같은 턴에 회복 카드로 버텨낸 경우도 놓치지 않기
  // 위해, 최종 HP가 아니라 "그동안 본 최저치"를 계속 들고 다니는 값이다.
  // HP 위기 업적(main.ts의 checkForAchievements) 판정에 쓰인다.
  lowestPlayerHpRatio: number;
}
