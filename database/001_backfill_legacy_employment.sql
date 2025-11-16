-- 001_backfill_legacy_employment.sql
-- Idempotent backfill to copy legacy employment columns into canonical columns
-- Copies `current_company` -> `current_employer` and `current_position` -> `current_job_title`
-- Only updates rows where canonical column is NULL or empty.

BEGIN;

-- Copy legacy company -> canonical employer where canonical is empty
UPDATE alumni_profiles
SET current_employer = current_company
WHERE (current_employer IS NULL OR current_employer = '')
  AND (current_company IS NOT NULL AND current_company <> '');

-- Copy legacy position -> canonical job title where canonical is empty
UPDATE alumni_profiles
SET current_job_title = current_position
WHERE (current_job_title IS NULL OR current_job_title = '')
  AND (current_position IS NOT NULL AND current_position <> '');

COMMIT;

-- Usage:
-- psql -d <your_db> -f database/001_backfill_legacy_employment.sql
