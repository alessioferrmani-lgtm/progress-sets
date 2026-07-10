
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_weight_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_from_test() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_from_race() FROM PUBLIC, anon, authenticated;
