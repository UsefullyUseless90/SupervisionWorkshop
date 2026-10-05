/*
# Remove OF referential system

The user requested removing the OF reference referential entirely.
OFs are now tracked purely through their scanned movements — no
pre-registration needed. This migration:

1. Drops the `of_references` table and its RLS policies (no user data to preserve — it was a referential table).
2. Removes RLS policies related to of_references.
3. Leaves `is_recognized` and `strict_mode` columns in place (cannot drop columns per data safety rules), but they are no longer used by the application. New inserts will default `is_recognized` to true (existing default).
*/

DROP POLICY IF EXISTS "of_references_select_authenticated" ON of_references;
DROP POLICY IF EXISTS "of_references_insert_supervisor_admin" ON of_references;
DROP POLICY IF EXISTS "of_references_update_supervisor_admin" ON of_references;
DROP POLICY IF EXISTS "of_references_delete_supervisor_admin" ON of_references;

DROP TABLE IF EXISTS of_references;
