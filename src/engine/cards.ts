import type { Card } from './types';

export const CARD_POOL: Card[] = [
  { id: 'strike', name: '베기', cost: 1, effect: 'damage', value: 6, description: '적에게 6의 피해를 준다.' },
  { id: 'heavy-strike', name: '강타', cost: 2, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
  { id: 'guard', name: '방어', cost: 1, effect: 'shield', value: 5, description: '방어막 5를 얻는다.' },
  { id: 'bandage', name: '응급처치', cost: 1, effect: 'heal', value: 4, description: '체력을 4 회복한다.' },
  { id: 'pierce', name: '관통', cost: 2, effect: 'damage', value: 8, description: '적에게 8의 피해를 준다.' },
];

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 4; i++) deck.push({ ...CARD_POOL[0] });
  for (let i = 0; i < 2; i++) deck.push({ ...CARD_POOL[1] });
  for (let i = 0; i < 3; i++) deck.push({ ...CARD_POOL[2] });
  for (let i = 0; i < 2; i++) deck.push({ ...CARD_POOL[3] });
  for (let i = 0; i < 2; i++) deck.push({ ...CARD_POOL[4] });
  return deck.map((card, index) => ({ ...card, id: `${card.id}-${index}` }));
}
