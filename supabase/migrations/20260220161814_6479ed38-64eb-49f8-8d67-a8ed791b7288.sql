-- Functions sécurisées pour lire/gérer les crons pg_cron depuis le client
-- (cron.job n'est pas accessible via RLS directement depuis le client anon)

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean,
  username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobid, jobname, schedule, command, active, username
  FROM cron.job
  ORDER BY jobname;
$$;

CREATE OR REPLACE FUNCTION public.get_cron_job_history(p_jobid bigint DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS TABLE(
  runid bigint,
  jobid bigint,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz,
  duration_ms numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.runid,
    d.jobid,
    d.status,
    d.return_message,
    d.start_time,
    d.end_time,
    ROUND(EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000) AS duration_ms
  FROM cron.job_run_details d
  WHERE (p_jobid IS NULL OR d.jobid = p_jobid)
  ORDER BY d.start_time DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.toggle_cron_job(p_jobid bigint, p_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  UPDATE cron.job SET active = p_active WHERE jobid = p_jobid;
  RETURN FOUND;
END;
$$;

-- Grant execute to authenticated users (RLS inside function handles admin check)
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_job_history(bigint, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.toggle_cron_job(bigint, boolean) TO authenticated;
