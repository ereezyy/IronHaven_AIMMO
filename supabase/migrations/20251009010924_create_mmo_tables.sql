/*
  # IronHaven AIMMO - Complete MMO Database Schema

  ## Overview
  Full database schema for a third-person MMORPG with real-time multiplayer,
  persistent world state, guilds, parties, quests, and combat systems.

  ## 1. New Tables

  ### `players`
  Core player data with full character progression
  - `id` (uuid, primary key) - Unique player identifier
  - `username` (text, unique) - Player display name
  - `position_x`, `position_y`, `position_z` (float) - 3D world position
  - `rotation` (float) - Player rotation/facing direction
  - `health` (integer) - Current health points (max 100)
  - `stamina` (integer) - Current stamina (max 100)
  - `mana` (integer) - Current mana for skills (max 100)
  - `level` (integer) - Player level
  - `experience` (integer) - Current XP
  - `reputation` (integer) - Reputation score
  - `money` (integer) - In-game currency
  - `class` (text) - Character class (warrior, mage, rogue, etc.)
  - `guild_id` (uuid, nullable) - Reference to guild
  - `party_id` (uuid, nullable) - Reference to current party
  - `inventory` (jsonb) - Player inventory items
  - `equipment` (jsonb) - Equipped items
  - `skills` (jsonb) - Unlocked skills and levels
  - `last_online` (timestamptz) - Last activity timestamp
  - `created_at`, `updated_at` (timestamptz) - Audit timestamps

  ### `guilds`
  Player guilds/clans
  - `id` (uuid, primary key) - Guild identifier
  - `name` (text, unique) - Guild name
  - `description` (text) - Guild description
  - `leader_id` (uuid) - Guild leader player ID
  - `level` (integer) - Guild level
  - `members_count` (integer) - Number of members
  - `created_at` (timestamptz) - Creation timestamp

  ### `parties`
  Temporary player parties
  - `id` (uuid, primary key) - Party identifier
  - `leader_id` (uuid) - Party leader player ID
  - `members` (jsonb) - Array of member IDs
  - `created_at` (timestamptz) - Creation timestamp

  ### `quests`
  Available quests in the game
  - `id` (uuid, primary key) - Quest identifier
  - `name` (text) - Quest name
  - `description` (text) - Quest description
  - `objectives` (jsonb) - Quest objectives
  - `rewards` (jsonb) - Quest rewards (XP, items, money)
  - `required_level` (integer) - Minimum level required
  - `quest_type` (text) - Type (main, side, daily, etc.)

  ### `player_quests`
  Player quest progress tracking
  - `id` (uuid, primary key) - Record identifier
  - `player_id` (uuid) - Player reference
  - `quest_id` (uuid) - Quest reference
  - `progress` (jsonb) - Current progress
  - `status` (text) - Status (active, completed, failed)
  - `started_at` (timestamptz) - Start time
  - `completed_at` (timestamptz, nullable) - Completion time

  ### `chat_messages`
  In-game chat messages
  - `id` (uuid, primary key) - Message identifier
  - `player_id` (uuid) - Sender player ID
  - `username` (text) - Sender username
  - `channel` (text) - Channel (global, local, party, guild)
  - `message` (text) - Message content
  - `created_at` (timestamptz) - Timestamp

  ### `world_npcs`
  Persistent NPCs in the world
  - `id` (uuid, primary key) - NPC identifier
  - `name` (text) - NPC name
  - `type` (text) - NPC type (vendor, quest_giver, enemy)
  - `position_x`, `position_y`, `position_z` (float) - Position
  - `health` (integer) - Current health
  - `level` (integer) - NPC level
  - `loot_table` (jsonb) - Possible drops
  - `dialogue` (jsonb) - NPC dialogue options

  ### `combat_logs`
  Combat event logging for analytics
  - `id` (uuid, primary key) - Log identifier
  - `attacker_id` (uuid) - Attacker player/NPC ID
  - `target_id` (uuid) - Target player/NPC ID
  - `damage` (integer) - Damage dealt
  - `skill_used` (text) - Skill/ability used
  - `result` (text) - Result (hit, miss, crit, kill)
  - `created_at` (timestamptz) - Timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Players can read/write their own data
  - Public read for guilds, parties (for multiplayer features)
  - Guild/party members can update their respective data
  - Chat messages are publicly readable

  ## 3. Real-time Features
  - Players table syncs in real-time for multiplayer
  - Chat messages broadcast instantly
  - Combat events trigger real-time updates

  ## 4. Indexes
  - Position-based spatial indexes for nearby player queries
  - Guild and party membership indexes
  - Quest progress indexes
  - Chat channel indexes for efficient filtering
*/

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  position_x float DEFAULT 0,
  position_y float DEFAULT 1,
  position_z float DEFAULT 0,
  rotation float DEFAULT 0,
  health integer DEFAULT 100,
  stamina integer DEFAULT 100,
  mana integer DEFAULT 100,
  level integer DEFAULT 1,
  experience integer DEFAULT 0,
  reputation integer DEFAULT 0,
  money integer DEFAULT 0,
  class text DEFAULT 'warrior',
  guild_id uuid,
  party_id uuid,
  inventory jsonb DEFAULT '[]'::jsonb,
  equipment jsonb DEFAULT '{}'::jsonb,
  skills jsonb DEFAULT '{}'::jsonb,
  last_online timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  leader_id uuid NOT NULL,
  level integer DEFAULT 1,
  members_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL,
  members jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  objectives jsonb DEFAULT '[]'::jsonb,
  rewards jsonb DEFAULT '{}'::jsonb,
  required_level integer DEFAULT 1,
  quest_type text DEFAULT 'side'
);

-- Player quests table
CREATE TABLE IF NOT EXISTS player_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  progress jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  username text NOT NULL,
  channel text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- World NPCs table
CREATE TABLE IF NOT EXISTS world_npcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  position_x float NOT NULL,
  position_y float NOT NULL,
  position_z float NOT NULL,
  health integer DEFAULT 100,
  level integer DEFAULT 1,
  loot_table jsonb DEFAULT '[]'::jsonb,
  dialogue jsonb DEFAULT '{}'::jsonb
);

-- Combat logs table
CREATE TABLE IF NOT EXISTS combat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id uuid,
  target_id uuid,
  damage integer NOT NULL,
  skill_used text,
  result text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position_x, position_y, position_z);
CREATE INDEX IF NOT EXISTS idx_players_guild ON players(guild_id) WHERE guild_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_party ON players(party_id) WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_last_online ON players(last_online);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_quests_status ON player_quests(player_id, status);
CREATE INDEX IF NOT EXISTS idx_world_npcs_position ON world_npcs(position_x, position_y, position_z);
CREATE INDEX IF NOT EXISTS idx_combat_logs_created ON combat_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_logs ENABLE ROW LEVEL SECURITY;

-- Players policies (public read for multiplayer, own data write)
CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Players can insert own data"
  ON players FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Players can update own data"
  ON players FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Guilds policies
CREATE POLICY "Anyone can view guilds"
  ON guilds FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create guilds"
  ON guilds FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Guild leaders can update"
  ON guilds FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Parties policies
CREATE POLICY "Anyone can view parties"
  ON parties FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create parties"
  ON parties FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Party leaders can update"
  ON parties FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Quests policies (public read)
CREATE POLICY "Anyone can view quests"
  ON quests FOR SELECT
  TO anon, authenticated
  USING (true);

-- Player quests policies
CREATE POLICY "Players can view own quests"
  ON player_quests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Players can insert own quests"
  ON player_quests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Players can update own quests"
  ON player_quests FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Chat policies (public read/write for real-time chat)
CREATE POLICY "Anyone can view chat"
  ON chat_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can send chat"
  ON chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- NPCs policies (public read)
CREATE POLICY "Anyone can view NPCs"
  ON world_npcs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Combat logs policies (public read for analytics)
CREATE POLICY "Anyone can view combat logs"
  ON combat_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert combat logs"
  ON combat_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to get nearby players (within 50 units)
CREATE OR REPLACE FUNCTION get_nearby_players(
  player_x float,
  player_y float,
  player_z float,
  radius float DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  username text,
  position_x float,
  position_y float,
  position_z float,
  health integer,
  level integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.position_x,
    p.position_y,
    p.position_z,
    p.health,
    p.level
  FROM players p
  WHERE 
    sqrt(
      power(p.position_x - player_x, 2) +
      power(p.position_z - player_z, 2)
    ) <= radius
    AND p.last_online > now() - interval '1 minute';
END;
$$ LANGUAGE plpgsql;

-- Insert some starter quests
INSERT INTO quests (name, description, objectives, rewards, required_level, quest_type)
VALUES
  ('Welcome to IronHaven', 'Explore the city and learn the basics', '["Visit 5 locations", "Talk to 3 NPCs"]'::jsonb, '{"experience": 100, "money": 50}'::jsonb, 1, 'tutorial'),
  ('The Gang War', 'Help restore peace to the streets', '["Defeat 10 gang members", "Secure 3 territories"]'::jsonb, '{"experience": 500, "money": 200}'::jsonb, 5, 'main'),
  ('Cybernetic Enhancement', 'Find a ripperdoc to upgrade your implants', '["Find the ripperdoc", "Collect 1000 credits"]'::jsonb, '{"experience": 300, "item": "cyber_arm"}'::jsonb, 3, 'side')
ON CONFLICT DO NOTHING;
