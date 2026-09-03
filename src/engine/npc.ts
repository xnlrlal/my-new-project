// 인간형 NPC 조우(designnotes.md 3-6번 "NPC 전투불능 상태"의 최소 구현).
// 몬스터(monsters.ts)와 의도적으로 완전히 분리된 타입이다 — designnotes.md
// 3-7번이 명시한 대로 몬스터는 죽으면 마석/넘버링 아이템만 남기고 빛무리로
// 사라지는 반면, 인간형 NPC는 전투불능 상태를 거쳐 죽이거나 살려줄 수
// 있고 전리품 규칙도 다르다(6-4번) — 몬스터의 경험치/드랍/정수 파이프라인
// (profile.ts의 grantExpForKill 등)을 재사용하지 않는 이유가 바로 이것.
// 지금은 "탐험가 약탈"(designnotes.md 11번, 나침반/수통 등 실제 전리품
// 목록)이나 "밤친구 배신"(7번) 서사가 아직 없어, 그 자리를 대신할 최소한의
// 조우 하나(떠돌이 탐험가)만 둔다 — 9-1번의 "탐험가들 사이의 불문율(서로를
// 잠재적 위험 요소로 인식)"과 맞아떨어지는 최소 트리거.
export interface NpcDef {
  id: string;
  name: string;
  strength: number;
  dexterity: number;
  willpower: number;
  maxHp: number;
  maxMana: number;
  // 몬스터와 달리 처음부터 실수치를 부여한다 — 인간형은 아직 세부스탯이
  // 전무한 몬스터 로스터(designnotes.md 5번 "몬스터 세부스탯 미부여")보다
  // 한 수 위의 상대라는 감각을 주기 위함(1차 추정치).
  accuracy: number;
  flexibility: number;
  perceptionJam: number;
  obsession: number;
  poisonResist: number;
  ranged: boolean;
  // engine.ts의 즉사(헤드샷) 판정이 요구하는 등급값 — 몬스터 등급제(1~9)를
  // 그대로 빌려 쓰되(EnemyCombatant가 요구하는 필드라 값 자체는 필요),
  // 9(최약)로 고정해 즉사 확률을 정확히 0%로 둔다. UI에는 절대 노출하지
  // 않는다(ui/battle.ts) — "등급" 용어가 몬스터 등급과 겹치는 문제
  // (designnotes.md 1번 원칙)를 인간형에서까지 반복하지 않기 위함.
  // ⚠️ 이 9는 monsters.ts의 WEAKEST_GRADE, engine.ts의 WEAKEST_MONSTER_GRADE와
  // 반드시 같은 값이어야 한다(그래야 tier=0, 즉사 확률=0%) — 세 곳 모두
  // 타입/임포트로 강제되지 않은 수동 동기화라, 등급 체계가 바뀌면
  // (designnotes.md 2번 "무등급 몬스터" 확장 등) 여기도 같이 확인해야 한다.
  grade: 9;
  introMessage: string;
  incapacitatedMessage: string;
  spareMessage: string;
  killMessage: string;
  // 파티(designnotes.md 10번 "결속", 최소 구현) — 전투불능 상태에서 "동료로
  // 삼는다"를 골랐을 때만 쓰인다. 은혜를 갚는다는 서사로 스톤 비용 없이
  // 즉시 합류한다(designnotes 원문의 "마석 2개=1.5만 스톤" 비용은 현재
  // 구현된 마석 환전 기준 9등급=20스톤과 맞지 않는 예전 수치라 이번
  // 최소 구현에서는 채택하지 않음 — 유료 결속은 이후 필요해지면 별도로
  // 설계).
  recruitMessage: string;
}

export const WANDERING_EXPLORER: NpcDef = {
  id: 'wandering-explorer',
  name: '떠돌이 탐험가',
  strength: 2,
  dexterity: 3,
  willpower: 0,
  maxHp: 100,
  maxMana: 3,
  accuracy: 4,
  flexibility: 3,
  perceptionJam: 0,
  obsession: 0,
  poisonResist: 0,
  ranged: false,
  grade: 9,
  introMessage: '낯선 탐험가와 눈이 마주쳤다. 서로를 향한 경계가 순식간에 전투로 번졌다!',
  incapacitatedMessage: '탐험가가 무기를 놓치고 쓰러졌다. 아직 숨은 붙어있다 — 죽일지 살려줄지 선택할 수 있다.',
  spareMessage: '탐험가를 살려주고 그대로 보내주었다.',
  killMessage: '탐험가의 숨통을 끊고 소지품을 뒤져 스톤 몇 개를 챙겼다.',
  recruitMessage: '탐험가가 목숨을 살려준 은혜에 감사하며 동료가 되기로 했다.',
};

export const NPCS: NpcDef[] = [WANDERING_EXPLORER];

export function getNpcById(id: string): NpcDef | null {
  return NPCS.find((npc) => npc.id === id) ?? null;
}

// 이동 시 몬스터 조우 판정(dungeon.ts의 rollBattle)을 이미 통과했을 때,
// 몬스터 대신 이 NPC와 마주칠 확률 — 몬스터 무리(3-1번)만큼 흔해지면
// "인간형은 드물다"는 9-1번 인구 서술과 어긋나므로 낮게 잡은 1차 추정치.
export const NPC_ENCOUNTER_CHANCE = 0.05;

// 전투불능 상태의 NPC를 끝장냈을 때 얻는 보상 — designnotes.md 11번
// "탐험가 약탈 시스템"(나침반/수통/배낭 등 실제 전리품 목록)이 아직
// 미착수라, 그 자리를 대신하는 임시 보상(1차 추정치). 실제 전리품
// 시스템이 들어오면 이 상수 대신 대체될 자리.
export const NPC_KILL_LOOT_GOLD = 80;
