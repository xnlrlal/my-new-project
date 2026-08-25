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
  // Snapshot of floor 1's maze/position taken the moment the player enters
  // floor 2, so backtracking (while unlocked) resumes exactly where floor 1
  // was left rather than regenerating it — regenerating would reopen the
  // portal-EXP-farming exploit the same way the removed "메인 메뉴로" did.
  floor1Maze: SerializedDungeonMaze | null;
  floor1Pos: CellId | null;
  // Same idea in the other direction: each floor-2 zone's maze/position is
  // snapshotted the moment the player leaves it (reverts to floor 1), keyed
  // by theme zone, so re-entering that same zone later reuses it instead of
  // generating a fresh one. Only a zone's very first-ever entry (nothing
  // saved for it yet) generates a new maze.
  floor2Zones: Partial<Record<ArmZone, { maze: SerializedDungeonMaze; pos: CellId }>>;
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
