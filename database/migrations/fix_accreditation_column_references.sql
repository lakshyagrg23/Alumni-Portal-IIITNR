-- Fix accreditation functions to use correct column names
-- Issue: Functions were referencing 'current_company' but actual column is 'current_employer'

-- Drop and recreate get_top_industries function
DROP FUNCTION IF EXISTS get_top_industries(INT, INT, INT);

CREATE OR REPLACE FUNCTION get_top_industries(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2024,
  limit_count INT DEFAULT 10
) RETURNS TABLE (
  industry VARCHAR,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH totals AS (
    SELECT COUNT(*) as total
    FROM alumni_profiles ap
    JOIN users u ON ap.user_id = u.id
    WHERE u.role = 'alumni' 
      AND u.is_approved = true
      AND ap.graduation_year BETWEEN start_year AND end_year
      AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
      AND ap.current_employer IS NOT NULL
      AND ap.current_employer != ''
      AND (
        (ap.industry_sector IS NOT NULL AND ap.industry_sector != '')
        OR (ap.industry IS NOT NULL AND ap.industry != '')
      )
  )
  SELECT 
    COALESCE(NULLIF(ap.industry_sector, ''), NULLIF(ap.industry, ''), 'Not Specified')::VARCHAR as industry,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / NULLIF((SELECT total FROM totals), 0) * 100, 1) as percentage
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
    AND (
      (ap.industry_sector IS NOT NULL AND ap.industry_sector != '')
      OR (ap.industry IS NOT NULL AND ap.industry != '')
    )
  GROUP BY COALESCE(NULLIF(ap.industry_sector, ''), NULLIF(ap.industry, ''), 'Not Specified')::VARCHAR
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate get_top_companies function
DROP FUNCTION IF EXISTS get_top_companies(INT, INT, INT);

CREATE OR REPLACE FUNCTION get_top_companies(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2024,
  limit_count INT DEFAULT 15
) RETURNS TABLE (
  company VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.current_employer,
    COUNT(*) as count
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
    AND ap.current_employer IS NOT NULL
    AND ap.current_employer != ''
  GROUP BY ap.current_employer
  ORDER BY count DESC, ap.current_employer ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Verify the functions are working
COMMENT ON FUNCTION get_top_industries IS 'Fixed to use current_employer column instead of non-existent current_company';
COMMENT ON FUNCTION get_top_companies IS 'Fixed to use current_employer column instead of non-existent current_company';
