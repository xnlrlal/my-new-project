import type { Card } from './types';
import type { RaceStats } from './races';
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

export function combineStats(base: RaceStats, essences: EquippedEssence[]): RaceStats {
  return essences.reduce<RaceStats>(
    (acc, essence) => ({
      maxHp: acc.maxHp + (essence.statBonus.maxHp ?? 0),
      maxMana: acc.maxMana + (essence.statBonus.maxMana ?? 0),
      attackBonus: acc.attackBonus + (essence.statBonus.attackBonus ?? 0),
      defenseBonus: acc.defenseBonus + (essence.statBonus.defenseBonus ?? 0),
    }),
    { ...base }
  );
}

export function essenceSkillCards(essences: EquippedEssence[]): Card[] {
  return essences.map((essence, index) => ({ ...essence.skill, id: `${essence.id}-skill-${index}` }));
}
