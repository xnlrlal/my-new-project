export type CardEffect = 'damage' | 'heal' | 'shield';

export interface Card {
  id: string;
  name: string;
  cost: number;
  effect: CardEffect;
  value: number;
  description: string;
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
  dexterity: number;
  // 2단계(확률 판정)에서 추가된 네 필드 — applyCard의 명중/치명타 판정에 쓰임
  // (engine.ts). 나머지 세부스탯(인지력/민첩성/시각/후각/독내성/인내심)은
  // 아직 어떤 전투 판정도 소비하지 않아 Actor에 싣지 않았다 — 각각을 실제로
  // 쓰는 단계에서 필요한 만큼만 추가하는 편이 낫다는 판단.
  accuracy: number; // 명중률 — 내 명중 판정 보정
  flexibility: number; // 유연성 — 상대 명중 판정 회피 + 내 치명타 확률
  perceptionJam: number; // 인식방해 — 상대가 나를 공격할 때 상대 명중률 저하
  obsession: number; // 집착 — 내 치명타 피해 배율
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
  log: LogEntry[];
  status: GameStatus;
}
