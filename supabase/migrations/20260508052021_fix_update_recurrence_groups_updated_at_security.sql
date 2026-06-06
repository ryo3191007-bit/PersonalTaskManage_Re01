/*
  # Fix SECURITY DEFINER exposure on update_recurrence_groups_updated_at

  ## Problem
  The trigger function `public.update_recurrence_groups_updated_at()` is a
  SECURITY DEFINER function that is publicly executable by the `anon` and
  `authenticated` roles via the PostgREST RPC endpoint. This is unintentional —
  it is an internal trigger function and should never be callable directly.

  ## Changes
  1. Revoke EXECUTE on the function from `anon`, `authenticated`, and `public`
     to prevent direct invocation via the REST API.

  The function remains usable by the trigger (which runs as the table owner /
  superuser), so all `updated_at` auto-update behaviour is preserved.
*/

REVOKE EXECUTE ON FUNCTION public.update_recurrence_groups_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_recurrence_groups_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_recurrence_groups_updated_at() FROM authenticated;
