export type RaceId = 'human' | 'elf' | 'orc' | 'dwarf' | 'barbarian';

// Race ids selectable in character-select, in display order. Orc is
// deliberately excluded — it's been retired as a playable race (see the
// 'orc' monster in monsters.ts) but stays in RACES/RaceId below so existing
// saves with raceId: 'orc' keep resolving through getRace() instead of
// crashing on an unknown id. Ids present here but not 'barbarian' render as
// locked cards rather than being hidden.
export const SELECTABLE_RACE_IDS: RaceId[] = ['barbarian', 'human', 'elf', 'dwarf'];

export interface RaceStats {
  maxHp: number;
  maxMana: number;
  attackBonus: number;
  defenseBonus: number;
}

export interface RaceDef {
  id: RaceId;
  name: string;
  description: string;
  stats: RaceStats;
}

export const RACES: RaceDef[] = [
  {
    id: 'barbarian',
    name: '바바리안',
    description: '분노에 몸을 맡긴 전사. 마나는 부족하지만 공격력은 모든 종족 중 최고다.',
    stats: { maxHp: 45, maxMana: 2, attackBonus: 3, defenseBonus: 0 },
  },
  {
    id: 'human',
    name: '인간',
    description: '모든 능력치가 균형 잡혀 있다.',
    stats: { maxHp: 40, maxMana: 3, attackBonus: 0, defenseBonus: 0 },
  },
  {
    id: 'elf',
    name: '엘프',
    description: '마나가 풍부하지만 체력이 낮다.',
    stats: { maxHp: 32, maxMana: 4, attackBonus: 1, defenseBonus: 0 },
  },
  {
    id: 'orc',
    name: '오크',
    description: '체력과 공격력이 뛰어나지만 마나가 부족하다.',
    stats: { maxHp: 48, maxMana: 2, attackBonus: 2, defenseBonus: 0 },
  },
  {
    id: 'dwarf',
    name: '드워프',
    description: '방어력이 뛰어난 종족.',
    stats: { maxHp: 44, maxMana: 3, attackBonus: 0, defenseBonus: 2 },
  },
];

export function getRace(id: RaceId): RaceDef {
  const race = RACES.find((r) => r.id === id);
  if (!race) throw new Error(`Unknown race: ${id}`);
  return race;
}
