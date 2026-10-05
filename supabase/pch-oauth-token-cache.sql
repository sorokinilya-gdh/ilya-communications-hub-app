CREATE TABLE IF NOT EXISTS public.pch_oauth_token_cache (
 cache_key text PRIMARY KEY, encrypted_payload jsonb,
 response_status integer NOT NULL DEFAULT 200,
 expires_at timestamptz NOT NULL DEFAULT 'epoch',
 lease_until timestamptz NOT NULL DEFAULT 'epoch'
);
ALTER TABLE public.pch_oauth_token_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pch_oauth_token_cache FROM anon, authenticated;
GRANT ALL ON public.pch_oauth_token_cache TO service_role;
CREATE OR REPLACE FUNCTION public.pch_claim_oauth_refresh(p_key text) RETURNS boolean
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE claimed boolean;
BEGIN
 INSERT INTO public.pch_oauth_token_cache(cache_key) VALUES(p_key) ON CONFLICT DO NOTHING;
 UPDATE public.pch_oauth_token_cache SET lease_until=now()+interval '60 seconds'
 WHERE cache_key=p_key AND expires_at<=now() AND lease_until<=now() RETURNING true INTO claimed;
 RETURN coalesce(claimed,false);
END $$;
REVOKE ALL ON FUNCTION public.pch_claim_oauth_refresh(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pch_claim_oauth_refresh(text) TO service_role;