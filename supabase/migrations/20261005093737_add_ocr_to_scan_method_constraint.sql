/*
# Update movements scan_method constraint to include 'ocr'

The scan_method column already allows 'ocr' in the TypeScript types,
but the database CHECK constraint needs updating to match.
This migration drops and recreates the constraint to include 'ocr'.
*/

ALTER TABLE movements DROP CONSTRAINT IF EXISTS movements_scan_method_check;

ALTER TABLE movements ADD CONSTRAINT movements_scan_method_check
CHECK (scan_method IN ('pda', 'barcode_reader', 'camera', 'ocr', 'manual'));
