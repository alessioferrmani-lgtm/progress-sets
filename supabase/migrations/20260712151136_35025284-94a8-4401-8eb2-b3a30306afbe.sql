REVOKE EXECUTE ON FUNCTION public.perf_from_interval_rep() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.perf_from_race() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.perf_from_test() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_weight_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;