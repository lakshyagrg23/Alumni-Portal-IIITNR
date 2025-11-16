/**
 * Report Query Utilities for Accreditation Dashboard
 * Contains all database queries for generating accreditation reports
 */

import { query as dbQuery } from '../config/database.js';

/**
 * Get dashboard overview KPIs
 */
async function getOverviewKPIs(filters = {}) {
    const { startYear, endYear, program, department } = filters;
    
    let whereConditions = ['1=1'];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`graduation_year >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`graduation_year <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    if (program) {
        whereConditions.push(`program = $${paramCount}`);
        params.push(program);
        paramCount++;
    }
    
    if (department) {
        whereConditions.push(`department = $${paramCount}`);
        params.push(department);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    console.log('getOverviewKPIs: filters=', filters, 'params=', params, 'whereClause=', whereClause);
    
    const query = `
        WITH alumni_stats AS (
            SELECT 
                COUNT(*) as total_profiles_alumni,
                COUNT(*) FILTER (WHERE employment_status = 'Employed') as employed_count,
                COUNT(*) FILTER (WHERE employment_status = 'Higher Studies') as higher_studies_count,
                COUNT(*) FILTER (WHERE employment_status = 'Entrepreneur') as entrepreneur_count,
                COUNT(*) FILTER (WHERE employment_status = 'Self-employed') as self_employed_count,
                COUNT(*) FILTER (WHERE consent_for_accreditation = true) as consented_count,
                COUNT(*) FILTER (WHERE profile_verified_at IS NOT NULL) as verified_count,
                COUNT(*) FILTER (WHERE phone IS NOT NULL) as complete_contact_count,
                AVG(cgpa) as avg_cgpa
            FROM alumni_profiles
            WHERE ${whereClause}
        ),
        users_count AS (
            -- Global alumni count based on approved users (role='alumni' AND is_approved = true)
            SELECT COUNT(*) as total_alumni_users
            FROM users
            WHERE role = 'alumni' AND is_approved = true
        ),
        placement_stats AS (
            SELECT 
                COUNT(*) as total_placements,
                AVG(salary_package) as avg_salary,
                MAX(salary_package) as max_salary,
                MIN(salary_package) as min_salary,
                COUNT(DISTINCT company_name) as unique_companies
            FROM placement_data pd
            JOIN alumni_profiles ap ON pd.alumni_id = ap.id
            WHERE pd.verification_status = 'verified'
                AND ${whereClause.replace('graduation_year', 'ap.graduation_year').replace('program', 'ap.program').replace('department', 'ap.department')}
        ),
        contribution_stats AS (
            SELECT 
                COUNT(*) as total_contributions,
                SUM(amount) FILTER (WHERE ac.contribution_type = 'donation') as total_donations,
                COUNT(*) FILTER (WHERE ac.contribution_type = 'guest_lecture') as guest_lectures,
                COUNT(*) FILTER (WHERE ac.contribution_type = 'mentorship') as mentorships
            FROM alumni_contributions ac
            JOIN alumni_profiles ap ON ac.alumni_id = ap.id
            WHERE ac.is_verified = true
                AND ${whereClause.replace('graduation_year', 'ap.graduation_year').replace('program', 'ap.program').replace('department', 'ap.department')}
        ),
        achievement_stats AS (
            SELECT 
                COUNT(*) as total_achievements,
                COUNT(*) FILTER (WHERE aa.achievement_type = 'startup_founded') as startups_founded,
                COUNT(*) FILTER (WHERE aa.achievement_type = 'patent') as patents_filed,
                COUNT(*) FILTER (WHERE aa.achievement_type = 'publication') as publications
            FROM alumni_achievements aa
            JOIN alumni_profiles ap ON aa.alumni_id = ap.id
            WHERE aa.is_verified = true
                AND ${whereClause.replace('graduation_year', 'ap.graduation_year').replace('program', 'ap.program').replace('department', 'ap.department')}
        )
        SELECT 
            u.total_alumni_users as total_alumni,
            a.total_profiles_alumni as total_profiles_alumni,
            a.employed_count,
            a.higher_studies_count,
            a.entrepreneur_count,
            a.self_employed_count,
            a.consented_count,
            a.verified_count,
            a.complete_contact_count,
            a.avg_cgpa,
            p.total_placements,
            p.avg_salary,
            p.max_salary,
            p.min_salary,
            p.unique_companies,
            c.total_contributions,
            c.total_donations,
            c.guest_lectures,
            c.mentorships,
            ach.total_achievements,
            ach.startups_founded,
            ach.patents_filed,
            ach.publications,
            CASE 
                WHEN a.total_profiles_alumni > 0 
                THEN ROUND((a.employed_count::numeric / a.total_profiles_alumni::numeric) * 100, 2)
                ELSE 0
            END as placement_rate,
            CASE 
                WHEN a.total_profiles_alumni > 0 
                THEN ROUND((a.higher_studies_count::numeric / a.total_profiles_alumni::numeric) * 100, 2)
                ELSE 0
            END as higher_studies_rate,
            CASE 
                WHEN a.total_profiles_alumni > 0 
                THEN ROUND((a.complete_contact_count::numeric / a.total_profiles_alumni::numeric) * 100, 2)
                ELSE 0
            END as contact_completeness,
            CASE 
                WHEN a.total_profiles_alumni > 0 
                THEN ROUND(((a.employed_count + a.higher_studies_count + a.entrepreneur_count)::numeric / a.total_profiles_alumni::numeric) * 100, 2)
                ELSE 0
            END as overall_outcome_rate
        FROM alumni_stats a
        CROSS JOIN users_count u
        CROSS JOIN placement_stats p
        CROSS JOIN contribution_stats c
        CROSS JOIN achievement_stats ach
    `;
    
    console.log('getOverviewKPIs: executing query with params:', params);
    console.log('getOverviewKPIs: SQL query length:', query.length);
    
    const result = await dbQuery(query, params);
    console.log('getOverviewKPIs: query successful, result=', result.rows[0]);
    return result.rows[0];
}

/**
 * Get placement details with filtering
 */
async function getPlacementDetails(filters = {}) {
    const { startYear, endYear, program, department, companyName, limit = 100, offset = 0 } = filters;
    
    let whereConditions = ['pd.verification_status = \'verified\''];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`pd.placement_year >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`pd.placement_year <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    if (program) {
        whereConditions.push(`pd.program = $${paramCount}`);
        params.push(program);
        paramCount++;
    }
    
    if (department) {
        whereConditions.push(`pd.department = $${paramCount}`);
        params.push(department);
        paramCount++;
    }
    
    if (companyName) {
        whereConditions.push(`pd.company_name ILIKE $${paramCount}`);
        params.push(`%${companyName}%`);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    params.push(limit, offset);
    
    const query = `
        SELECT 
            pd.*,
            ap.first_name,
            ap.last_name,
            ap.student_id,
            CASE 
                WHEN pd.is_anonymous THEN 'Anonymous Alumni'
                ELSE CONCAT(ap.first_name, ' ', ap.last_name)
            END as alumni_name,
            CASE 
                WHEN pd.show_company THEN pd.company_name
                ELSE 'Confidential'
            END as display_company_name
        FROM placement_data pd
        JOIN alumni_profiles ap ON pd.alumni_id = ap.id
        WHERE ${whereClause}
        ORDER BY pd.placement_year DESC, pd.salary_package DESC NULLS LAST
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `
        SELECT COUNT(*) as total
        FROM placement_data pd
        WHERE ${whereClause}
    `;
    
    const [data, count] = await Promise.all([
        dbQuery(query, params),
        dbQuery(countQuery, params.slice(0, -2))
    ]);
    
    return {
        data: data.rows,
        total: parseInt(count.rows[0].total),
        limit,
        offset
    };
}

/**
 * Get placement statistics by year
 */
async function getPlacementTrends(filters = {}) {
    const { startYear = 2015, endYear = 2025, program, department } = filters;
    
    let whereConditions = ['verification_status = \'verified\''];
    let params = [startYear, endYear];
    let paramCount = 3;
    
    if (program) {
        whereConditions.push(`program = $${paramCount}`);
        params.push(program);
        paramCount++;
    }
    
    if (department) {
        whereConditions.push(`department = $${paramCount}`);
        params.push(department);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            placement_year,
            COUNT(*) as total_placements,
            COUNT(DISTINCT company_name) as unique_companies,
            AVG(salary_package) as avg_salary,
            MAX(salary_package) as max_salary,
            MIN(salary_package) as min_salary,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_package) as median_salary,
            COUNT(*) FILTER (WHERE placement_type = 'Campus Placement') as campus_placements,
            COUNT(*) FILTER (WHERE placement_type = 'Off-Campus') as off_campus_placements,
            COUNT(*) FILTER (WHERE company_type = 'Product') as product_companies,
            COUNT(*) FILTER (WHERE company_type = 'Service') as service_companies,
            COUNT(*) FILTER (WHERE company_type = 'Startup') as startups
        FROM placement_data
        WHERE placement_year BETWEEN $1 AND $2
            AND ${whereClause}
        GROUP BY placement_year
        ORDER BY placement_year DESC
    `;
    
    const result = await dbQuery(query, params);
    return result.rows;
}

/**
 * Get top employers
 */
async function getTopEmployers(filters = {}) {
    const { startYear, endYear, limit = 20 } = filters;
    
    let whereConditions = ['verification_status = \'verified\''];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`placement_year >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`placement_year <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    params.push(limit);
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            company_name,
            COUNT(*) as hire_count,
            AVG(salary_package) as avg_salary,
            MAX(salary_package) as max_salary,
            array_agg(DISTINCT industry_sector) FILTER (WHERE industry_sector IS NOT NULL) as industries,
            array_agg(DISTINCT program) as programs,
            MIN(placement_year) as first_hire_year,
            MAX(placement_year) as last_hire_year
        FROM placement_data
        WHERE ${whereClause}
            AND show_company = true
        GROUP BY company_name
        ORDER BY hire_count DESC, avg_salary DESC NULLS LAST
        LIMIT $${paramCount}
    `;
    
    const result = await dbQuery(query, params);
    return result.rows;
}

/**
 * Get industry distribution
 */
async function getIndustryDistribution(filters = {}) {
    const { startYear, endYear } = filters;
    
    let whereConditions = ['verification_status = \'verified\'', 'industry_sector IS NOT NULL'];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`placement_year >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`placement_year <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            industry_sector,
            COUNT(*) as alumni_count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage,
            AVG(salary_package) as avg_salary,
            array_agg(DISTINCT company_name ORDER BY company_name) as companies
        FROM placement_data
        WHERE ${whereClause}
        GROUP BY industry_sector
        ORDER BY alumni_count DESC
    `;
    
    const result = await dbQuery(query, params);
    return result.rows;
}

/**
 * Get higher education details
 */
async function getHigherEducationDetails(filters = {}) {
    const { startYear, endYear, program, department, country, limit = 100, offset = 0 } = filters;
    
    let whereConditions = ['hed.verification_status = \'verified\''];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`hed.ug_graduation_year >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`hed.ug_graduation_year <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    if (program) {
        whereConditions.push(`hed.ug_program = $${paramCount}`);
        params.push(program);
        paramCount++;
    }
    
    if (department) {
        whereConditions.push(`hed.ug_department = $${paramCount}`);
        params.push(department);
        paramCount++;
    }
    
    if (country) {
        whereConditions.push(`hed.institution_country = $${paramCount}`);
        params.push(country);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    params.push(limit, offset);
    
    const query = `
        SELECT 
            hed.*,
            ap.first_name,
            ap.last_name,
            ap.student_id
        FROM higher_education_data hed
        JOIN alumni_profiles ap ON hed.alumni_id = ap.id
        WHERE ${whereClause}
            AND hed.is_public = true
        ORDER BY hed.admission_year DESC, hed.institution_name
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `
        SELECT COUNT(*) as total
        FROM higher_education_data hed
        WHERE ${whereClause}
            AND hed.is_public = true
    `;
    
    const [data, count] = await Promise.all([
        dbQuery(query, params),
        dbQuery(countQuery, params.slice(0, -2))
    ]);
    
    return {
        data: data.rows,
        total: parseInt(count.rows[0].total),
        limit,
        offset
    };
}

/**
 * Get higher education statistics
 */
async function getHigherEducationStats(filters = {}) {
    const { startYear, endYear, program, department } = filters;
    
    let whereConditions = ['verification_status = \'verified\''];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`ug_graduation_year >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`ug_graduation_year <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    if (program) {
        whereConditions.push(`ug_program = $${paramCount}`);
        params.push(program);
        paramCount++;
    }
    
    if (department) {
        whereConditions.push(`ug_department = $${paramCount}`);
        params.push(department);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Country distribution
    const countryQuery = `
        SELECT 
            institution_country,
            COUNT(*) as student_count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage
        FROM higher_education_data
        WHERE ${whereClause}
        GROUP BY institution_country
        ORDER BY student_count DESC
        LIMIT 10
    `;
    
    // Program level distribution
    const programQuery = `
        SELECT 
            program_level,
            COUNT(*) as student_count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage
        FROM higher_education_data
        WHERE ${whereClause}
        GROUP BY program_level
        ORDER BY student_count DESC
    `;
    
    // Top institutions
    const institutionQuery = `
        SELECT 
            institution_name,
            institution_country,
            COUNT(*) as student_count,
            array_agg(DISTINCT program_level) as programs
        FROM higher_education_data
        WHERE ${whereClause}
        GROUP BY institution_name, institution_country
        ORDER BY student_count DESC
        LIMIT 15
    `;
    
    // Funding distribution
    const fundingQuery = `
        SELECT 
            funding_type,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage
        FROM higher_education_data
        WHERE ${whereClause}
        GROUP BY funding_type
        ORDER BY count DESC
    `;
    
    const [countries, programs, institutions, funding] = await Promise.all([
        dbQuery(countryQuery, params),
        dbQuery(programQuery, params),
        dbQuery(institutionQuery, params),
        dbQuery(fundingQuery, params)
    ]);
    
    return {
        byCountry: countries.rows,
        byProgramLevel: programs.rows,
        topInstitutions: institutions.rows,
        byFunding: funding.rows
    };
}

/**
 * Get alumni contributions summary
 */
async function getContributionsSummary(filters = {}) {
    const { startYear, endYear, type, minAmount, limit = 50 } = filters;
    
    let whereConditions = ['ac.is_verified = true'];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`EXTRACT(YEAR FROM ac.contribution_date) >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`EXTRACT(YEAR FROM ac.contribution_date) <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    if (type) {
        whereConditions.push(`ac.contribution_type = $${paramCount}`);
        params.push(type);
        paramCount++;
    }
    
    params.push(limit);
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            ac.*,
            ap.first_name,
            ap.last_name,
            ap.graduation_year,
            ap.program
        FROM alumni_contributions ac
        JOIN alumni_profiles ap ON ac.alumni_id = ap.id
        WHERE ${whereClause}
        ORDER BY ac.contribution_date DESC, ac.amount DESC NULLS LAST
        LIMIT $${paramCount}
    `;
    
    // Summary statistics
    const statsQuery = `
        SELECT 
            contribution_type as type,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            SUM(beneficiaries_count) as total_students_impacted
        FROM alumni_contributions ac
        WHERE ${whereClause}
        GROUP BY contribution_type
        ORDER BY count DESC
    `;
    
    const [contributions, stats] = await Promise.all([
        dbQuery(query, params),
        dbQuery(statsQuery, params.slice(0, -1))
    ]);
    
    return {
        contributions: contributions.rows,
        summary: stats.rows
    };
}

/**
 * Get alumni achievements
 */
async function getAchievementsSummary(filters = {}) {
    const { startYear, endYear, type, recognitionLevel, limit = 50 } = filters;
    
    let whereConditions = ['aa.is_verified = true'];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`EXTRACT(YEAR FROM aa.achievement_date) >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`EXTRACT(YEAR FROM aa.achievement_date) <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    if (type) {
        whereConditions.push(`aa.achievement_type = $${paramCount}`);
        params.push(type);
        paramCount++;
    }
    
    if (recognitionLevel) {
        whereConditions.push(`aa.visibility = $${paramCount}`);
        params.push(recognitionLevel);
        paramCount++;
    }
    
    params.push(limit);
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            aa.*,
            ap.first_name,
            ap.last_name,
            ap.graduation_year,
            ap.program
        FROM alumni_achievements aa
        JOIN alumni_profiles ap ON aa.alumni_id = ap.id
        WHERE ${whereClause}
        ORDER BY aa.achievement_date DESC, aa.created_at DESC
        LIMIT $${paramCount}
    `;
    
    // Summary statistics
    const statsQuery = `
        SELECT 
            achievement_type as type,
            COUNT(*) as count,
            visibility as recognition_level,
            COUNT(*) as count_by_level
        FROM alumni_achievements aa
        WHERE ${whereClause}
        GROUP BY ROLLUP(achievement_type, visibility)
        ORDER BY achievement_type, count DESC
    `;
    
    const [achievements, stats] = await Promise.all([
        dbQuery(query, params),
        dbQuery(statsQuery, params.slice(0, -1))
    ]);
    
    return {
        achievements: achievements.rows,
        summary: stats.rows
    };
}

/**
 * Get contact verification status
 */
async function getContactVerificationStatus(filters = {}) {
    const { program, department, graduationYear } = filters;
    
    let whereConditions = ['1=1'];
    let params = [];
    let paramCount = 1;
    
    if (program) {
        whereConditions.push(`program = $${paramCount}`);
        params.push(program);
        paramCount++;
    }
    
    if (department) {
        whereConditions.push(`department = $${paramCount}`);
        params.push(department);
        paramCount++;
    }
    
    if (graduationYear) {
        whereConditions.push(`graduation_year = $${paramCount}`);
        params.push(graduationYear);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            COUNT(*) as total_alumni,
            COUNT(*) FILTER (WHERE phone IS NOT NULL) as has_phone,
            COUNT(*) FILTER (WHERE linkedin_url IS NOT NULL) as has_linkedin,
            COUNT(*) FILTER (WHERE profile_verified_at IS NOT NULL) as verified_profiles,
            COUNT(*) FILTER (WHERE phone IS NOT NULL) as complete_contact,
            COUNT(*) FILTER (WHERE consent_for_accreditation = true) as has_consent,
            COUNT(*) FILTER (
                WHERE phone IS NOT NULL 
                AND profile_verified_at IS NOT NULL
                AND consent_for_accreditation = true
            ) as fully_verified,
            ROUND(AVG(CASE WHEN profile_verified_at IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as verification_rate
        FROM alumni_profiles
        WHERE ${whereClause}
    `;
    
    const result = await dbQuery(query, params);
    return result.rows[0];
}

/**
 * Get event participation statistics
 */
async function getEventParticipationStats(filters = {}) {
    const { startYear, endYear } = filters;
    
    let whereConditions = ['e.status = \'completed\''];
    let params = [];
    let paramCount = 1;
    
    if (startYear) {
        whereConditions.push(`EXTRACT(YEAR FROM e.start_datetime) >= $${paramCount}`);
        params.push(startYear);
        paramCount++;
    }
    
    if (endYear) {
        whereConditions.push(`EXTRACT(YEAR FROM e.start_datetime) <= $${paramCount}`);
        params.push(endYear);
        paramCount++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
        SELECT 
            COUNT(DISTINCT e.id) as total_events,
            COUNT(DISTINCT er.user_id) as unique_participants,
            COUNT(*) FILTER (WHERE er.attended = true) as total_attendance,
            AVG(er.feedback_rating) FILTER (WHERE er.feedback_rating IS NOT NULL) as avg_feedback_rating,
            COUNT(*) FILTER (WHERE er.certificate_issued = true) as certificates_issued,
            SUM(er.attendance_duration_minutes) FILTER (WHERE er.attendance_duration_minutes IS NOT NULL) / 60.0 as total_engagement_hours
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        WHERE ${whereClause}
    `;
    
    const result = await dbQuery(query, params);
    return result.rows[0];
}

/**
 * Get program-wise outcomes (for NBA)
 */
async function getProgramOutcomes(program, graduationYear) {
    const query = `
        WITH program_alumni AS (
            SELECT 
                id,
                graduation_year,
                cgpa,
                employment_status
            FROM alumni_profiles
            WHERE program = $1
                AND graduation_year = $2
        ),
        placement_outcomes AS (
            SELECT 
                COUNT(*) as placed_count,
                AVG(salary_package) as avg_salary,
                COUNT(DISTINCT company_name) as unique_recruiters
            FROM placement_data pd
            JOIN program_alumni pa ON pd.alumni_id = pa.id
            WHERE pd.verification_status = 'verified'
        ),
        higher_ed_outcomes AS (
            SELECT 
                COUNT(*) as higher_ed_count,
                COUNT(*) FILTER (WHERE institution_country != 'India') as foreign_admits,
                COUNT(*) FILTER (WHERE funding_type IN ('Scholarship', 'Fellowship', 'Assistantship')) as funded_admits
            FROM higher_education_data hed
            JOIN program_alumni pa ON hed.alumni_id = pa.id
            WHERE hed.verification_status = 'verified'
        ),
        achievement_outcomes AS (
            SELECT 
                COUNT(*) FILTER (WHERE type = 'startup_founded') as entrepreneurs,
                COUNT(*) FILTER (WHERE type = 'patent') as patents,
                COUNT(*) FILTER (WHERE type = 'publication') as publications
            FROM alumni_achievements aa
            JOIN program_alumni pa ON aa.alumni_id = pa.id
            WHERE aa.verification_status = 'verified'
        )
        SELECT 
            $1 as program,
            $2 as graduation_year,
            COUNT(*) as total_students,
            AVG(cgpa) as avg_cgpa,
            po.*,
            he.*,
            ao.*,
            ROUND((po.placed_count::numeric / COUNT(*)::numeric) * 100, 2) as placement_percentage,
            ROUND((he.higher_ed_count::numeric / COUNT(*)::numeric) * 100, 2) as higher_ed_percentage
        FROM program_alumni pa
        CROSS JOIN placement_outcomes po
        CROSS JOIN higher_ed_outcomes he
        CROSS JOIN achievement_outcomes ao
        GROUP BY po.placed_count, po.avg_salary, po.unique_recruiters,
                 he.higher_ed_count, he.foreign_admits, he.funded_admits,
                 ao.entrepreneurs, ao.patents, ao.publications
    `;
    
    const result = await dbQuery(query, [program, graduationYear]);
    return result.rows[0];
}

export default {
    getOverviewKPIs,
    getPlacementDetails,
    getPlacementTrends,
    getTopEmployers,
    getIndustryDistribution,
    getHigherEducationDetails,
    getHigherEducationStats,
    getContributionsSummary,
    getAchievementsSummary,
    getContactVerificationStatus,
    getEventParticipationStats,
    getProgramOutcomes
};

