-- Cosmetic avatar payload on multiplayer presence rows.
-- Client presence broadcasts (updateMultiplayerPlayer) send archetype /
-- appearance / modular parts so remotes render the real character.
-- Without this column, every presence upsert returns HTTP 400 (PGRST204).

ALTER TABLE multiplayer_players
  ADD COLUMN IF NOT EXISTS avatar jsonb DEFAULT NULL;
