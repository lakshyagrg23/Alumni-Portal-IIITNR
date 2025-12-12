-- Migration: Accreditation Dashboard V2 - Batch-Centric Functions
-- Date: 2025-12-12
-- Description: SQL functions for realistic accreditation reporting

-- Function 1: Get Registration Coverage by Batch
CREATE OR REPLACE FUNCTION get_batch_coverage(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2025
) RETURNS TABLE (
  batch INTEGER,
  total_alumni BIGINT,
  registered BIGINT,
  with_profile BIGINT,
  coverage_pct NUMERIC,
  profile_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- enrollment_year currently stores the graduation year after migration 004.
    -- Using it directly prevents off‑by‑four filtering that zeroes out data.
    ir.enrollment_year::INTEGER as batch,
    COUNT(DISTINCT ir.id) as total_alumni,
    COUNT(DISTINCT u.id) FILTER (WHERE u.is_approved AND u.role='alumni') as registered,
    COUNT(DISTINCT ap.id) as with_profile,
    ROUND(COUNT(DISTINCT u.id) FILTER (WHERE u.is_approved AND u.role='alumni')::numeric / NULLIF(COUNT(DISTINCT ir.id), 0) * 100, 1) as coverage_pct,
    ROUND(COUNT(DISTINCT ap.id)::numeric / NULLIF(COUNT(DISTINCT u.id) FILTER (WHERE u.is_approved AND u.role='alumni'), 0) * 100, 1) as profile_pct
  FROM institute_records ir
  LEFT JOIN users u ON ir.id = u.institute_record_id
  LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
  WHERE ir.enrollment_year BETWEEN start_year AND end_year
    AND ir.enrollment_year <= EXTRACT(YEAR FROM CURRENT_DATE)
    AND ir.enrollment_year IS NOT NULL
  GROUP BY ir.enrollment_year
  ORDER BY batch DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get Employment Outcomes (Alumni Only - Excluding Current Students)
CREATE OR REPLACE FUNCTION get_employment_outcomes(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2024
) RETURNS TABLE (
  batch INTEGER,
  total_registered BIGINT,
  employed BIGINT,
  entrepreneur BIGINT,
  higher_education BIGINT,
  freelancing BIGINT,
  looking BIGINT,
  career_break BIGINT,
  positive_outcome BIGINT,
  outcome_rate NUMERIC,
  years_since_grad INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.graduation_year::INTEGER as batch,
    COUNT(*) as total_registered,
    COUNT(*) FILTER (WHERE ap.employment_status IN ('Employed Full-time', 'Employed', 'Self-employed', 'Entrepreneur')) as employed,
    COUNT(*) FILTER (WHERE ap.employment_status IN ('Self-Employed / Entrepreneur', 'Self-employed', 'Entrepreneur')) as entrepreneur,
    COUNT(*) FILTER (WHERE ap.employment_status IN ('Pursuing Higher Education', 'Higher Studies')) as higher_education,
    COUNT(*) FILTER (WHERE ap.employment_status IN ('Freelancing / Consulting', 'Freelancing', 'Consulting')) as freelancing,
    COUNT(*) FILTER (WHERE ap.employment_status IN ('Looking for Opportunities', 'Seeking Employment', 'Unemployed')) as looking,
    COUNT(*) FILTER (WHERE ap.employment_status IN ('Career Break', 'Not Available', 'Not specified')) as career_break,
    COUNT(*) FILTER (WHERE ap.employment_status IN (
      'Employed Full-time', 
      'Employed',
      'Self-employed',
      'Entrepreneur',
      'Self-Employed / Entrepreneur', 
      'Pursuing Higher Education',
      'Higher Studies'
    )) as positive_outcome,
    ROUND(
      COUNT(*) FILTER (WHERE ap.employment_status IN (
        'Employed Full-time', 
        'Employed',
        'Self-employed',
        'Entrepreneur',
        'Self-Employed / Entrepreneur', 
        'Pursuing Higher Education',
        'Higher Studies'
      ))::numeric / NULLIF(COUNT(*), 0) * 100, 1
    ) as outcome_rate,
    (EXTRACT(YEAR FROM CURRENT_DATE) - ap.graduation_year)::INTEGER as years_since_grad
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY ap.graduation_year
  ORDER BY ap.graduation_year DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get Employment Status Summary (Overall)
CREATE OR REPLACE FUNCTION get_employment_summary(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2024
) RETURNS TABLE (
  employment_status VARCHAR,
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
      AND ap.employment_status IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN ap.employment_status IN ('Employed Full-time', 'Employed', 'Self-employed', 'Entrepreneur', 'Self-Employed / Entrepreneur') THEN 'Employed / Entrepreneur'
      WHEN ap.employment_status IN ('Pursuing Higher Education', 'Higher Studies') THEN 'Pursuing Higher Education'
      WHEN ap.employment_status IN ('Freelancing / Consulting', 'Freelancing', 'Consulting') THEN 'Freelancing / Consulting'
      WHEN ap.employment_status IN ('Looking for Opportunities', 'Seeking Employment', 'Unemployed') THEN 'Looking for Opportunities'
      WHEN ap.employment_status IN ('Career Break', 'Not Available', 'Not specified') THEN 'Career Break / Not Available'
      ELSE ap.employment_status
    END AS employment_status,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / NULLIF((SELECT total FROM totals), 0) * 100, 1) as percentage
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
    AND ap.employment_status IS NOT NULL
  GROUP BY ap.employment_status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get Top Industries (Employed Alumni Only)
-- Uses industry_sector first, falls back to industry column
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
      AND ap.current_company IS NOT NULL
      AND ap.current_company != ''
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

-- Function 5: Get Top Companies (All Alumni with company data)
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
    ap.current_company,
    COUNT(*) as count
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
    AND ap.current_company IS NOT NULL
    AND ap.current_company != ''
  GROUP BY ap.current_company
  ORDER BY count DESC, ap.current_company ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function 6: Get Geographic Distribution
CREATE OR REPLACE FUNCTION get_geographic_distribution(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2024,
  limit_count INT DEFAULT 15
) RETURNS TABLE (
  country VARCHAR,
  city VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ap.current_country, 'Unknown') as country,
    COALESCE(ap.current_city, 'Unknown') as city,
    COUNT(*) as count
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY ap.current_country, ap.current_city
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function 7: Get Profile Quality Metrics
CREATE OR REPLACE FUNCTION get_profile_quality_metrics(
  start_year INT DEFAULT 2015,
  end_year INT DEFAULT 2024
) RETURNS TABLE (
  metric_name VARCHAR,
  count BIGINT,
  percentage NUMERIC,
  total_profiles BIGINT
) AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE);

  RETURN QUERY
  SELECT 
    'Complete Employment Info'::VARCHAR as metric_name,
    COUNT(*) FILTER (WHERE ap.employment_status IS NOT NULL AND ap.employment_status != '') as count,
    ROUND(COUNT(*) FILTER (WHERE ap.employment_status IS NOT NULL AND ap.employment_status != '')::numeric / NULLIF(total, 0) * 100, 1) as percentage,
    total as total_profiles
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)

  UNION ALL

  SELECT 
    'LinkedIn Profile Added'::VARCHAR,
    COUNT(*) FILTER (WHERE ap.linkedin_url IS NOT NULL AND ap.linkedin_url != ''),
    ROUND(COUNT(*) FILTER (WHERE ap.linkedin_url IS NOT NULL AND ap.linkedin_url != '')::numeric / NULLIF(total, 0) * 100, 1),
    total
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)

  UNION ALL

  SELECT 
    'Skills Added'::VARCHAR,
    COUNT(*) FILTER (WHERE ap.skills IS NOT NULL AND array_length(ap.skills, 1) > 0),
    ROUND(COUNT(*) FILTER (WHERE ap.skills IS NOT NULL AND array_length(ap.skills, 1) > 0)::numeric / NULLIF(total, 0) * 100, 1),
    total
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)

  UNION ALL

  SELECT 
    'Location Info Complete'::VARCHAR,
    COUNT(*) FILTER (WHERE ap.current_city IS NOT NULL AND ap.current_country IS NOT NULL),
    ROUND(COUNT(*) FILTER (WHERE ap.current_city IS NOT NULL AND ap.current_country IS NOT NULL)::numeric / NULLIF(total, 0) * 100, 1),
    total
  FROM alumni_profiles ap
  JOIN users u ON ap.user_id = u.id
  WHERE u.role = 'alumni' 
    AND u.is_approved = true
    AND ap.graduation_year BETWEEN start_year AND end_year
    AND ap.graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION get_batch_coverage IS 'Returns registration coverage by batch - compares institute records with registered alumni';
COMMENT ON FUNCTION get_employment_outcomes IS 'Returns employment outcomes by batch for graduated alumni only (excludes current students)';
COMMENT ON FUNCTION get_employment_summary IS 'Returns overall employment status distribution for graduated alumni';
COMMENT ON FUNCTION get_top_industries IS 'Returns top industries where employed alumni work';
COMMENT ON FUNCTION get_top_companies IS 'Returns top companies where alumni are currently employed';
COMMENT ON FUNCTION get_geographic_distribution IS 'Returns geographic distribution of alumni';
COMMENT ON FUNCTION get_profile_quality_metrics IS 'Returns profile data quality and completeness metrics';
