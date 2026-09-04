import type { Card } from './types';
import type { EssenceStatBonus, MonsterDef } from './monsters';

export interface EquippedEssence {
  id: string;
  monsterId: string;
  monsterName: string;
  monsterGrade: number;
  statBonus: EssenceStatBonus;
  skill: Omit<Card, 'id'>;
}

let essenceCounter = 0;

export function createEssenceFromMonster(monster: MonsterDef): EquippedEssence {
  essenceCounter += 1;
  return {
    id: `essence-${monster.id}-${Date.now()}-${essenceCounter}`,
    monsterId: monster.id,
    monsterName: monster.name,
    monsterGrade: monster.grade,
    statBonus: monster.essence.statBonus,
    skill: monster.essence.skill,
  };
}

export function essenceSkillCards(essences: EquippedEssence[]): Card[] {
  return essences.map((essence, index) => ({ ...essence.skill, id: `${essence.id}-skill-${index}`, isEssenceSkill: true }));
}
