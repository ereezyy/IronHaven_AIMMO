-- Prevent updates on chat_messages and combat_logs
-- Both should be append-only

REVOKE UPDATE ON chat_messages FROM anon, authenticated, public;
REVOKE UPDATE ON combat_logs FROM anon, authenticated, public;
