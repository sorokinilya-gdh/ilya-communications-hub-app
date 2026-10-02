-- Preserve existing provider values while allowing isolated mailbox sync cursors.
DO $migration$
DECLARE
  original_check text;
  original_condition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO original_check
    FROM pg_constraint
    WHERE conrelid = 'public.communication_sync_state'::regclass
      AND conname = 'communication_sync_state_provider_check';
  IF original_check IS NULL THEN
    RAISE EXCEPTION 'Expected communication sync provider constraint is missing';
  END IF;
  original_condition := regexp_replace(original_check, '^CHECK \((.*)\)$', '\1');
  IF original_condition = original_check THEN
    RAISE EXCEPTION 'Unexpected provider constraint definition';
  END IF;
  ALTER TABLE public.communication_sync_state
    DROP CONSTRAINT communication_sync_state_provider_check;
  EXECUTE format(
    'ALTER TABLE public.communication_sync_state ADD CONSTRAINT communication_sync_state_provider_check CHECK ((%s) OR provider ~ %L)',
    original_condition,
    '^(gmail|zoho):[^[:space:]]+$'
  );
END
$migration$;
