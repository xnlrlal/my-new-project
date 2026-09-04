import type { GameState } from './types';
import type { ArmZone, CellId, SerializedDungeonMaze } from './dungeon';
import type { EquippedEssence } from './essence';
import type { ExpGrantResult } from './profile';

// Screens that hold enough gameplay state to be worth resuming into exactly.
// auth/menu/character-select carry no extra state, so they collapse to
// 'village' (or no session at all) when captured.
export type ResumableScreen =
  | 'ritual'
  | 'village'
  | 'stats'
  | 'dungeon-map'
  | 'battle'
  | 'inventory'
  | 'equipment'
  | 'essence'
  | 'shop'
  | 'library'
  | 'exchange'
  | 'temple';

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
  // 인간형 NPC 조우(designnotes.md 3-6번, npc.ts) 중일 때만 채워진다 —
  // currentMonsterId와 배타적(둘이 동시에 채워질 일 없음, main.ts의
  // startZoneBattle/startNpcEncounter가 각각 반대쪽을 null로 정리한다).
  currentNpcId: string | null;
  state: GameState | null;
  // Player HP carried across battles within this dungeon run (survives
  // dungeon-map navigation and subscreens, not just mid-battle reloads —
  // `state` alone only covers the latter). Full HP on a brand-new dungeon
  // entry, null once there's no active run (mirrors `maze`).
  dungeonHp: number | null;
  // Raw estimateWinProbability() result (0-1) from this battle's start —
  // kept as the raw probability (not just a threshold boolean) so the
  // auto-battle mode's "예상 승률 N%" button label survives a reload.
  // null when not in a battle, or for sessions saved before this field
  // existed (see sanitizeResumeSession's default below).
  winProbability: number | null;
  expResult: ExpGrantResult | null;
  expChecked: boolean;
  dropChecked: boolean;
  pendingEssence: EquippedEssence | null;
  essenceOutcome: string | null;
  // 몬스터 무리 스폰(dungeon-clock.ts의 packSizeForDay 참고) — 이번 조우의
  // 전체 마릿수(packTotal, 무리가 아니면 1)와 현재 전투 이후로 남은
  // 마릿수(packRemaining). 층 이동/강제 귀환/사망 시 둘 다 초기화된다.
  packTotal: number;
  packRemaining: number;
}

const RESUMABLE_SCREENS: readonly ResumableScreen[] = [
  'ritual',
  'village',
  'stats',
  'dungeon-map',
  'battle',
  'inventory',
  'equipment',
  'essence',
  'shop',
  'library',
  'exchange',
  'temple',
];

function isResumableScreen(value: unknown): value is ResumableScreen {
  return typeof value === 'string' && (RESUMABLE_SCREENS as readonly string[]).includes(value);
}

const ARM_ZONES: readonly ArmZone[] = ['north', 'east', 'south', 'west'];

function isArmZone(value: unknown): value is ArmZone {
  return typeof value === 'string' && (ARM_ZONES as readonly string[]).includes(value);
}

function sanitizeFloor2Zones(raw: unknown): ResumeSession['floor2Zones'] {
  if (!raw || typeof raw !== 'object') return {};
  const result: ResumeSession['floor2Zones'] = {};
  for (const [zone, saved] of Object.entries(raw as Record<string, unknown>)) {
    if (!isArmZone(zone) || !saved || typeof saved !== 'object') continue;
    const s = saved as Record<string, unknown>;
    if (!s.maze || typeof s.maze !== 'object' || typeof s.pos !== 'string') continue;
    result[zone] = { maze: s.maze as SerializedDungeonMaze, pos: s.pos };
  }
  return result;
}

// Defensively parses a raw, possibly legacy-shaped or untyped (e.g. a bare
// cloud API response) value into a valid ResumeSession, filling in any
// field a save made before it existed (this type has grown several times:
// floor1Maze/floor1Pos, floor2Zones, dungeonElapsedSeconds, ...) with a safe
// default instead of leaving it undefined. Returns null only when there's no
// reasonable screen to resume into at all — callers should treat that as
// "nothing to resume, fall back to village" rather than an error.
//
// Whenever a new ResumeSession field is added in the future, add its
// default here too, so an old save with that field missing degrades to a
// safe default instead of crashing deserializeMaze()/Object.entries()/etc.
// on undefined the way this function was written to fix.
export function sanitizeResumeSession(raw: unknown): ResumeSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isResumableScreen(r.screen)) return null;

  return {
    screen: r.screen,
    returnScreen: isResumableScreen(r.returnScreen) ? r.returnScreen : 'stats',
    dungeonFloor: r.dungeonFloor === 2 ? 2 : 1,
    dungeonThemeZone: isArmZone(r.dungeonThemeZone) ? r.dungeonThemeZone : null,
    maze: r.maze && typeof r.maze === 'object' ? (r.maze as SerializedDungeonMaze) : null,
    pos: typeof r.pos === 'string' ? r.pos : null,
    floor1Maze: r.floor1Maze && typeof r.floor1Maze === 'object' ? (r.floor1Maze as SerializedDungeonMaze) : null,
    floor1Pos: typeof r.floor1Pos === 'string' ? r.floor1Pos : null,
    floor2Zones: sanitizeFloor2Zones(r.floor2Zones),
    dungeonElapsedSeconds: typeof r.dungeonElapsedSeconds === 'number' ? r.dungeonElapsedSeconds : 0,
    dungeonEntryVillageSeconds: typeof r.dungeonEntryVillageSeconds === 'number' ? r.dungeonEntryVillageSeconds : 0,
    dungeonMessage: typeof r.dungeonMessage === 'string' ? r.dungeonMessage : null,
    portalMessage: typeof r.portalMessage === 'string' ? r.portalMessage : null,
    currentMonsterId: typeof r.currentMonsterId === 'string' ? r.currentMonsterId : null,
    currentNpcId: typeof r.currentNpcId === 'string' ? r.currentNpcId : null,
    state: r.state && typeof r.state === 'object' ? (r.state as GameState) : null,
    dungeonHp: typeof r.dungeonHp === 'number' ? r.dungeonHp : null,
    winProbability: typeof r.winProbability === 'number' ? r.winProbability : null,
    expResult: r.expResult && typeof r.expResult === 'object' ? (r.expResult as ExpGrantResult) : null,
    expChecked: typeof r.expChecked === 'boolean' ? r.expChecked : false,
    dropChecked: typeof r.dropChecked === 'boolean' ? r.dropChecked : false,
    pendingEssence: r.pendingEssence && typeof r.pendingEssence === 'object' ? (r.pendingEssence as EquippedEssence) : null,
    essenceOutcome: typeof r.essenceOutcome === 'string' ? r.essenceOutcome : null,
    packTotal: typeof r.packTotal === 'number' ? r.packTotal : 1,
    packRemaining: typeof r.packRemaining === 'number' ? r.packRemaining : 0,
  };
}
