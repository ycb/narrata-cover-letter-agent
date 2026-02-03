-- Cleanup LinkedIn auth referrer data and recompute acquisition_source from landing URL/UTM.

UPDATE public.profiles
SET acquisition_referrer = NULL
WHERE acquisition_referrer ILIKE '%linkedin.com%';

UPDATE public.profiles
SET acquisition_source = NULL
WHERE acquisition_source ILIKE '%linkedin.com%'
   OR acquisition_source ILIKE 'http%';

UPDATE public.profiles p
SET acquisition_source = public.derive_acquisition_source(p.acquisition_first_landing_url, p.acquisition_utm)
WHERE public.derive_acquisition_source(p.acquisition_first_landing_url, p.acquisition_utm) IS NOT NULL;
