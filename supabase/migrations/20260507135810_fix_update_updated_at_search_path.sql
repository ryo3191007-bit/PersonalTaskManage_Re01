/*
  # Fix mutable search_path on update_updated_at function

  Sets search_path = '' on the trigger function to prevent search_path
  injection attacks. All referenced objects are qualified with their schema.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
