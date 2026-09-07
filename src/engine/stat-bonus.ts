// 3대 메인스탯(육체/정신/이능). 세부스탯과 별개로 그 자체가 파생값의 입력이 되는
// 축 — 예: 이능은 정수 스킬 카드(essence.ts)의 위력 배율로 쓰임(engine.ts의
// ARCANE_ESSENCE_COEF).
export interface CoreStats {
  body: number; // 육체
  mind: number; // 정신
  arcane: number; // 이능 — 정수 스킬 카드 위력 배율(1당 +5%, engine.ts)
}

// 세부스탯 12종.
//
// ⚠️ 분류/정의 재검토 이력(2026-09): 육체 계열 5개(근력/유연성/시각/후각/
// 명중률)는 사용자가 직접 확정한 정의로 아래 주석에 반영했다 — 후각은
// 이전에 이능 계열로 잘못 분류돼 있었으나 실제로는 육체 계열이다. 반면
// 정신 계열(인지력/손재주/인내심/민첩성)과 이능 계열(독내성/인식방해/
// 집착)의 "이 세부스탯이 정신/이능에 속한다"는 분류 자체와 그 정의는
// 전부 과거 세션이 마스터 설정 근거 없이 임의로 채운 것이었음이 확인되어
// 무효로 간주한다 — 새 근거가 나오기 전까지 정신/이능 세부스탯 구성은
// 미정 상태다(designnotes.md 참고). 다만 이미 전투 로직에 연결되어 실제로
// 작동 중인 손재주/인내심/민첩성의 "무엇을 하는가"(방어%/재생%/행동력)는
// 그대로 유지한다 — 무효화된 건 "이게 정신 세부스탯이다"라는 분류·서사
// 근거일 뿐, 이미 구현된 수치 효과 자체가 아니다.
export interface SubStats {
  strength: number; // 근력 — 육체. 소지 가능한 중량·물리 공격력 등에 보정(engine.ts STRENGTH_ATTACK_COEF로 카드 피해 반영)
  flexibility: number; // 유연성 — 육체. 미약하게나마 회피율과 치명타율 증가
  // 시각 — 육체. 원거리 계열 무기의 사정거리 + 캐릭터의 가시 범위. 둘 다
  // 좌표/사거리 개념이 있어야 의미가 생기는 2D 전용 스탯이라(designnotes.md
  // "2D 탑다운 전환 고려" 원칙 — 아직 없는 2D 개념을 미리 흉내내지 않음),
  // 지금은 정의만 확정하고 실제 효과는 미구현 상태로 둔다.
  sight: number;
  accuracy: number; // 명중률 — 육체. 명중 판정(engine.ts hitChance)
  cognition: number; // 인지력 — 정신(분류 무효, 재검토 대상). 카드 코스트 경감 확률 — 아직 미구현
  dexterity: number; // 손재주 — 정신(분류 무효, 재검토 대상). 실제 효과: 방어막 보정 + 상시 피해 감소(%, engine.ts) — 효과 자체는 유지
  willpower: number; // 인내심 — 정신(분류 무효, 재검토 대상). 실제 효과: 자연재생력(라운드 종료 시 최대체력 %회복, engine.ts) — 효과 자체는 유지
  // 민첩성 — 정신(분류 무효, 재검토 대상). 실제 효과: 공격속도(engine.ts
  // attackSpeed(), 민첩성 3당 +1행동) — 효과 자체는 유지.
  agility: number;
  // 후각 — 육체(재분류: 과거엔 이능으로 잘못 분류됨). 관련 이능(정수 스킬 등)이
  // 있을 시 그 이능의 계수로 쓰인다는 것이 사용자 확정 정의 — 아직 "관련
  // 이능"으로 표시된 정수/스킬이 없어 실제 계수 적용 로직은 미구현. 기존
  // "마석/정수 드랍률 보정" 효과는 새 정의로 대체됨(무효).
  smell: number;
  poisonResist: number; // 독내성 — 이능(분류 무효, 재검토 대상). (예약) 상태이상 피해 경감 — 미구현
  perceptionJam: number; // 인식방해 — 이능(분류 무효, 재검토 대상). 실제 효과: 적 명중률 저하(engine.ts) — 효과 자체는 유지
  obsession: number; // 집착 — 이능(분류 무효, 재검토 대상). 실제 효과: 치명타 피해 배율 보정(engine.ts) — 효과 자체는 유지
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
