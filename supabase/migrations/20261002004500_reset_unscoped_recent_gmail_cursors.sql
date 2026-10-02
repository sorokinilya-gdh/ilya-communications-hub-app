-- Reset only recent-mail cursor metadata created without a preserved query.
-- Indexed messages and historical import cursors remain intact.
UPDATE public.communication_sync_state
SET history_cursor = NULL, initial_import_complete = false, last_error = NULL,
    updated_at = now()
WHERE provider LIKE 'gmail:%:recent'
  AND history_cursor IS NOT NULL
  AND left(history_cursor, 1) <> '{';
