/*
  # IronHaven AIMMO - Security model: anonymous-auth ownership + owner-scoped RLS

  Phase A+B of the security plan. Players sign in anonymously (Supabase Auth),
  so every request carries a JWT with auth.uid(). Each owned table gains an
  `owner uuid` column stamped from auth.uid() on insert, and the wide-open
  anon_all_* policies are replaced with owner-scoped ones.

  Tenancy model:
    - players, game_sessions  -> fully private (read/write own rows only)
    - multiplayer_players      -> public SELECT (presence + realtime), own writes
    - world_events             -> public SELECT, writes via service_role only

  NOTE: this is a breaking, coordinated change. The client must establish the
  anonymous session (see src/lib/supabase.ts ensureAuthUser) BEFORE any DB write,
  otherwise inserts run as the anon role and are rejected. Rows created before
  this migration have owner = NULL and become inaccessible by design.

  Economy integrity (clamping money/skills, server-authoritative purchases) is a
  later phase (C) via RPC; RLS here only enforces *who* may touch *which* row.
*/

-- 1. Ownership columns (stamped from the JWT; clients never send owner) --------
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS owner uuid DEFAULT auth.uid()
    REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS owner uuid DEFAULT auth.uid()
    REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE multiplayer_players
  ADD COLUMN IF NOT EXISTS owner uuid DEFAULT auth.uid()
    REFERENCES auth.users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_players_owner ON players (owner);
CREATE INDEX IF NOT EXISTS idx_game_sessions_owner ON game_sessions (owner);
CREATE INDEX IF NOT EXISTS idx_multiplayer_owner ON multiplayer_players (owner);

-- 2. Drop the permissive vertical-slice policies ------------------------------
DROP POLICY IF EXISTS "anon_all_players" ON players;
DROP POLICY IF EXISTS "anon_all_game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "anon_all_multiplayer_players" ON multiplayer_players;
DROP POLICY IF EXISTS "anon_all_world_events" ON world_events;

-- 3. players: fully private --------------------------------------------------
CREATE POLICY "players_select_own" ON players
  FOR SELECT TO authenticated USING (owner = auth.uid());
CREATE POLICY "players_insert_own" ON players
  FOR INSERT TO authenticated WITH CHECK (owner = auth.uid());
CREATE POLICY "players_update_own" ON players
  FOR UPDATE TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
CREATE POLICY "players_delete_own" ON players
  FOR DELETE TO authenticated USING (owner = auth.uid());

-- 4. game_sessions: fully private --------------------------------------------
CREATE POLICY "sessions_select_own" ON game_sessions
  FOR SELECT TO authenticated USING (owner = auth.uid());
CREATE POLICY "sessions_insert_own" ON game_sessions
  FOR INSERT TO authenticated WITH CHECK (owner = auth.uid());
CREATE POLICY "sessions_update_own" ON game_sessions
  FOR UPDATE TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
CREATE POLICY "sessions_delete_own" ON game_sessions
  FOR DELETE TO authenticated USING (owner = auth.uid());

-- 5. multiplayer_players: public presence, owner-only writes -----------------
-- SELECT must stay open so every client (and the realtime postgres_changes
-- stream, which enforces RLS) can see other players in the world.
CREATE POLICY "mp_select_all" ON multiplayer_players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "mp_insert_own" ON multiplayer_players
  FOR INSERT TO authenticated WITH CHECK (owner = auth.uid());
CREATE POLICY "mp_update_own" ON multiplayer_players
  FOR UPDATE TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
CREATE POLICY "mp_delete_own" ON multiplayer_players
  FOR DELETE TO authenticated USING (owner = auth.uid());

-- 6. world_events: public read, server-authored only -------------------------
-- No write policies => only service_role (which bypasses RLS) can mutate.
CREATE POLICY "we_select_all" ON world_events
  FOR SELECT TO anon, authenticated USING (true);
