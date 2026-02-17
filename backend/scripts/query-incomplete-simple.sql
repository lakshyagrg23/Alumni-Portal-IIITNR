-- Quick SQL to identify incomplete onboarding users
-- Run this directly in your production database

-- OVERVIEW STATISTICS
SELECT 
  COUNT(*) FILTER (WHERE u.role = 'alumni') as total_alumni_users,
  COUNT(*) FILTER (WHERE u.role = 'alumni' AND u.email_verified = true) as verified_alumni,
  COUNT(*) FILTER (WHERE u.role = 'alumni' AND u.email_verified = true AND u.onboarding_completed = true) as completed_onboarding,
  COUNT(*) FILTER (WHERE u.role = 'alumni' AND u.email_verified = true AND u.onboarding_completed = false) as incomplete_onboarding,
  COUNT(DISTINCT ap.user_id) as profiles_created
FROM users u
LEFT JOIN alumni_profiles ap ON u.id = ap.user_id;

-- CATEGORY 1: Verified users with NO profile entry (never started onboarding)
\echo '\n=== CATEGORY 1: Verified but NO profile created ==='
SELECT 
  u.email,
  u.created_at::date as registered_date,
  EXTRACT(DAY FROM NOW() - u.created_at)::int as days_ago
FROM users u
WHERE u.role = 'alumni'
  AND u.email_verified = true
  AND NOT EXISTS (
    SELECT 1 FROM alumni_profiles ap WHERE ap.user_id = u.id
  )
ORDER BY u.created_at DESC;

-- CATEGORY 2: Profile exists but onboarding_completed = false (started but abandoned)
\echo '\n=== CATEGORY 2: Profile exists but incomplete onboarding ==='
SELECT 
  u.email,
  ap.first_name,
  ap.last_name,
  CASE WHEN ap.profile_picture_url IS NOT NULL THEN '✓' ELSE '✗' END as has_photo,
  CASE WHEN ap.linkedin_url IS NOT NULL THEN '✓' ELSE '✗' END as has_linkedin,
  u.created_at::date as registered_date,
  EXTRACT(DAY FROM NOW() - u.created_at)::int as days_ago
FROM users u
INNER JOIN alumni_profiles ap ON u.id = ap.user_id
WHERE u.role = 'alumni'
  AND u.email_verified = true
  AND u.onboarding_completed = false
ORDER BY u.created_at DESC;

-- COMBINED EMAIL LIST FOR RE-ENGAGEMENT
\echo '\n=== EMAIL LIST FOR RE-ENGAGEMENT ==='
SELECT DISTINCT u.email
FROM users u
WHERE u.role = 'alumni'
  AND u.email_verified = true
  AND (
    u.onboarding_completed = false
    OR NOT EXISTS (SELECT 1 FROM alumni_profiles ap WHERE ap.user_id = u.id)
  )
ORDER BY u.email;
