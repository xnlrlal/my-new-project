// 소모품 카테고리(designnotes.md 6-1번) — 장착형 장비(GearInstance, gear.ts)나
// 흡수형 정수(essence.ts)와 달리, 들고 다니다가 "사용"하면 하나씩 사라지는
// 아이템. 마석(profile.ts의 ManaStoneCounts)과 같은 카운터 방식으로
// 저장한다 — 같은 종류는 완전히 동일해 개별 인스턴스를 구분할 필요가 없다.
//
// 붕대에 이은 두 번째 품목이 포션이다. designnotes.md 2번 섹션("전투 중
// 포션 사용 금지")에서 "포션은 미궁 이동/휴식 중에만 쓰는 소모품"으로
// 확정됐으므로, 전투 화면(ui/battle.ts)이 아니라 미궁 지도 화면
// (ui/dungeon-map.ts)에서만 사용 버튼을 노출한다 — 별도의 "휴식" 화면은
// 아직 없어, 지금 유일하게 전투 밖인 미궁 이동 화면이 그 자리를 대신한다.
// designnotes.md 6-3번 표에 등장하는 나머지(수통/식량/담요/나침반/배낭)는
// 각각 아직 존재하지 않는 시스템(생존 수치, 인벤토리 확장 등)에 연결되어야
// 비로소 의미가 생기는 아이템들이라 이번 범위 밖.
//
// 정수 해제(README 로드맵 1번)는 이 소모품 카테고리가 아니라 신전
// 시설(ui/temple.ts, profile.ts의 releaseEssence())에서 스톤으로 직접
// 처리한다 — 한때 'essence-unbinder' 소모품으로 구현했었으나, 사용자
// 지시로 신전 방식(회차별 500만/1000만/2000만 스톤, 캐릭터당 3회 한정)으로
// 대체됨.
export type ConsumableId = 'bandage' | 'potion';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  description: string;
  price: number;
}

// 마스터 설정에 가격이 없어 회중시계(300스톤, gear.ts)와 마찬가지로 잡은
// 1차 추정치 — 소모품은 반복 구매를 전제로 훨씬 저렴하게 잡았다.
export const BANDAGE: ConsumableDef = {
  id: 'bandage',
  name: '붕대',
  description: '상처에 감아 출혈을 멎게 한다. 전투 중 사용 가능.',
  price: 30,
};

// 최대체력 대비 회복 비율 — 마스터 설정에 수치가 없는 1차 추정치.
export const POTION_HEAL_PERCENT = 40;

// 붕대보다 비싼 이유는 (a) 출혈 하나만 걷어내는 붕대와 달리 체력 자체를
// 즉시 채워주고, (b) 전투 중에는 못 쓰는 대신 사용처를 가리지 않는(어떤
// 상태이상이든, 상시) 범용 회복 수단이기 때문 — 가격도 1차 추정치.
export const POTION: ConsumableDef = {
  id: 'potion',
  name: '포션',
  description: `체력을 최대체력의 ${POTION_HEAL_PERCENT}% 회복한다. 전투 중에는 사용할 수 없고, 미궁 이동 중에만 사용 가능.`,
  price: 80,
};

export const CONSUMABLES: ConsumableDef[] = [BANDAGE, POTION];

export function getConsumable(id: ConsumableId): ConsumableDef {
  const def = CONSUMABLES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown consumable: ${id}`);
  return def;
}
