// Pure time math for the dungeon's internal clock — separate from the
// village clock (village-clock.ts) since the two run on mutually exclusive
// conditions (village time only advances while there's no active dungeon
// run; dungeon time only advances while there is one) and at different,
// independently-fixed rates. No timers/side effects here; main.ts owns the
// setInterval and feeds real elapsed seconds in.

import { SECONDS_PER_GAME_DAY, SECONDS_PER_HOUR } from './village-clock';

// 미궁 내부: 하루 = 실시간 60초. 마을 시계의 배속 설정과는 무관하게 항상
// 고정 속도로 흐름 — 미궁 안에서는 시간 압박이 조절 대상이 아니라 위험
// 그 자체이기 때문.
const REAL_SECONDS_PER_DUNGEON_DAY = 60;
const DUNGEON_CLOCK_SCALE = SECONDS_PER_GAME_DAY / REAL_SECONDS_PER_DUNGEON_DAY;

export function advanceDungeonClock(elapsedSeconds: number, realDeltaSeconds: number): number {
  if (realDeltaSeconds <= 0) return elapsedSeconds;
  return elapsedSeconds + realDeltaSeconds * DUNGEON_CLOCK_SCALE;
}

const FLOOR1_FORCE_RETURN_DAY = 7;
const FLOOR2_FORCE_RETURN_DAY = 10;

function dungeonDayCount(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / SECONDS_PER_GAME_DAY);
}

// Cumulative time since dungeon entry (not per-floor — carries over across
// enterFloorTwo()) reaching the closure threshold for whichever floor the
// player is currently on. Floor 1 closes at 7 accumulated days; floor 2 at
// 10 — both counted from the same entry point, not reset per floor.
export function shouldForceDungeonReturn(elapsedSeconds: number, floor: 1 | 2): boolean {
  const days = dungeonDayCount(elapsedSeconds);
  return floor === 1 ? days >= FLOOR1_FORCE_RETURN_DAY : days >= FLOOR2_FORCE_RETURN_DAY;
}

// From the 7-day mark onward, floor 1 is no longer reachable by backtracking
// from floor 2 (stage 4 will enforce this at the UI/action level; this is
// just the underlying time check both that feature and shouldForceDungeonReturn
// share).
export function isFloor1RevertLocked(elapsedSeconds: number): boolean {
  return dungeonDayCount(elapsedSeconds) >= FLOOR1_FORCE_RETURN_DAY;
}

const VILLAGE_NOON_OFFSET_SECONDS = 6 * SECONDS_PER_HOUR;

// However many in-dungeon days a run actually took, the village clock only
// ever advances a flat 6 hours from the moment of entry (06:00 -> that same
// day's noon) once a forced return happens.
export function villageNoonAfterForcedReturn(entryVillageSeconds: number): number {
  return entryVillageSeconds + VILLAGE_NOON_OFFSET_SECONDS;
}
