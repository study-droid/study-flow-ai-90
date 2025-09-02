-- Create function to automatically delete old AI tutor sessions
CREATE OR REPLACE FUNCTION delete_old_ai_tutor_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions older than 7 days
  DELETE FROM public.ai_tutor_sessions
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_archived = false;
  
  -- Also delete archived sessions older than 30 days
  DELETE FROM public.ai_tutor_sessions
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_archived = true;
END;
$$;

-- Create a scheduled job to run daily (requires pg_cron extension)
-- Note: pg_cron needs to be enabled in Supabase dashboard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule the cleanup to run daily at 2 AM
    PERFORM cron.schedule(
      'delete-old-ai-tutor-sessions',
      '0 2 * * *',
      'SELECT delete_old_ai_tutor_sessions();'
    );
  ELSE
    -- If pg_cron is not available, create a trigger-based alternative
    -- This will clean up old sessions whenever a new session is created
    CREATE OR REPLACE FUNCTION cleanup_old_sessions_trigger()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Clean up old sessions (with a random chance to avoid running on every insert)
      IF random() < 0.1 THEN  -- 10% chance to run cleanup
        PERFORM delete_old_ai_tutor_sessions();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Create trigger if it doesn't exist
    DROP TRIGGER IF EXISTS cleanup_old_sessions ON public.ai_tutor_sessions;
    CREATE TRIGGER cleanup_old_sessions
    AFTER INSERT ON public.ai_tutor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_sessions_trigger();
  END IF;
END
$$;

-- Add a comment to the function
COMMENT ON FUNCTION delete_old_ai_tutor_sessions() IS 
'Automatically deletes AI tutor sessions older than 7 days (or 30 days if archived)';