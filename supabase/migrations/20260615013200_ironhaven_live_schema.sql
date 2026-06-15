/*
  # IronHaven AIMMO - Live vertical-slice schema

  Matches the columns/ids actually used by src/lib/persistence.ts and the
  Database type in src/lib/supabase.ts. Player/session ids are client-generated
  strings ("player_<uuid>", "session_<uuid>"), so id columns are TEXT.

  The game runs fully anonymously (anon key, no Supabase Auth), so RLS is
  enabled with permissive policies for the anon + authenticated roles. This is
  intentional for an open, login-less vertical slice.
*/

-- Players: persistent character state
CREATE TABLE IF NOT EXISTS players (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  position_x double precision DEFAULT 0,
  position_y double precision DEFAULT 1.5,
  position_z double precision DEFAULT 0,
  rotation double precision DEFAULT 0,
  health integer DEFAULT 100,
  reputation integer DEFAULT 0,
  wanted integer DEFAULT 0,
  money integer DEFAULT 1000,
  police_kill_count integer DEFAULT 0,
  skills jsonb DEFAULT '{}'::jsonb,
  inventory jsonb DEFAULT '[]'::jsonb,
  current_weapon_id text DEFAULT 'fists',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Game sessions: per-run stats
CREATE TABLE IF NOT EXISTS game_sessions (
  id text PRIMARY KEY,
  player_id text REFERENCES players(id) ON DELETE CASCADE,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  total_kills integer DEFAULT 0,
  total_money_earned integer DEFAULT 0,
  max_wanted_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Multiplayer presence snapshots (polled by getNearbyPlayers)
CREATE TABLE IF NOT EXISTS multiplayer_players (
  id text PRIMARY KEY,
  username text NOT NULL,
  position_x double precision DEFAULT 0,
  position_y double precision DEFAULT 0,
  position_z double precision DEFAULT 0,
  rotation double precision DEFAULT 0,
  velocity_x double precision DEFAULT 0,
  velocity_y double precision DEFAULT 0,
  velocity_z double precision DEFAULT 0,
  health integer DEFAULT 100,
  stamina integer DEFAULT 100,
  level integer DEFAULT 1,
  is_in_combat boolean DEFAULT false,
  last_seen timestamptz DEFAULT now()
);

-- World events (declared in the Database type; reserved for future use)
CREATE TABLE IF NOT EXISTS world_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  location_x double precision DEFAULT 0,
  location_y double precision DEFAULT 0,
  location_z double precision DEFAULT 0,
  severity integer DEFAULT 1,
  description text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_position
  ON players (position_x, position_z);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player
  ON game_sessions (player_id);
CREATE INDEX IF NOT EXISTS idx_multiplayer_last_seen
  ON multiplayer_players (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_world_events_active
  ON world_events (active, expires_at);

-- Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;

-- Permissive anon + authenticated access (login-less game).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY
    ARRAY['players', 'game_sessions', 'multiplayer_players', 'world_events']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%1$s" ON %1$s;', t);
    EXECUTE format(
      'CREATE POLICY "anon_all_%1$s" ON %1$s FOR ALL '
      || 'TO anon, authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- Keep players.updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_set_updated_at ON players;
CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
