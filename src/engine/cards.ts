import type { Card } from './types';

// 체력 풀을 전 종족/몬스터 100으로 통일하면서(races.ts/monsters.ts 참고),
// 예전 6~45짜리 체력 풀 기준으로 잡혀있던 카드 값들도 함께 3배 스케일업
// 했다(처음엔 5배로 시도했으나, 그러면 몬스터가 플레이어를 때리는 피해도
// 똑같이 커져서 한 판당 체력 소모 비율이 예전과 똑같아지는 역효과가
// 시뮬레이션으로 확인됨 — engine.ts의 DEXTERITY_DEFENSE_COEF/
// WILLPOWER_REGEN_COEF를 함께 올려 완충하는 3배 선에서 재조정). 코스트/
// 마나 경제는 손대지 않았다.
export const CARD_POOL: Card[] = [
  { id: 'strike', name: '베기', cost: 1, effect: 'damage', value: 12, description: '적에게 12의 피해를 준다.' },
  { id: 'heavy-strike', name: '강타', cost: 2, effect: 'damage', value: 22, description: '적에게 22의 피해를 준다.' },
  { id: 'guard', name: '방어', cost: 1, effect: 'shield', value: 10, description: '방어막 10을 얻는다.' },
  {
    id: 'pierce',
    name: '관통',
    cost: 2,
    effect: 'damage',
    value: 16,
    description: '적에게 16의 피해를 주고, 명중 시 출혈을 부여한다.',
    appliesStatusEffect: { type: 'bleed', duration: 3 },
  },
];

export function buildDeck(bonusCards: Card[] = []): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 4; i++) deck.push({ ...CARD_POOL[0] });
  for (let i = 0; i < 2; i++) deck.push({ ...CARD_POOL[1] });
  for (let i = 0; i < 3; i++) deck.push({ ...CARD_POOL[2] });
  for (let i = 0; i < 2; i++) deck.push({ ...CARD_POOL[3] });
  for (const bonus of bonusCards) {
    deck.push({ ...bonus });
    deck.push({ ...bonus });
  }
  return deck.map((card, index) => ({ ...card, id: `${card.id}-${index}` }));
}
