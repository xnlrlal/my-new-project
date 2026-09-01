// 3대 메인스탯(육체/정신/이능). 세부스탯과 별개로 그 자체가 파생값의 입력이 되는
// 축 — 예: 이능은 essence.ts에서 정수 스킬 카드의 위력 배율로 쓰임(engine.ts).
export interface CoreStats {
  body: number; // 육체
  mind: number; // 정신
  arcane: number; // 이능 — 정수 스킬 카드가 아직 없어 현재는 전투에 영향 없음
}

// 세부스탯 12종. 전투 확률 판정(명중/회피/치명타 등)에 개입하는 로직은 2단계에서
// engine.ts에 추가될 예정 — 이 인터페이스 자체는 스키마만 정의한다.
export interface SubStats {
  strength: number; // 근력 — 육체. 피해량 보정(구 attackBonus 계승)
  flexibility: number; // 유연성 — 육체. 회피율·치명타율
  sight: number; // 시각 — 육체. (2단계 이후) 정보성 보너스
  accuracy: number; // 명중률 — 육체. 명중 판정
  cognition: number; // 인지력 — 정신. 카드 코스트 경감 확률
  dexterity: number; // 손재주 — 정신. 방어막 보정(구 defenseBonus 계승) + 상시 피해 감소(%, engine.ts)
  willpower: number; // 인내심 — 정신. 자연재생력 — 라운드 종료 시 최대체력의 %를 회복(engine.ts)
  agility: number; // 민첩성 — 정신. 추가 드로우 확률
  smell: number; // 후각 — 이능. 마석/정수 드랍률 보정(전투 외)
  poisonResist: number; // 독내성 — 이능. (예약) 상태이상 피해 경감
  perceptionJam: number; // 인식방해 — 이능. 적 명중률 저하
  obsession: number; // 집착 — 이능. 치명타 피해 배율 보정
}

// races.ts의 RaceStats와 구조적으로 동일한 셰이프를 stat-bonus.ts 안에서 독립적으로
// 유지해, 이 파일이 races.ts를 import하지 않아도 되게 한다(원래 4필드 시절부터의
// 관례 — gear.ts/monsters.ts 등도 races.ts에 의존하지 않고 이 파일만 참조).
export interface RaceStatsLike extends CoreStats, SubStats {
  maxHp: number;
  maxMana: number;
}

// 장비/정수가 부여하는 보너스 — RaceStatsLike의 모든 필드를 선택적으로 가산할 수
// 있다. 기존 StatBonus(4필드 선택적)의 자연스러운 확장.
export type StatBonus = Partial<RaceStatsLike>;

const STAT_FIELDS: (keyof RaceStatsLike)[] = [
  'maxHp',
  'maxMana',
  'body',
  'mind',
  'arcane',
  'strength',
  'flexibility',
  'sight',
  'accuracy',
  'cognition',
  'dexterity',
  'willpower',
  'agility',
  'smell',
  'poisonResist',
  'perceptionJam',
  'obsession',
];

export function applyStatBonuses(base: RaceStatsLike, sources: { statBonus: StatBonus }[]): RaceStatsLike {
  const result = { ...base } as Record<keyof RaceStatsLike, number>;
  for (const source of sources) {
    for (const field of STAT_FIELDS) {
      result[field] += source.statBonus[field] ?? 0;
    }
  }
  return result;
}

const STAT_LABELS: Record<keyof RaceStatsLike, string> = {
  maxHp: '체력',
  maxMana: '마나',
  body: '육체',
  mind: '정신',
  arcane: '이능',
  strength: '근력',
  flexibility: '유연성',
  sight: '시각',
  accuracy: '명중률',
  cognition: '인지력',
  dexterity: '손재주',
  willpower: '인내심',
  agility: '민첩성',
  smell: '후각',
  poisonResist: '독내성',
  perceptionJam: '인식방해',
  obsession: '집착',
};

// "아이템 레벨"(3단계 UI 갱신) — 장비마다 별도 authored 필드를 두지 않고,
// 그 장비의 statBonus가 부여하는 모든 필드값의 단순 합으로 파생시킨다.
// 캐릭터의 아이템 레벨은 장착된 슬롯들의 이 값을 합산한 것(ui/stats.ts).
export function statBonusMagnitude(statBonus: StatBonus): number {
  return STAT_FIELDS.reduce((sum, field) => sum + (statBonus[field] ?? 0), 0);
}

// "종합 전투 지수" — 표시 전용 파생 점수. 전투 판정(engine.ts)이 실제로
// 소비하는 값이 아니라, 캐릭터 정보 화면에서 한눈에 비교할 "전투력" 감각을
// 주기 위한 가중합이다. 가중치는 설계 논의에서 제안된 초안 값 — 실제
// 밸런스는 플레이테스트로 조정될 수 있다.
// body/mind/arcane 가중치는 maxHp와 동일하게 1 — 메인스탯이 1~3에서 수십단위
// 스케일로 재조정되면서(races.ts 참고) 예전 가중치 10을 유지하면 종합 전투
// 지수가 메인스탯 총합에 압도돼(예: 바바리안 기준 전체의 약 89%) 세부스탯·
// 장비 기여가 사실상 안 보이게 되는 것을 막기 위함.
const COMBAT_INDEX_WEIGHTS: Record<keyof RaceStatsLike, number> = {
  maxHp: 1,
  maxMana: 5,
  body: 1,
  mind: 1,
  arcane: 1,
  strength: 8,
  dexterity: 8,
  accuracy: 4,
  flexibility: 4,
  obsession: 6,
  perceptionJam: 6,
  sight: 2,
  cognition: 2,
  willpower: 2,
  agility: 2,
  smell: 2,
  poisonResist: 2,
};

export function combatPowerIndex(stats: RaceStatsLike): number {
  return Math.round(STAT_FIELDS.reduce((sum, field) => sum + stats[field] * COMBAT_INDEX_WEIGHTS[field], 0));
}

export function statBonusText(statBonus: StatBonus): string {
  const parts: string[] = [];
  for (const field of STAT_FIELDS) {
    const value = statBonus[field];
    if (value) parts.push(`${STAT_LABELS[field]} +${value}`);
  }
  return parts.join(' · ') || '보너스 없음';
}
