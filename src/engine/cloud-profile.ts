import { supabase } from './supabase-client';
import { sanitizeProfile, type PlayerProfile } from './profile';

const TABLE = 'profiles';

// Distinguishes "this account has no cloud save yet" (not_found — safe to
// push the local profile up) from "we couldn't tell" (error — a network
// blip, timeout, or RLS hiccup). The two used to be collapsed into the same
// `null` return, which meant a transient read error looked identical to a
// brand-new account and caused adoptLoggedInProfile (main.ts) to overwrite
// a real cloud save with whatever blank/guest profile was loaded locally.
export type CloudProfileResult =
  | { status: 'found'; profile: PlayerProfile }
  | { status: 'not_found' }
  | { status: 'error' };

export async function loadCloudProfile(userId: string): Promise<CloudProfileResult> {
  if (!supabase) return { status: 'error' };

  const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  if (error) return { status: 'error' };
  if (!data) return { status: 'not_found' };
  // Same defensive parsing as the local path (loadProfile) — a cloud row
  // written before a field existed shouldn't crash on it.
  return { status: 'found', profile: sanitizeProfile(data.data) };
}

export async function saveCloudProfile(userId: string, profile: PlayerProfile): Promise<void> {
  if (!supabase) return;

  await supabase.from(TABLE).upsert({ user_id: userId, data: profile, updated_at: new Date().toISOString() });
}
