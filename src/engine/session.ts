import type { GameState } from './types';
import type { ArmZone, CellId, SerializedDungeonMaze } from './dungeon';
import type { EquippedEssence } from './essence';
import type { ExpGrantResult } from './profile';

// Screens that hold enough gameplay state to be worth resuming into exactly.
// auth/menu/character-select carry no extra state, so they collapse to
// 'village' (or no session at all) when captured.
export type ResumableScreen =
  | 'village'
  | 'stats'
  | 'dungeon-map'
  | 'battle'
  | 'inventory'
  | 'equipment'
  | 'essence'
  | 'shop'
  | 'library';

export interface ResumeSession {
  screen: ResumableScreen;
  returnScreen: ResumableScreen;
  dungeonFloor: 1 | 2;
  dungeonThemeZone: ArmZone | null;
  maze: SerializedDungeonMaze | null;
  pos: CellId | null;
  // Cumulative in-dungeon clock, running since entry (not reset per floor)
  // and independent of the village clock, which is frozen for the duration.
  dungeonElapsedSeconds: number;
  // villageElapsedSeconds at the exact judgment boundary this run was
  // accepted at — used to compute "그날 정오" if a forced return happens.
  dungeonEntryVillageSeconds: number;
  dungeonMessage: string | null;
  portalMessage: string | null;
  currentMonsterId: string | null;
  state: GameState | null;
  skipEligible: boolean;
  expResult: ExpGrantResult | null;
  expChecked: boolean;
  dropChecked: boolean;
  pendingEssence: EquippedEssence | null;
  essenceOutcome: string | null;
}
