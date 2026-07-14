
REVOKE EXECUTE ON FUNCTION public.perf_cleanup_test() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_cleanup_race() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_from_test() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_from_race() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_from_interval_rep() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_weight_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Restrict the exercises INSERT policy: authenticated only, with a benign check (allowing custom exercises during import).
-- Kept broad because catalog is shared and de-duped by unique name; no destructive fields.
