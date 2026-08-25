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
const JUDGMENT_CYCLE_SECONDS = JUDGMENT_CYCLE_DAYS * SECONDS_PER_GAME_DAY;
const JUDGMENT_OFFSET_SECONDS = JUDGMENT_HOUR * SECONDS_PER_HOUR;

// The 30-second real-time window the player has to answer once a judgment
// cycle opens. Deliberately real seconds, not scaled by clockSpeed — this is
// decision pressure on the player, not in-game time passing.
export const JUDGMENT_COUNTDOWN_SECONDS = 30;

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
// i.e. where the judgment window appears. Always strictly greater than the
// input, so repeated skips keep advancing one cycle at a time.
export function nextJudgmentPointSeconds(elapsedSeconds: number): number {
  const cycleIndex = Math.floor((elapsedSeconds - JUDGMENT_OFFSET_SECONDS) / JUDGMENT_CYCLE_SECONDS) + 1;
  return cycleIndex * JUDGMENT_CYCLE_SECONDS + JUDGMENT_OFFSET_SECONDS;
}

function judgmentBoundaryForCycle(cycleIndex: number): number {
  return cycleIndex * JUDGMENT_CYCLE_SECONDS + JUDGMENT_OFFSET_SECONDS;
}

// Detects whether a tick's elapsed-time advance (prevElapsed -> newElapsed)
// crossed an unanswered judgment boundary, and if so returns that boundary's
// cycle index (0-indexed: cycle 0 is the very first 06:00, 30 days in).
// Returns null if no unanswered boundary was crossed. Walking forward one
// cycle at a time (rather than a closed-form check) keeps this correct even
// if a single tick's delta happens to leap over more than one 30-day cycle.
export function crossedJudgmentCycle(prevElapsed: number, newElapsed: number, lastAnsweredCycle: number | null): number | null {
  let cycleIndex = Math.max(0, Math.floor((prevElapsed - JUDGMENT_OFFSET_SECONDS) / JUDGMENT_CYCLE_SECONDS));
  for (let guard = 0; guard < 10000; guard++) {
    const boundary = judgmentBoundaryForCycle(cycleIndex);
    if (boundary > newElapsed) return null;
    if (boundary > prevElapsed && lastAnsweredCycle !== cycleIndex) return cycleIndex;
    cycleIndex++;
  }
  return null;
}

export interface GameDuration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Same breakdown as gameDateTimeFromElapsed but for a *duration* (0-indexed
// days, includes seconds) rather than an absolute in-game date/time.
export function gameDurationFromSeconds(seconds: number): GameDuration {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / SECONDS_PER_GAME_DAY);
  const secondsIntoDay = total % SECONDS_PER_GAME_DAY;
  const hours = Math.floor(secondsIntoDay / SECONDS_PER_HOUR);
  const minutes = Math.floor((secondsIntoDay % SECONDS_PER_HOUR) / 60);
  const secs = secondsIntoDay % 60;
  return { days, hours, minutes, seconds: secs };
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatGameDuration(d: GameDuration): string {
  const hms = `${pad2(d.hours)}:${pad2(d.minutes)}:${pad2(d.seconds)}`;
  return d.days > 0 ? `${d.days}일 ${hms}` : hms;
}
