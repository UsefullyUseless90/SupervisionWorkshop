/*
# Fix handle_new_user trigger: use 'production' instead of 'operator'

## Problem
The handle_new_user trigger function inserts a profile row with
`COALESCE(NEW.raw_app_meta_data ->> 'role', 'operator')` as the default role.
Since the role constraint was updated to the 5-category system, 'operator'
is no longer a valid role value. This causes the trigger to fail with a
CHECK constraint violation whenever a new auth user is created, which
breaks agent creation from the admin UI.

## Fix
Update the trigger function to use 'production' as the fallback role,
which is valid under the current constraint.

## No data changes
No existing rows are modified — only the function definition changes.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'production')
  );
  RETURN NEW;
END;
$function$;
