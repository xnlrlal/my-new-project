import type { CoreStats, SubStats } from './stat-bonus';

export type RaceId = 'human' | 'elf' | 'orc' | 'dwarf' | 'barbarian';

// Race ids selectable in character-select, in display order. Orc is
// deliberately excluded — it's been retired as a playable race (see the
// 'orc' monster in monsters.ts) but stays in RACES/RaceId below so existing
// saves with raceId: 'orc' keep resolving through getRace() instead of
// crashing on an unknown id. Ids present here but not 'barbarian' render as
// locked cards rather than being hidden.
export const SELECTABLE_RACE_IDS: RaceId[] = ['barbarian', 'human', 'elf', 'dwarf'];

export interface RaceStats extends CoreStats, SubStats {
  maxHp: number;
  maxMana: number;
}

export interface RaceDef {
  id: RaceId;
  name: string;
  description: string;
  stats: RaceStats;
}

// strength/dexterity는 구 attackBonus/defenseBonus를 그대로 계승한 값(스케일
// 불변). body/mind/arcane은 이번 스탯 체계 교체로 신규 도입된 축으로, 종족
// 설명 텍스트에 맞춰 1~3 범위의 초기값을 부여했다 — 정확한 밸런스는 2단계
// (확률 판정 도입) 이후 플레이테스트로 조정 예정. 나머지 세부스탯(유연성/시각/
// 명중률/인지력/인내심/민첩성/후각/독내성/인식방해/집착)은 아직 어떤 몬스터도
// 전투에서 소비하지 않는 신규 축이라 전 종족 0에서 시작한다.
const ZERO_SUBSTATS: Omit<SubStats, 'strength' | 'dexterity'> = {
  flexibility: 0,
  sight: 0,
  accuracy: 0,
  cognition: 0,
  willpower: 0,
  agility: 0,
  smell: 0,
  poisonResist: 0,
  perceptionJam: 0,
  obsession: 0,
};

export const RACES: RaceDef[] = [
  {
    id: 'barbarian',
    name: '바바리안',
    description: '분노에 몸을 맡긴 전사. 마나는 부족하지만 공격력은 모든 종족 중 최고다.',
    stats: { maxHp: 45, maxMana: 2, body: 3, mind: 1, arcane: 0, strength: 3, dexterity: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'human',
    name: '인간',
    description: '모든 능력치가 균형 잡혀 있다.',
    stats: { maxHp: 40, maxMana: 3, body: 2, mind: 2, arcane: 1, strength: 0, dexterity: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'elf',
    name: '엘프',
    description: '마나가 풍부하지만 체력이 낮다.',
    stats: { maxHp: 32, maxMana: 4, body: 1, mind: 3, arcane: 2, strength: 1, dexterity: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'orc',
    name: '오크',
    description: '체력과 공격력이 뛰어나지만 마나가 부족하다.',
    stats: { maxHp: 48, maxMana: 2, body: 3, mind: 1, arcane: 0, strength: 2, dexterity: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'dwarf',
    name: '드워프',
    description: '방어력이 뛰어난 종족.',
    stats: { maxHp: 44, maxMana: 3, body: 2, mind: 2, arcane: 1, strength: 0, dexterity: 2, ...ZERO_SUBSTATS },
  },
];

export function getRace(id: RaceId): RaceDef {
  const race = RACES.find((r) => r.id === id);
  if (!race) throw new Error(`Unknown race: ${id}`);
  return race;
}
