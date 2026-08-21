export interface MonsterDef {
  id: string;
  name: string;
  grade: number;
  maxHp: number;
  maxMana: number;
}

export const MONSTERS: MonsterDef[] = [
  { id: 'slime', name: '슬라임', grade: 1, maxHp: 18, maxMana: 2 },
  { id: 'goblin', name: '고블린', grade: 2, maxHp: 24, maxMana: 2 },
  { id: 'wolf', name: '늑대', grade: 3, maxHp: 30, maxMana: 3 },
  { id: 'bandit', name: '도적', grade: 4, maxHp: 36, maxMana: 3 },
  { id: 'orc-warrior', name: '오크 전사', grade: 5, maxHp: 42, maxMana: 3 },
  { id: 'dark-mage', name: '다크 메이지', grade: 6, maxHp: 40, maxMana: 5 },
  { id: 'troll', name: '트롤', grade: 7, maxHp: 55, maxMana: 3 },
  { id: 'wyvern', name: '와이번', grade: 8, maxHp: 60, maxMana: 4 },
  { id: 'lich', name: '리치', grade: 9, maxHp: 62, maxMana: 6 },
  { id: 'dragon', name: '드래곤', grade: 10, maxHp: 80, maxMana: 6 },
];

export function expForGrade(grade: number): number {
  return grade;
}

export function pickRandomMonster(): MonsterDef {
  return MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
}
