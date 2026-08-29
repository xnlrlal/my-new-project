// Pure time math for the village clock. No timers/side effects live here —
// main.ts owns the setInterval and feeds real elapsed seconds in; this module
// only knows how to turn "elapsed game-seconds" into a displayable date/time
// and how far to jump for a skip.

export type ClockSpeed = 1 | 2 | 4;

export const SECONDS_PER_HOUR = 3600;
const HOURS_PER_DAY = 24;
export const SECONDS_PER_GAME_DAY = HOURS_PER_DAY * SECONDS_PER_HOUR;

// 마을 내 하루 = 실시간 120초 (게임 내 1시간 = 실시간 5초와 일관됨: 24시간×5초=120초).
const REAL_SECONDS_PER_VILLAGE_DAY = 120;
const VILLAGE_CLOCK_SCALE = SECONDS_PER_GAME_DAY / REAL_SECONDS_PER_VILLAGE_DAY;

const JUDGMENT_CYCLE_DAYS = 30;
// 마스터 설정 반영: 미궁 개방(판단창)은 자정(00:00)에 뜬다 — 예전엔 06:00였음.
const JUDGMENT_HOUR = 0;
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
  day: number; // 1-indexed — but 0 is possible too, see gameDateTimeFromElapsed
  hour: number;
  minute: number;
}

// elapsedSeconds can be negative: completeComingOfAge() pins a fresh
// barbarian's villageElapsedSeconds to -3h ("0일차 21:00", 3 hours before
// the very first midnight) so the first judgment window lands exactly on
// day 1 00:00 instead of skipping a whole 30-day cycle ahead (see
// nextJudgmentPointSeconds — starting positive-but-past-cycle-0 made it
// search for the *next* cycle, landing on day 31). Math.floor already
// floors negative numbers correctly (day math below relies on that), but
// JS's `%` returns a result with the dividend's sign for a negative
// dividend (e.g. -10800 % 86400 === -10800, not the 75600 we want) — the
// extra `+ SECONDS_PER_GAME_DAY) % SECONDS_PER_GAME_DAY` turns that into
// proper Euclidean modulo. No behavior change for non-negative input.
export function gameDateTimeFromElapsed(elapsedSeconds: number): GameDateTime {
  const totalSeconds = Math.floor(elapsedSeconds);
  const day = Math.floor(totalSeconds / SECONDS_PER_GAME_DAY) + 1;
  const secondsIntoDay = ((totalSeconds % SECONDS_PER_GAME_DAY) + SECONDS_PER_GAME_DAY) % SECONDS_PER_GAME_DAY;
  const hour = Math.floor(secondsIntoDay / SECONDS_PER_HOUR);
  const minute = Math.floor((secondsIntoDay % SECONDS_PER_HOUR) / 60);
  return { day, hour, minute };
}

// "N일차 HH:MM" — the one display format for an absolute in-game date/time,
// shared by the village clock and (via dungeonElapsedSeconds fed through
// gameDateTimeFromElapsed) the in-dungeon clock, so the two never drift into
// visually different formats.
export function formatGameDateTime(dt: GameDateTime): string {
  return `${dt.day}일차 ${pad2(dt.hour)}:${pad2(dt.minute)}`;
}

// The next elapsed-seconds value at which a 30-day cycle reaches 00:00 —
// i.e. where the judgment window appears. Always strictly greater than the
// input, so repeated skips keep advancing one cycle at a time.
export function nextJudgmentPointSeconds(elapsedSeconds: number): number {
  const cycleIndex = Math.floor((elapsedSeconds - JUDGMENT_OFFSET_SECONDS) / JUDGMENT_CYCLE_SECONDS) + 1;
  return cycleIndex * JUDGMENT_CYCLE_SECONDS + JUDGMENT_OFFSET_SECONDS;
}

// Absolute villageElapsedSeconds value at which a given judgment cycle's
// 00:00 falls. Used when a player accepts a judgment: the dungeon "entry
// time" is defined as this boundary, not whatever villageElapsedSeconds has
// drifted to by the moment they click (the clock keeps advancing during the
// 30-second decision window).
export function judgmentBoundarySeconds(cycleIndex: number): number {
  return cycleIndex * JUDGMENT_CYCLE_SECONDS + JUDGMENT_OFFSET_SECONDS;
}

// Detects whether a tick's elapsed-time advance (prevElapsed -> newElapsed)
// crossed an unanswered judgment boundary, and if so returns that boundary's
// cycle index (0-indexed: cycle 0 is the very first 00:00, 30 days in).
// Returns null if no unanswered boundary was crossed. Walking forward one
// cycle at a time (rather than a closed-form check) keeps this correct even
// if a single tick's delta happens to leap over more than one 30-day cycle.
export function crossedJudgmentCycle(prevElapsed: number, newElapsed: number, lastAnsweredCycle: number | null): number | null {
  let cycleIndex = Math.max(0, Math.floor((prevElapsed - JUDGMENT_OFFSET_SECONDS) / JUDGMENT_CYCLE_SECONDS));
  for (let guard = 0; guard < 10000; guard++) {
    const boundary = judgmentBoundarySeconds(cycleIndex);
    if (boundary > newElapsed) return null;
    if (boundary > prevElapsed && lastAnsweredCycle !== cycleIndex) return cycleIndex;
    cycleIndex++;
  }
  return null;
}

// 1년 = 30일 판단 주기 12번 분량(360일). 12번째 판단창(361일차 00:00)이 뜨는
// 바로 그 순간에 첫 세금 경계도 함께 겹치도록 의도적으로 맞춘 값 — 30과 360이
// 정확히 나누어떨어지므로 이 겹침은 매 12번째 판단 사이클마다 규칙적으로
// 발생한다 (tax.ts의 연간 세금 시스템 설계 참고). 판단창이 자정에 뜨도록
// 바뀌기 전(구 06:00)에는 "같은 날, 다른 시각"에 겹쳤지만 지금은 정확히
// 같은 순간에 겹친다.
export const TAX_YEAR_DAYS = 360;
const TAX_YEAR_SECONDS = SECONDS_PER_GAME_DAY * TAX_YEAR_DAYS;

// crossedJudgmentCycle과 완전히 같은 구조의 경계 감지 — 주기 길이만 다르다.
// yearIndex는 0부터 시작하며, yearIndex=0의 경계(정확히 360일 경과 시점)를
// 넘는 것이 "1년차가 끝나고 2년차가 시작"되는 최초의 징수 시점이다. 즉
// "첫해 면제"는 별도 조건 없이 이 함수가 360일이 지나기 전까진 아무것도
// 반환하지 않는다는 사실만으로 자연스럽게 성립한다.
export function crossedTaxYear(prevElapsed: number, newElapsed: number, lastTaxedYear: number | null): number | null {
  let yearIndex = Math.max(0, Math.floor(prevElapsed / TAX_YEAR_SECONDS));
  for (let guard = 0; guard < 10000; guard++) {
    const boundary = (yearIndex + 1) * TAX_YEAR_SECONDS;
    if (boundary > newElapsed) return null;
    if (boundary > prevElapsed && lastTaxedYear !== yearIndex) return yearIndex;
    yearIndex++;
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
