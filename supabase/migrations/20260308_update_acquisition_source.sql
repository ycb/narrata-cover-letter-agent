-- Derive acquisition_source from the first landing URL instead of auth referrer.

CREATE OR REPLACE FUNCTION public.derive_acquisition_source(landing_url TEXT, utm JSONB DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  raw_source TEXT;
BEGIN
  IF landing_url IS NOT NULL THEN
    raw_source := NULLIF(substring(landing_url FROM 'utm_source=([^&#]+)'), '');
    IF raw_source IS NULL THEN
      raw_source := NULLIF(substring(landing_url FROM 'alpha=([^&#]+)'), '');
    END IF;
  END IF;

  IF raw_source IS NULL AND utm IS NOT NULL THEN
    raw_source := NULLIF(utm->>'source', '');
  END IF;

  IF raw_source IS NULL THEN
    raw_source := NULL;
  END IF;

  IF raw_source IS NOT NULL THEN
    raw_source := replace(raw_source, '+', ' ');
    raw_source := replace(raw_source, '%20', ' ');
    RETURN upper(raw_source);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill acquisition_source for existing users using the new rule.
UPDATE public.profiles p
SET acquisition_source = public.derive_acquisition_source(p.acquisition_first_landing_url, p.acquisition_utm)
WHERE p.acquisition_first_landing_url IS NOT NULL
  AND public.derive_acquisition_source(p.acquisition_first_landing_url, p.acquisition_utm) IS NOT NULL;

-- Keep acquisition_source in sync when new landing URLs or UTM metadata arrive.
CREATE OR REPLACE FUNCTION public.update_acquisition_source()
RETURNS TRIGGER AS $$
DECLARE
  derived TEXT;
BEGIN
  derived := public.derive_acquisition_source(NEW.acquisition_first_landing_url, NEW.acquisition_utm);
  IF derived IS NOT NULL THEN
    NEW.acquisition_source := derived;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_acquisition_source ON public.profiles;
CREATE TRIGGER trg_update_acquisition_source
  BEFORE INSERT OR UPDATE OF acquisition_first_landing_url, acquisition_utm ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_acquisition_source();
