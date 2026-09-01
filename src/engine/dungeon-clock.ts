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

// 마스터 설정 반영: 미궁 개방(입장 가능 시각)이 자정(00:00)으로 바뀌면서
// 이 오프셋도 6시간→12시간으로 조정됨 — 실제 목적은 "그날 정오로 고정"
// (README 참고)이지, 특정 시간값을 더하는 것 자체가 아니다. 입장 시각이
// 바뀔 때마다 이 오프셋도 "자정~정오" 간격에 맞춰 함께 조정해야 한다.
const VILLAGE_NOON_OFFSET_SECONDS = 12 * SECONDS_PER_HOUR;

// However many in-dungeon days a run actually took, the village clock only
// ever advances a flat 12 hours from the moment of entry (00:00 -> that same
// day's noon) once a forced return happens.
export function villageNoonAfterForcedReturn(entryVillageSeconds: number): number {
  return entryVillageSeconds + VILLAGE_NOON_OFFSET_SECONDS;
}

// 몬스터 무리 스폰(designnotes.md 3-1번, 원래 "미착수"로 표시돼 있었으나
// 요청으로 1차 구현) — 미궁 체류 일수가 늘수록 한 번의 조우에서 연속으로
// 싸워야 하는 몬스터 수가 늘어난다. 노트의 제안대로("다중 몬스터 동시
// 전투 엔진 없이도 기존 1:1 전투를 연속 트리거하는 것만으로 구현 가능")
// 실제 전투는 여전히 1:1이고, main.ts가 한 마리를 이기면 남은 마릿수만큼
// 같은 구역에서 다음 전투를 바로 이어서 연다.
//
// 1층 수치는 노트에 명시된 그대로다: 1일차 단독 → 2일차 2마리 → 3일차
// 이후 3~4마리, 7일차 폐쇄까지 유지. 2층 수치("1층에선 서너 마리씩 나오던
// 게 열댓 마리로 늘어나고" — 정확한 조건은 노트에서도 미정)는 방향성만
// 가져온 1차 추정 곡선이라 요청하면 언제든 바꿀 수 있다.
export function packSizeForDay(floor: 1 | 2, elapsedSeconds: number): number {
  const day = dungeonDayCount(elapsedSeconds); // 0-indexed: 0 = "1일차"
  if (floor === 1) {
    if (day <= 0) return 1;
    if (day === 1) return 2;
    return 3 + Math.floor(Math.random() * 2); // 3~4마리
  }
  if (day <= 0) return 2;
  if (day === 1) return 4;
  if (day === 2) return 6;
  return 8 + Math.floor(Math.random() * 5); // 8~12마리("열댓 마리" 근사)
}
