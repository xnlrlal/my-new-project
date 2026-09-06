// 아이템 식별 시스템(designnotes.md 2-1번, README 로드맵 1번) — 미확인
// 약초. 소모품(consumables.ts)과 마찬가지로 개수만 세는 카운터로 보관되지만,
// "이 종류를 식별했는가"라는 별도 상태를 갖는다는 점이 다르다. 마스터 설정
// 원문대로 식별은 개별 인스턴스가 아니라 "종류" 단위 — 한 번 식별되면 그
// 종류는 이후로 항상 진짜 이름으로 보인다.
export type HerbId = 'lecho-leaf';

// 'common' = 아래 두 일반 식별 경로(미궁 감정사 NPC, 마을 상점)로 식별 가능.
// 'special' = 사용자 지시로 예정된 확장 지점 — "특수한 약초는 별도의 특수
// 경로로만 식별 가능하다"는 방향이 정해져 있어, 그 경로가 아직 설계·구현되지
// 않은 지금도 이 등급 표기만 미리 해둔다. isHerbIdentifiableByCommonPath()가
// 이 값을 보고 두 일반 경로 후보에서 'special' 약초를 제외한다 — 새 특수
// 약초를 추가해도 실수로 일반 경로에 섞이지 않는다.
export type HerbGrade = 'common' | 'special';

export interface HerbDef {
  id: HerbId;
  // 식별 후 표시되는 진짜 이름 — 식별 전에는 항상 HERB_UNIDENTIFIED_NAME으로만 보인다.
  name: string;
  description: string;
  grade: HerbGrade;
  // 마을 상점에서 감정을 의뢰할 때 드는 비용(1차 추정치). grade가
  // 'special'이면 이 값이 있어도 상점 감정 대상에서 제외되므로 쓰이지 않는다.
  identifyPrice: number;
}

export const HERB_UNIDENTIFIED_NAME = '미확인 약초';

// designnotes.md 2-3번(탐험가 약탈)이 언급한 "리쵸 잎"을 첫 사례로 채택 —
// 아직 약탈 시스템 자체는 미구현이라, 이번엔 아래 rollHerbForage()로 미궁
// 이동 중 직접 발견하는 경로로 대체 도입한다.
export const HERBS: HerbDef[] = [
  {
    id: 'lecho-leaf',
    name: '리쵸 잎',
    description: '말려서 달이면 출혈을 진정시키는 효과가 있다고 알려진 약초. (효과는 아직 게임에 연결되지 않음)',
    grade: 'common',
    identifyPrice: 50,
  },
];

export function getHerb(id: HerbId): HerbDef {
  const def = HERBS.find((h) => h.id === id);
  if (!def) throw new Error(`Unknown herb: ${id}`);
  return def;
}

export function isHerbIdentifiableByCommonPath(id: HerbId): boolean {
  return getHerb(id).grade === 'common';
}

function commonHerbs(): HerbDef[] {
  return HERBS.filter((h) => h.grade === 'common');
}

export function randomCommonHerbId(): HerbId {
  const pool = commonHerbs();
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// 미궁 이동 중 발견(designnotes.md 2-1번 "새 소모품을 미확인 상태로
// 드랍시키고 식별 방법을 붙이는 식" 제안을 채택) — 몬스터 처치 드랍이
// 아니라 안전한 이동(전투 없이 넘어간 칸)에서만 확률적으로 발견된다.
// "몬스터는 마석/정수만 남긴다"는 3-7번 원칙과 약초를 섞지 않기 위해
// 의도적으로 몬스터 드랍 파이프라인(monsters.ts)과 분리했다. 수치는
// 마스터 설정에 없는 1차 추정치.
export const HERB_FORAGE_CHANCE = 0.03;

export function rollHerbForage(): boolean {
  return Math.random() < HERB_FORAGE_CHANCE;
}

// 미궁 내 감정사 조우(designnotes.md 2-1번 "npc는 약초에 대해 잘 아는
// 고등급 탐험가, 요정족, 관련 직종") — 전투가 아니라 순수 서비스
// 상호작용이라 npc.ts의 NpcDef(전투 스탯 포함)와는 완전히 별개 타입이다.
// 셋 중 하나를 무작위로 골라 대사만 다르게 보여줄 뿐, 실제 처리(무료 식별)는
// 전부 동일하다.
export interface HerbIdentifierFlavor {
  title: string;
  introMessage: string;
}

export const HERB_IDENTIFIER_FLAVORS: HerbIdentifierFlavor[] = [
  { title: '고등급 탐험가', introMessage: '노련해 보이는 고등급 탐험가가 다가와 묻는다. "그 약초, 나도 좀 볼 수 있겠나? 이래 봬도 오래 굴러먹었거든."' },
  { title: '요정족 여행자', introMessage: '요정족 여행자가 흥미로운 눈으로 다가온다. "그 풀, 저희 종족한테는 익숙한 건데요. 봐드릴까요?"' },
  { title: '약초에 밝은 이', introMessage: '약초 다루는 일을 하는 듯한 이가 다가온다. "그거 미확인 약초로군요. 감정해 드릴까요?"' },
];

export function randomHerbIdentifierFlavor(): HerbIdentifierFlavor {
  return HERB_IDENTIFIER_FLAVORS[Math.floor(Math.random() * HERB_IDENTIFIER_FLAVORS.length)];
}

// 전투용 인간형 NPC 조우(npc.ts의 NPC_ENCOUNTER_CHANCE)와 완전히 별개의
// 확률 — rollBattle을 통과할 필요 없이 언제든(전투 없이 안전하게 넘어가는
// 이동에서) 따로 굴린다. 식별할 미확인 일반 등급 약초가 하나도 없으면
// main.ts가 애초에 이 확률 자체를 굴리지 않는다.
export const HERB_IDENTIFIER_ENCOUNTER_CHANCE = 0.1;
