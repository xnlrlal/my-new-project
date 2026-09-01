import type { CoreStats, SubStats } from './stat-bonus';

export type RaceId = 'human' | 'elf' | 'beastkin' | 'dwarf' | 'barbarian';

// Race ids selectable in character-select, in display order. Ids present
// here but not 'barbarian' render as locked cards rather than being hidden.
// Orc has been removed as a playable race entirely (unlike the earlier
// retirement, which kept it in RACES/RaceId for save compatibility) — this
// is player-race-only and independent of monsters.ts's own roster (which
// no longer has an 'orc' monster either, since it rewrote MONSTERS to match
// designnotes.md and orc isn't in that list — pure coincidence, not related
// to this removal).
// Old saves carrying raceId: 'orc' are covered by profile.ts's
// CURRENT_SCHEMA_VERSION bump, which forces a full reset rather than
// needing getRace('orc') to keep resolving.
export const SELECTABLE_RACE_IDS: RaceId[] = ['barbarian', 'human', 'elf', 'dwarf', 'beastkin'];

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
// 불변, 다만 strength의 실제 적용 방식은 flat add에서 %가산으로 바뀌었다 —
// engine.ts의 STRENGTH_ATTACK_COEF 참고). body/mind/arcane은 수십단위
// 스케일로 재조정됐다(사용자 확정 기준점 바바리안=25/35/1) — "정신"은
// 지능이 아니라 의지력/정신적 강인함에 가까운 축이라, 이성적 판단이 아닌
// 불굴의 의지를 뜻하는 바바리안의 정신 최고치가 서사와 모순되지 않는다
// (업적 보상이 전부 정신에 귀속되는 것도 같은 맥락 — HP 위기 극복·첫
// 처치처럼 정신력을 시험받는 사건에서 오른다). 나머지 세부스탯(유연성/
// 시각/명중률/인지력/민첩성/독내성/인식방해/집착)은 아직 어떤 몬스터도
// 전투에서 소비하지 않는 신규 축이라 전 종족 0에서 시작한다. 후각만 예외 —
// 수인의 시그니처 스탯으로 처음 값을 부여한다.
//
// maxHp는 전 종족 100으로 통일했다(설계 논의 참고 — 체력을 "수치"가 아니라
// "%"로 다루기 위해, 종족 간 튼튼함 차이를 풀 크기가 아니라 손재주(방어력%)/
// 인내심(자연재생력%)으로 표현하도록 재설계). 예전 체력 32~45 사이의 차이는
// 아래처럼 재배치했다 — 근거는 원래 체력 순위(바바리안>드워프≈수인>인간>엘프):
//   - 드워프: 손재주(=방어력)를 2 → 4로 상향 — "방어력이 뛰어난 종족"이라는
//     서사와 가장 직접적으로 맞아떨어져 단일 축으로 정리.
//   - 바바리안/인간/수인: 손재주 대신 인내심(자연재생력) +2로 원래의 중상위
//     체력을 표현.
//   - 엘프: 원래 최저 체력이었던 만큼 방어력/재생력 둘 다 0 — 생존기 없이
//     마나·이능에 완전히 기댄다는 컨셉을 그대로 살림.
// (체력 풀 크기 대신 방어력/재생력 하나만으로 종족 생존력을 표현하다 보니,
// 시뮬레이션 결과 레벨 1 캐릭터가 초기장비만으로 버틸 수 있는 전투 수가
// 너무 적어(방어/재생 수치가 아직 작아서) 종족 기본값·초기장비(ritual.ts)
// 둘 다 처음 잡았던 값보다 올려 재조정했다 — 여전히 1차 초안.)
const ZERO_SUBSTATS: Omit<SubStats, 'strength' | 'dexterity' | 'smell' | 'willpower'> = {
  flexibility: 0,
  sight: 0,
  accuracy: 0,
  cognition: 0,
  agility: 0,
  poisonResist: 0,
  perceptionJam: 0,
  obsession: 0,
};

export const RACES: RaceDef[] = [
  {
    id: 'barbarian',
    name: '바바리안',
    description: '분노에 몸을 맡긴 전사. 마나는 부족하지만 공격력은 모든 종족 중 최고다.',
    stats: { maxHp: 100, maxMana: 2, body: 25, mind: 35, arcane: 1, strength: 3, dexterity: 0, willpower: 2, smell: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'human',
    name: '인간',
    description: '모든 능력치가 균형 잡혀 있다.',
    stats: { maxHp: 100, maxMana: 3, body: 20, mind: 20, arcane: 20, strength: 0, dexterity: 0, willpower: 2, smell: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'elf',
    name: '엘프',
    description: '마나가 풍부하지만 방어와 회복 수단이 없다.',
    stats: { maxHp: 100, maxMana: 4, body: 8, mind: 28, arcane: 24, strength: 1, dexterity: 0, willpower: 0, smell: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'dwarf',
    name: '드워프',
    description: '방어력이 뛰어난 종족.',
    stats: { maxHp: 100, maxMana: 3, body: 24, mind: 26, arcane: 4, strength: 0, dexterity: 4, willpower: 0, smell: 0, ...ZERO_SUBSTATS },
  },
  {
    id: 'beastkin',
    name: '수인',
    description: '짐승의 감각과 본능을 타고난 종족. 예민한 후각으로 마석과 정수의 기척을 누구보다 먼저 알아채지만, 사색에는 서투르다.',
    stats: { maxHp: 100, maxMana: 2, body: 28, mind: 10, arcane: 22, strength: 2, dexterity: 0, willpower: 2, smell: 3, ...ZERO_SUBSTATS },
  },
];

export function getRace(id: RaceId): RaceDef {
  const race = RACES.find((r) => r.id === id);
  if (!race) throw new Error(`Unknown race: ${id}`);
  return race;
}
