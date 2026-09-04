// 소모품 카테고리(designnotes.md 6-1번) — 장착형 장비(GearInstance, gear.ts)나
// 흡수형 정수(essence.ts)와 달리, 들고 다니다가 "사용"하면 하나씩 사라지는
// 아이템. 마석(profile.ts의 ManaStoneCounts)과 같은 카운터 방식으로
// 저장한다 — 같은 종류는 완전히 동일해 개별 인스턴스를 구분할 필요가 없다.
//
// 첫 품목은 붕대뿐이다. designnotes.md 6-3번 표에 등장하는 나머지(수통/
// 식량/담요/포션/나침반/배낭)는 각각 아직 존재하지 않는 시스템(생존 수치,
// 인벤토리 확장 등)에 연결되어야 비로소 의미가 생기는 아이템들이라 이번
// 범위 밖 — 붕대를 먼저 고른 이유는 "출혈을 치료한다"는 효과가 이미
// 구현된 상태이상 시스템(status-effects.ts)에 곧바로 연결할 수 있는
// 유일한 항목이었기 때문이다.
//
// 정수 해제(README 로드맵 1번)는 이 소모품 카테고리가 아니라 신전
// 시설(ui/temple.ts, profile.ts의 releaseEssence())에서 스톤으로 직접
// 처리한다 — 한때 'essence-unbinder' 소모품으로 구현했었으나, 사용자
// 지시로 신전 방식(회차별 500만/1000만/2000만 스톤, 캐릭터당 3회 한정)으로
// 대체됨.
export type ConsumableId = 'bandage';

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

export const CONSUMABLES: ConsumableDef[] = [BANDAGE];

export function getConsumable(id: ConsumableId): ConsumableDef {
  const def = CONSUMABLES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown consumable: ${id}`);
  return def;
}
