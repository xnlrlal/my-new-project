import { supabase } from './supabase-client';
import { sanitizeProfile, type PlayerProfile } from './profile';

const TABLE = 'profiles';

export async function loadCloudProfile(userId: string): Promise<PlayerProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  // Same defensive parsing as the local path (loadProfile) — a cloud row
  // written before a field existed shouldn't crash on it.
  return sanitizeProfile(data.data);
}

export async function saveCloudProfile(userId: string, profile: PlayerProfile): Promise<void> {
  if (!supabase) return;

  await supabase.from(TABLE).upsert({ user_id: userId, data: profile, updated_at: new Date().toISOString() });
}
