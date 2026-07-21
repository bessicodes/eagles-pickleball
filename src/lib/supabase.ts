// =====================================================================
//  Supabase adapter — READY TO WIRE.
//
//  The app ships with a self-contained local engine (store.ts) so the
//  full flow works with `npm run dev` and zero backend. When you're ready
//  to go live:
//    1. Create a Supabase project.
//    2. Run supabase/schema.sql then supabase/seed.sql.
//    3. Put NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in .env.local.
//    4. Set NEXT_PUBLIC_USE_SUPABASE=true.
//
//  `getSupabase()` returns a typed client (or null when unconfigured), and
//  `usingSupabase()` tells the data layer which path to take. Realtime
//  subscriptions map directly onto the tables in schema.sql.
// =====================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function usingSupabase(): boolean {
  return process.env.NEXT_PUBLIC_USE_SUPABASE === 'true' && !!url && !!anon;
}

export function getSupabase(): SupabaseClient | null {
  if (!usingSupabase()) return null;
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}

/*
  ─── Example realtime wiring (drop into a client effect when live) ───

  const sb = getSupabase();
  if (sb) {
    const channel = sb
      .channel('eagles-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, refresh)
      .subscribe();
    return () => sb.removeChannel(channel);
  }

  ─── Example scoring RPC (matches complete_match() in schema.sql) ───

  await sb.rpc('complete_match', { p_match_id: id, p_score_a: a, p_score_b: b });
*/
