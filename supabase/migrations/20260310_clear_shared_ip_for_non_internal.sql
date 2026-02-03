-- Clear known shared IP from non-internal profiles to avoid misleading geo.

UPDATE public.profiles
SET signup_ip = NULL,
    geo = NULL
WHERE signup_ip = '64.62.226.203'::inet
  AND lower(email) NOT IN (
    'peter.spannagle@gmail.com',
    'narrata.ai@gmail.com',
    'darionovoa@ideartte.com'
  );
