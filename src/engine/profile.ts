import type { MonsterDef } from './monsters';
import { expForGrade } from './monsters';
import type { EquippedEssence } from './essence';

const STORAGE_KEY = 'my-new-project:profile';
const EXP_PER_LEVEL = 20;

export interface PlayerProfile {
  level: number;
  exp: number;
  defeatedMonsterNames: string[];
  essences: EquippedEssence[];
}

function defaultProfile(): PlayerProfile {
  return { level: 1, exp: 0, defeatedMonsterNames: [], essences: [] };
}

export function maxEssenceSlots(profile: PlayerProfile): number {
  return profile.level;
}

export function hasOpenEssenceSlot(profile: PlayerProfile): boolean {
  return profile.essences.length < maxEssenceSlots(profile);
}

export function absorbEssence(profile: PlayerProfile, essence: EquippedEssence): PlayerProfile {
  if (!hasOpenEssenceSlot(profile)) return profile;
  return { ...profile, essences: [...profile.essences, essence] };
}

export function expToNextLevel(level: number): number {
  return level * EXP_PER_LEVEL;
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return {
      level: typeof parsed.level === 'number' ? parsed.level : 1,
      exp: typeof parsed.exp === 'number' ? parsed.exp : 0,
      defeatedMonsterNames: Array.isArray(parsed.defeatedMonsterNames) ? parsed.defeatedMonsterNames : [],
      essences: Array.isArray(parsed.essences) ? parsed.essences : [],
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable (private mode, disabled) — progress just won't persist
  }
}

export interface ExpGrantResult {
  profile: PlayerProfile;
  gained: number;
  leveledUp: boolean;
  alreadyDefeated: boolean;
}

export function grantExpForKill(profile: PlayerProfile, monster: MonsterDef): ExpGrantResult {
  if (profile.defeatedMonsterNames.includes(monster.name)) {
    return { profile, gained: 0, leveledUp: false, alreadyDefeated: true };
  }

  const gained = expForGrade(monster.grade);
  let level = profile.level;
  let exp = profile.exp + gained;
  let leveledUp = false;

  while (exp >= expToNextLevel(level)) {
    exp -= expToNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  const next: PlayerProfile = {
    ...profile,
    level,
    exp,
    defeatedMonsterNames: [...profile.defeatedMonsterNames, monster.name],
  };

  return { profile: next, gained, leveledUp, alreadyDefeated: false };
}
