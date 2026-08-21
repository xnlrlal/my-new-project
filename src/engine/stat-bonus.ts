export interface StatBonus {
  maxHp?: number;
  maxMana?: number;
  attackBonus?: number;
  defenseBonus?: number;
}

export interface RaceStatsLike {
  maxHp: number;
  maxMana: number;
  attackBonus: number;
  defenseBonus: number;
}

export function applyStatBonuses(base: RaceStatsLike, sources: { statBonus: StatBonus }[]): RaceStatsLike {
  return sources.reduce<RaceStatsLike>(
    (acc, source) => ({
      maxHp: acc.maxHp + (source.statBonus.maxHp ?? 0),
      maxMana: acc.maxMana + (source.statBonus.maxMana ?? 0),
      attackBonus: acc.attackBonus + (source.statBonus.attackBonus ?? 0),
      defenseBonus: acc.defenseBonus + (source.statBonus.defenseBonus ?? 0),
    }),
    { ...base }
  );
}

export function statBonusText(statBonus: StatBonus): string {
  const parts: string[] = [];
  if (statBonus.maxHp) parts.push(`체력 +${statBonus.maxHp}`);
  if (statBonus.maxMana) parts.push(`마나 +${statBonus.maxMana}`);
  if (statBonus.attackBonus) parts.push(`공격 +${statBonus.attackBonus}`);
  if (statBonus.defenseBonus) parts.push(`방어 +${statBonus.defenseBonus}`);
  return parts.join(' · ') || '보너스 없음';
}
