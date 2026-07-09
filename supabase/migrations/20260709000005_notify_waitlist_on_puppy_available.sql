-- Phase 6.4: own-property auto-post (ToS-safe). When a puppy flips to
-- Available, call the notify-waitlist-new-puppy edge function so matching
-- waitlist_signups get emailed. Never blocks the status update itself —
-- if the HTTP call fails, or the required settings aren't configured yet,
-- this trigger logs and moves on rather than rolling back the transaction.
--
-- === PENDING OPERATOR ACTION ===
-- This trigger no-ops until both settings below are configured:
--   ALTER DATABASE postgres SET app.settings.edge_function_base_url =
--     'https://<project-ref>.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<same value as
--     the CRON_SECRET edge function secret used by send-pending-reminders>';
-- Same secret-provisioning shape already documented in wave-status.md for
-- re-enabling the deposit-reminder cron.
CREATE OR REPLACE FUNCTION notify_waitlist_on_puppy_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_url text := current_setting('app.settings.edge_function_base_url', true);
  cron_secret text := current_setting('app.settings.cron_secret', true);
BEGIN
  IF NEW.status = 'Available' AND (OLD.status IS DISTINCT FROM 'Available') THEN
    IF edge_url IS NULL OR cron_secret IS NULL THEN
      RAISE NOTICE 'notify_waitlist_on_puppy_available: app.settings.edge_function_base_url / cron_secret not configured; skipping waitlist notify for puppy %', NEW.id;
      RETURN NEW;
    END IF;

    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/notify-waitlist-new-puppy',
        headers := jsonb_build_object('Content-Type', 'application/json', 'X-Cron-Secret', cron_secret),
        body := jsonb_build_object('puppy_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_waitlist_on_puppy_available: http_post failed for puppy %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_puppy_available ON puppies;
CREATE TRIGGER trg_notify_waitlist_on_puppy_available
AFTER UPDATE OF status ON puppies
FOR EACH ROW
EXECUTE FUNCTION notify_waitlist_on_puppy_available();
