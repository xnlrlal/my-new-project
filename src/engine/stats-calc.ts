import type { RaceStats } from './races';
import type { EquippedEssence } from './essence';
import type { EquipmentSlot, GearInstance } from './gear';
import { applyStatBonuses } from './stat-bonus';

export type EquippedGear = Partial<Record<EquipmentSlot, GearInstance>>;

export function computeTotalStats(base: RaceStats, essences: EquippedEssence[], gear: EquippedGear): RaceStats {
  const sources = [...essences, ...Object.values(gear).filter((g): g is GearInstance => Boolean(g))];
  return applyStatBonuses(base, sources);
}
