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
