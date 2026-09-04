// 소모품 카테고리(designnotes.md 6-1번) — 장착형 장비(GearInstance, gear.ts)나
// 흡수형 정수(essence.ts)와 달리, 들고 다니다가 "사용"하면 하나씩 사라지는
// 아이템. 마석(profile.ts의 ManaStoneCounts)과 같은 카운터 방식으로
// 저장한다 — 같은 종류는 완전히 동일해 개별 인스턴스를 구분할 필요가 없다.
//
// 첫 품목은 붕대뿐이었다. designnotes.md 6-3번 표에 등장하는 나머지(수통/
// 식량/담요/포션/나침반/배낭)는 각각 아직 존재하지 않는 시스템(생존 수치,
// 인벤토리 확장 등)에 연결되어야 비로소 의미가 생기는 아이템들이라 이번
// 범위 밖 — 붕대를 먼저 고른 이유는 "출혈을 치료한다"는 효과가 이미
// 구현된 상태이상 시스템(status-effects.ts)에 곧바로 연결할 수 있는
// 유일한 항목이었기 때문이다.
//
// 'essence-unbinder'(정수 해제석) — README 로드맵 1번 "정수 해제(특수 장치)
// 시스템". 정수는 "한 번 흡수하면 특수한 방법으로만 해제 가능"(README)이
// 원칙이라, 장비처럼 자유롭게 뺄 수 있는 UI를 만드는 대신 이 소모품을
// 그 "특수한 방법"으로 도입했다 — profile.ts의 releaseEssence() 참고.
export type ConsumableId = 'bandage' | 'essence-unbinder';

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

// 정수 흡수가 "영구 장착"이 원칙인 만큼, 되돌리는 값도 그만큼 비싸야
// 한다는 취지로 회중시계(300)보다 훨씬 높게 잡았다 — 정확한 근거는 없는
// 1차 추정치라 요청하면 언제든 바꿀 수 있다. 붕대와 달리 "한 번 쓰고
// 끝"이 아니라 정수 하나를 통째로 되돌리는 결정이라 반복 구매 부담을
// 크게 줄 필요는 없다고 보고 매번 같은 가격으로 판매한다.
export const ESSENCE_UNBINDER: ConsumableDef = {
  id: 'essence-unbinder',
  name: '정수 해제석',
  description: '장착 중인 정수 하나를 강제로 해제한다. 정수 창에서 사용 가능.',
  price: 2000,
};

export const CONSUMABLES: ConsumableDef[] = [BANDAGE, ESSENCE_UNBINDER];

export function getConsumable(id: ConsumableId): ConsumableDef {
  const def = CONSUMABLES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown consumable: ${id}`);
  return def;
}
