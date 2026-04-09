-- Per-phone daily SMS rate limit tracking

CREATE TABLE public.sms_daily_counts (
  phone_number TEXT NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  count        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (phone_number, date)
);

-- Atomic increment, returns new count
CREATE OR REPLACE FUNCTION increment_sms_daily_count(p_phone TEXT)
RETURNS INTEGER AS $$
  INSERT INTO public.sms_daily_counts (phone_number, date, count)
  VALUES (p_phone, CURRENT_DATE, 1)
  ON CONFLICT (phone_number, date) DO UPDATE SET count = sms_daily_counts.count + 1
  RETURNING count;
$$ LANGUAGE sql;

-- Cleanup old entries (call periodically or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_sms_daily_counts()
RETURNS void AS $$
  DELETE FROM public.sms_daily_counts WHERE date < CURRENT_DATE - INTERVAL '7 days';
$$ LANGUAGE sql;
