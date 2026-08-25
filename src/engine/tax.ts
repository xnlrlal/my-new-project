import type { PlayerProfile } from './profile';
import { crossedTaxYear } from './village-clock';

// Master off switch for the whole annual tax system. Currently the mana
// stone exchange rates (환전소, exchange.ts) were balanced against a
// hypothetical "5층까지 탐험하는 플레이어", but only floors 1-2 actually
// exist yet — a 1-2층 player forced to pay real tax under that economy
// could die unfairly. Leave this false until that balance is re-verified
// against the floors that actually exist, then flip it on here (the one
// place this needs to change).
export const TAX_SYSTEM_ENABLED = false;

export const ANNUAL_TAX_AMOUNT = 700000;

export interface TaxOutcome {
  profile: PlayerProfile;
  // Set only when a real charge happened (TAX_SYSTEM_ENABLED and the player
  // could afford it) — i.e. "worth telling the player about". null both
  // when no boundary was crossed and when one was crossed but the system is
  // off (lastTaxedYear still advances silently in that case — see below).
  taxedYear: number | null;
  died: boolean;
}

// Checks whether a village-time advance (prevElapsed -> newElapsed) crossed
// an unpaid tax-year boundary and, if so, applies it: deducts
// ANNUAL_TAX_AMOUNT if affordable, or signals death (died: true, profile
// unchanged — the caller resets it) if not.
//
// While TAX_SYSTEM_ENABLED is false, a crossed boundary still advances
// profile.lastTaxedYear (no deduction, no death) so that lastTaxedYear
// never falls behind real elapsed time. This matters because flipping the
// switch on later must not retroactively bill every year that passed while
// it was off — lastTaxedYear already being caught up avoids that.
export function applyAnnualTaxIfCrossed(profile: PlayerProfile, prevElapsed: number, newElapsed: number): TaxOutcome {
  const crossedYear = crossedTaxYear(prevElapsed, newElapsed, profile.lastTaxedYear);
  if (crossedYear === null) return { profile, taxedYear: null, died: false };

  if (!TAX_SYSTEM_ENABLED) {
    return { profile: { ...profile, lastTaxedYear: crossedYear }, taxedYear: null, died: false };
  }

  if (profile.gold < ANNUAL_TAX_AMOUNT) {
    return { profile, taxedYear: crossedYear, died: true };
  }

  return {
    profile: { ...profile, gold: profile.gold - ANNUAL_TAX_AMOUNT, lastTaxedYear: crossedYear },
    taxedYear: crossedYear,
    died: false,
  };
}
