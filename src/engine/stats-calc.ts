import type { RaceStats } from './races';
import type { EquippedEssence } from './essence';
import type { EquipmentSlot, GearInstance } from './gear';
import { applyStatBonuses, type StatBonus } from './stat-bonus';

export type EquippedGear = Partial<Record<EquipmentSlot, GearInstance>>;

// achievementBonus is a permanent, character-lifetime StatBonus accumulated
// by achievements (see profile.ts's achievementStatBonus) — folded in as
// just another source alongside essences/gear so it goes through the same
// STAT_FIELDS-based reducer, not a separate hand-rolled addition.
export function computeTotalStats(
  base: RaceStats,
  essences: EquippedEssence[],
  gear: EquippedGear,
  achievementBonus: StatBonus = {}
): RaceStats {
  const sources = [...essences, ...Object.values(gear).filter((g): g is GearInstance => Boolean(g)), { statBonus: achievementBonus }];
  return applyStatBonuses(base, sources);
}
