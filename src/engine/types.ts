export type CardEffect = 'damage' | 'heal' | 'shield';

export type StatusEffectType = 'poison' | 'bleed' | 'stun';

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
  remainingTurns: number;
}

// 부위 손상(designnotes.md 3-3번) — HP(생명력 총량)·상태이상(시간에 따른
// 지속 효과)과 독립된 세 번째 축. 머리는 이 목록에 없다 — 머리 손상은
// engine.ts의 기존 즉사(헤드샷) 판정으로 이미 다뤄지고 있어(3-2번 참고),
// 같은 부위를 두 판정이 중복으로 다루지 않도록 body-parts.ts의 스폰 후보에서
// 처음부터 제외한다.
export type BodyPart = 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

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
  // 이 카드가 정수(essence.ts)에서 나온 스킬 카드인지 — engine.ts의
  // ARCANE_ESSENCE_COEF가 이 플래그가 있는 카드에만 이능 배율을 적용한다.
  // 기본 카드 풀(cards.ts)은 이 필드를 아예 안 쓴다.
  isEssenceSkill?: boolean;
}

// 'companion'(동료 NPC, designnotes.md 10번 "파티(결속)"의 최소 구현) — 항상
// 있는 건 아니라 GameState.companion은 Actor|null(없으면 그냥 2인 전투).
// 있을 때만 관여하는 모든 로직(engine.ts)이 이 셋째 값으로 분기한다.
export type ActorId = 'player' | 'companion' | 'enemy';

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
  // 이능 — 정수 스킬 카드(essence.ts)의 위력 배율(engine.ts의
  // ARCANE_ESSENCE_COEF)로만 쓰인다. 플레이어만 정수를 흡수하므로 실질적으로
  // 항상 player Actor에서만 의미가 있고, 몬스터/NPC(EnemyCombatant에 필드
  // 자체가 없음)는 0으로 고정된다.
  arcane: number;
  // 인내심 — 자연재생력. 매 라운드 종료 시 최대체력의 일정 %를 회복시킨다
  // (engine.ts의 WILLPOWER_REGEN_COEF).
  willpower: number;
  statusEffects: StatusEffect[];
  // 이번 전투에서 이미 손상된 부위 목록(body-parts.ts) — 같은 부위는 이번
  // 전투 동안 두 번 손상되지 않는다(1차 구현, 아래 body-parts.ts 문서 참고).
  damagedParts: BodyPart[];
  hand: Card[];
  deck: Card[];
  discard: Card[];
}

export interface LogEntry {
  turn: number;
  actor: ActorId;
  message: string;
}

// 'incapacitated'(전투 불능, designnotes.md 3-6번) — 인간형 NPC 전용 결과.
// "HP 0 = 사망"인 몬스터(status: 'win')와 달리, 인간형 상대는 HP 0에
// 도달해도 죽지 않고 전투가 이 상태로 끝난다 — 이후 죽이거나 살려줄지는
// 전투 밖(main.ts)의 별도 선택으로 넘어간다. checkGameOver(engine.ts)가
// GameState.enemyIsHuman로 'win'과 이 상태를 가른다.
export type GameStatus = 'playing' | 'win' | 'lose' | 'incapacitated';

export interface GameState {
  turn: number;
  player: Actor;
  // 동료 NPC(designnotes.md 10번) — 없는 전투가 기본(null). 있으면 플레이어
  // 턴 다음·적 턴 이전에 자동으로 카드를 낸다(engine.ts의 companionAct).
  // 죽어도 게임 오버가 아니라 이 필드가 null로 바뀌며 전투에서 이탈할
  // 뿐이다(checkCompanionFallen) — 페르마데스는 플레이어 HP 0에만 걸림.
  companion: Actor | null;
  enemy: Actor;
  enemyGrade: number;
  // 원거리(활 등) 몬스터인지 — engine.ts의 즉사(헤드샷) 판정이 이 필드로
  // 근접/원거리를 구분한다(designnotes.md 3-2번 참고).
  enemyRanged: boolean;
  // 상대가 인간형 NPC인지(designnotes.md 3-6번) — true면 HP 0 도달 시
  // status가 'win'이 아니라 'incapacitated'가 된다(engine.ts의
  // checkGameOver). 몬스터 전투는 항상 false.
  enemyIsHuman: boolean;
  log: LogEntry[];
  status: GameStatus;
  // 이 전투 동안 player.hp/maxHp가 도달한 최저 비율(0~1). initGame이 시작
  // HP 기준으로 세팅하고, applyCard가 데미지 적용 직후마다 갱신한다 — 턴
  // 중간에 위기를 겪었다가 같은 턴에 회복 카드로 버텨낸 경우도 놓치지 않기
  // 위해, 최종 HP가 아니라 "그동안 본 최저치"를 계속 들고 다니는 값이다.
  // HP 위기 업적(main.ts의 checkForAchievements) 판정에 쓰인다.
  lowestPlayerHpRatio: number;
}
