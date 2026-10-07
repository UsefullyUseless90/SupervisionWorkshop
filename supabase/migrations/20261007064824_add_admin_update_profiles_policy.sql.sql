/*
# Allow admin to update any profile's role

## Problem
The `profiles_update_self` policy only allows a user to update their own row
(auth.uid() = id). When an admin tries to change another user's role (e.g.
setting someone to DPX), the update is silently blocked by RLS.

## Fix
Add a new UPDATE policy `profiles_update_admin` that allows any authenticated
user whose app role is 'admin' to update any profile row. The existing
self-update policy remains in place so non-admin users can still edit their
own profile.

## Security
- Only users with raw_app_meta_data.role = 'admin' can update other users.
- The role is stored in app_metadata (user-immutable), not user_metadata.
- No changes to SELECT, INSERT, or DELETE policies.
*/

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
