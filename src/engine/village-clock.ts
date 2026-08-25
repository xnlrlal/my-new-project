// Pure time math for the village clock. No timers/side effects live here —
// main.ts owns the setInterval and feeds real elapsed seconds in; this module
// only knows how to turn "elapsed game-seconds" into a displayable date/time
// and how far to jump for a skip.

export type ClockSpeed = 1 | 2 | 4;

const SECONDS_PER_HOUR = 3600;
const HOURS_PER_DAY = 24;
const SECONDS_PER_GAME_DAY = HOURS_PER_DAY * SECONDS_PER_HOUR;

// 마을 내 하루 = 실시간 60초.
const REAL_SECONDS_PER_VILLAGE_DAY = 60;
const VILLAGE_CLOCK_SCALE = SECONDS_PER_GAME_DAY / REAL_SECONDS_PER_VILLAGE_DAY;

const JUDGMENT_CYCLE_DAYS = 30;
const JUDGMENT_HOUR = 6;

export function advanceVillageClock(elapsedSeconds: number, realDeltaSeconds: number, speed: ClockSpeed): number {
  if (realDeltaSeconds <= 0) return elapsedSeconds;
  return elapsedSeconds + realDeltaSeconds * VILLAGE_CLOCK_SCALE * speed;
}

export interface GameDateTime {
  day: number; // 1-indexed
  hour: number;
  minute: number;
}

export function gameDateTimeFromElapsed(elapsedSeconds: number): GameDateTime {
  const totalSeconds = Math.floor(Math.max(0, elapsedSeconds));
  const day = Math.floor(totalSeconds / SECONDS_PER_GAME_DAY) + 1;
  const secondsIntoDay = totalSeconds % SECONDS_PER_GAME_DAY;
  const hour = Math.floor(secondsIntoDay / SECONDS_PER_HOUR);
  const minute = Math.floor((secondsIntoDay % SECONDS_PER_HOUR) / 60);
  return { day, hour, minute };
}

// The next elapsed-seconds value at which a 30-day cycle reaches 06:00 —
// i.e. where stage 2's judgment window will appear. Always strictly greater
// than the input, so repeated skips keep advancing one cycle at a time.
export function nextJudgmentPointSeconds(elapsedSeconds: number): number {
  const cycleSeconds = JUDGMENT_CYCLE_DAYS * SECONDS_PER_GAME_DAY;
  const judgmentOffset = JUDGMENT_HOUR * SECONDS_PER_HOUR;
  const cycleIndex = Math.floor((elapsedSeconds - judgmentOffset) / cycleSeconds) + 1;
  return cycleIndex * cycleSeconds + judgmentOffset;
}
