import {
  findOne,
  findMany,
  insertOne,
  updateMany,
  deleteMany,
  count,
  query,
  executeTransaction,
} from "../utils/sqlHelpers.js";

/**
 * Alumni Profile Model - SQL-based operations for alumni_profiles table
 */
class AlumniProfile {
  /**
   * Find profile by ID
   * @param {string} id - Profile UUID
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return await findOne("alumni_profiles", { id });
  }

  /**
   * Find profile by user ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>}
   */
  static async findByUserId(userId) {
    return await findOne("alumni_profiles", { user_id: userId });
  }

  /**
   * Create a new alumni profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>}
   */
  static async create(profileData) {
    const {
      userId,
      firstName,
      lastName,
      middleName,
      profilePictureUrl,
      phone,
      dateOfBirth,
      gender,
      studentId,
      admissionYear,
      graduationYear,
      degree,
      branch,
      cgpa,
      currentCompany,
      currentPosition,
      industry,
      workExperienceYears = 0,
      skills = [],
      professionalInterests = [],
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      twitterUrl,
      currentCity,
      currentState,
      currentCountry = "India",
      hometownCity,
      hometownState,
      bio,
      interests = [],
      isProfilePublic = true,
      showContactInfo = false,
      showWorkInfo = true,
      showAcademicInfo = true,
      isOpenToWork = false,
      isAvailableForMentorship = false,
      // New professional fields
      employmentStatus,
      targetRole,
      institutionName,
      expectedCompletionYear,
      careerGoals = [],
      interestedInMentoring = false,
      openToReferrals = false,
      availableForSpeaking = false,
      // Accreditation fields (optional)
      currentEmployer,
      currentJobTitle,
      industrySector,
      jobLocation,
      jobStartYear,
      annualSalaryRange,
      jobType,
      higherStudyInstitution,
      higherStudyProgram,
      higherStudyField,
      higherStudyCountry = "India",
      higherStudyYear,
      higherStudyStatus,
      consentForAccreditation,
      consentDate,
      consentIpAddress,
      program,
      department,
      alternateEmail,
      currentAddress,
      permanentAddress,
      profileVerifiedAt,
      verificationSource,
    } = profileData;

    const data = {
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      profile_picture_url: profilePictureUrl,
      phone,
      date_of_birth: dateOfBirth,
      gender,
      student_id: studentId,
      admission_year: admissionYear,
      graduation_year: graduationYear,
      degree,
      branch,
      cgpa,
      current_company: currentCompany,
      current_position: currentPosition,
      industry,
      work_experience_years: workExperienceYears,
      skills,
      professional_interests: professionalInterests,
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      portfolio_url: portfolioUrl,
      twitter_url: twitterUrl,
      current_city: currentCity,
      current_state: currentState,
      current_country: currentCountry,
      employment_status: employmentStatus,
      target_role: targetRole,
      institution_name: institutionName,
      expected_completion_year: expectedCompletionYear,
      career_goals: careerGoals,
      interested_in_mentoring: interestedInMentoring,
      open_to_referrals: openToReferrals,
      available_for_speaking: availableForSpeaking,
      current_employer: currentEmployer || currentCompany,
      current_job_title: currentJobTitle || currentPosition,
      industry_sector: industrySector || industry,
      job_location: currentCity || jobLocation,
      job_start_year: workExperienceYears
        ? jobStartYear || workExperienceYears
        : jobStartYear,
      annual_salary_range: annualSalaryRange,
      job_type: jobType,
      higher_study_institution: higherStudyInstitution,
      higher_study_program: higherStudyProgram,
      higher_study_field: higherStudyField,
      higher_study_country: higherStudyCountry,
      higher_study_year: higherStudyYear,
      higher_study_status: higherStudyStatus,
      consent_for_accreditation: consentForAccreditation,
      consent_date: consentDate,
      consent_ip_address: consentIpAddress,
      program,
      department,
      alternate_email: alternateEmail,
      current_address: currentAddress,
      permanent_address: permanentAddress,
      profile_verified_at: profileVerifiedAt,
      verification_source: verificationSource,
      hometown_city: hometownCity,
      hometown_state: hometownState,
      bio,
      interests,
      is_profile_public: isProfilePublic,
      show_contact_info: showContactInfo,
      show_work_info: showWorkInfo,
      show_academic_info: showAcademicInfo,
    };

    // Remove undefined values
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    // Handle array fields properly for PostgreSQL
    const arrayFields = ["skills", "interests"];
    arrayFields.forEach((field) => {
      if (data.hasOwnProperty(field)) {
        if (
          data[field] === "" ||
          data[field] === null ||
          data[field] === undefined
        ) {
          // Convert empty/null values to empty arrays
          data[field] = [];
        } else if (typeof data[field] === "string") {
          // Convert comma-separated string to array
          if (data[field].trim() === "") {
            data[field] = [];
          } else {
            data[field] = data[field]
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
          }
        } else if (!Array.isArray(data[field])) {
          // Ensure it's an array
          data[field] = [];
        }
      }
    });

    return await insertOne("alumni_profiles", data);
  }

  /**
   * Update alumni profile
   * @param {string} id - Profile ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>}
   */
  static async update(id, updateData) {
    // Convert camelCase keys to snake_case for database
    const dbData = this.convertToDbFormat(updateData);

    // Handle array fields properly for PostgreSQL
    const arrayFields = [
      "skills",
      "interests",
      "professional_interests",
      "career_goals",
    ];
    arrayFields.forEach((field) => {
      if (dbData.hasOwnProperty(field)) {
        if (
          dbData[field] === "" ||
          dbData[field] === null ||
          dbData[field] === undefined
        ) {
          // Convert empty/null values to empty arrays
          dbData[field] = [];
        } else if (typeof dbData[field] === "string") {
          // Convert comma-separated string to array
          if (dbData[field].trim() === "") {
            dbData[field] = [];
          } else {
            dbData[field] = dbData[field]
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
          }
        } else if (!Array.isArray(dbData[field])) {
          // Ensure it's an array
          dbData[field] = [];
        }
      }
    });

    // Remove undefined values
    Object.keys(dbData).forEach((key) => {
      if (dbData[key] === undefined) {
        delete dbData[key];
      }
    });

    const result = await updateMany("alumni_profiles", dbData, { id });
    return result[0] || null;
  }

  /**
   * Update profile picture
   * @param {string} id - Profile ID
   * @param {string} profilePictureUrl - New profile picture URL
   * @returns {Promise<Object|null>}
   */
  static async updateProfilePicture(id, profilePictureUrl) {
    return await this.update(id, { profilePictureUrl });
  }

  /**
   * Get all alumni profiles with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      graduationYear,
      branch,
      currentCity,
      currentState,
      currentCountry,
      industry,
      company,
      orderBy = "created_at DESC",
      publicOnly = true,
      studentType = "alumni",
      currentYear = new Date().getFullYear(),
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Only show alumni role users (not admin users)
    whereConditions.push(`u.role = $${paramIndex}`);
    queryParams.push("alumni");
    paramIndex++;

    // Filter by student type (alumni vs current students)
    if (studentType === "alumni") {
      // Alumni: graduation year <= current year
      whereConditions.push(`ap.graduation_year <= $${paramIndex}`);
      queryParams.push(currentYear);
      paramIndex++;
    } else if (studentType === "current") {
      // Current students: graduation year > current year
      whereConditions.push(`ap.graduation_year > $${paramIndex}`);
      queryParams.push(currentYear);
      paramIndex++;
    }

    // Search in name, company, or skills
    if (search) {
      whereConditions.push(`(
        LOWER(ap.first_name || ' ' || ap.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(ap.current_company) LIKE LOWER($${paramIndex}) OR
        EXISTS (SELECT 1 FROM unnest(ap.skills) AS skill WHERE LOWER(skill) LIKE LOWER($${paramIndex}))
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by graduation year
    if (graduationYear) {
      whereConditions.push(`ap.graduation_year = $${paramIndex}`);
      queryParams.push(graduationYear);
      paramIndex++;
    }

    // Filter by branch
    if (branch) {
      whereConditions.push(`LOWER(ap.branch) = LOWER($${paramIndex})`);
      queryParams.push(branch);
      paramIndex++;
    }

    // Filter by current location
    if (currentCity) {
      whereConditions.push(`LOWER(ap.current_city) = LOWER($${paramIndex})`);
      queryParams.push(currentCity);
      paramIndex++;
    }

    if (currentState) {
      whereConditions.push(`LOWER(ap.current_state) = LOWER($${paramIndex})`);
      queryParams.push(currentState);
      paramIndex++;
    }

    if (currentCountry) {
      whereConditions.push(`LOWER(ap.current_country) = LOWER($${paramIndex})`);
      queryParams.push(currentCountry);
      paramIndex++;
    }

    // Filter by industry
    if (industry) {
      whereConditions.push(`LOWER(ap.industry) = LOWER($${paramIndex})`);
      queryParams.push(industry);
      paramIndex++;
    }

    // Filter by company
    if (company) {
      whereConditions.push(`LOWER(ap.current_company) = LOWER($${paramIndex})`);
      queryParams.push(company);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Validate and sanitize ORDER BY clause to prevent SQL injection
    const allowedOrderBy = {
      "created_at DESC": "ap.created_at DESC",
      "created_at ASC": "ap.created_at ASC",
      "graduation_year DESC": "ap.graduation_year DESC",
      "graduation_year ASC": "ap.graduation_year ASC",
      "first_name ASC": "ap.first_name ASC",
      "first_name DESC": "ap.first_name DESC",
      "last_name ASC": "ap.last_name ASC",
      "last_name DESC": "ap.last_name DESC",
    };

    const safeOrderBy = allowedOrderBy[orderBy] || "ap.created_at DESC";

    // Get profiles
    const profilesQuery = `
      SELECT 
        ap.*,
        u.email,
        u.role
      FROM alumni_profiles ap
      JOIN users u ON ap.user_id = u.id
      ${whereClause}
      ORDER BY ${safeOrderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const profilesResult = await query(profilesQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM alumni_profiles ap
      JOIN users u ON ap.user_id = u.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].count);

    return {
      profiles: profilesResult.rows.map(this.convertFromDbFormat),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get profile with work experience and education
   * @param {string} id - Profile ID
   * @returns {Promise<Object|null>}
   */
  static async findWithDetails(id) {
    return await executeTransaction(async (client) => {
      // Get basic profile
      const profileQuery = `
        SELECT 
          ap.*,
          u.email,
          u.role,
          u.email_verified
        FROM alumni_profiles ap
        JOIN users u ON ap.user_id = u.id
        WHERE ap.id = $1
      `;

      const profileResult = await client.query(profileQuery, [id]);
      if (profileResult.rows.length === 0) return null;

      const profile = this.convertFromDbFormat(profileResult.rows[0]);

      // Get work experiences
      const workQuery = `
        SELECT * FROM work_experiences 
        WHERE alumni_id = $1 
        ORDER BY is_current DESC, start_date DESC
      `;
      const workResult = await client.query(workQuery, [id]);
      profile.workExperiences = workResult.rows;

      // Get additional education
      const educationQuery = `
        SELECT * FROM education 
        WHERE alumni_id = $1 
        ORDER BY end_year DESC
      `;
      const educationResult = await client.query(educationQuery, [id]);
      profile.education = educationResult.rows;

      return profile;
    });
  }

  /**
   * Get alumni statistics
   * @returns {Promise<Object>}
   */
  static async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_profiles,
        COUNT(*) FILTER (WHERE graduation_year >= EXTRACT(YEAR FROM NOW()) - 5) as recent_graduates,
        COUNT(DISTINCT current_country) as countries,
        COUNT(DISTINCT current_city) as cities,
        COUNT(DISTINCT industry) as industries,
        COUNT(DISTINCT branch) as branches,
        AVG(work_experience_years)::NUMERIC(4,2) as avg_experience
      FROM alumni_profiles
    `;

    const result = await query(statsQuery);

    // Get top locations
    const locationsQuery = `
      SELECT current_city, current_state, COUNT(*) as count
      FROM alumni_profiles
      WHERE current_city IS NOT NULL
      GROUP BY current_city, current_state
      ORDER BY count DESC
      LIMIT 10
    `;

    const locationsResult = await query(locationsQuery);

    // Get top industries
    const industriesQuery = `
      SELECT industry, COUNT(*) as count
      FROM alumni_profiles
      WHERE industry IS NOT NULL
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 10
    `;

    const industriesResult = await query(industriesQuery);

    // Get graduation year distribution
    const yearQuery = `
      SELECT graduation_year, COUNT(*) as count
      FROM alumni_profiles
      WHERE graduation_year IS NOT NULL
      GROUP BY graduation_year
      ORDER BY graduation_year DESC
    `;

    const yearResult = await query(yearQuery);

    return {
      ...result.rows[0],
      topLocations: locationsResult.rows,
      topIndustries: industriesResult.rows,
      graduationYears: yearResult.rows,
    };
  }

  /**
   * Delete alumni profile
   * @param {string} id - Profile ID
   * @returns {Promise<number>}
   */
  static async delete(id) {
    return await deleteMany("alumni_profiles", { id });
  }

  /**
   * Get unique companies with autocomplete support
   * Uses DISTINCT and LOWER() to prevent duplicates like "Google" vs "google"
   * @param {string} searchQuery - Search query
   * @returns {Promise<Array<string>>}
   */
  static async getUniqueCompanies(searchQuery = '') {
    const searchPattern = `%${searchQuery.toLowerCase()}%`;
    
    const sql = `
      SELECT DISTINCT 
        INITCAP(TRIM(current_employer)) as company,
        COUNT(*) as usage_count
      FROM alumni_profiles
      WHERE LOWER(TRIM(current_employer)) LIKE $1
        AND current_employer IS NOT NULL
        AND current_employer != ''
        AND LENGTH(TRIM(current_employer)) > 0
      GROUP BY INITCAP(TRIM(current_employer))
      ORDER BY usage_count DESC, company ASC
      LIMIT 20
    `;
    
    const result = await query(sql, [searchPattern]);
    return result.rows.map(row => row.company);
  }

  /**
   * Get unique cities with state and country
   * Returns formatted "City, State, Country" strings
   * @param {string} searchQuery - Search query
   * @returns {Promise<Array<string>>}
   */
  static async getUniqueCities(searchQuery = '') {
    const searchPattern = `%${searchQuery.toLowerCase()}%`;
    
    const sql = `
      SELECT DISTINCT
        INITCAP(TRIM(current_city)) as city,
        INITCAP(TRIM(current_state)) as state,
        INITCAP(TRIM(current_country)) as country,
        COUNT(*) as alumni_count
      FROM alumni_profiles
      WHERE LOWER(TRIM(current_city)) LIKE $1
        AND current_city IS NOT NULL
        AND current_city != ''
        AND LENGTH(TRIM(current_city)) > 0
      GROUP BY 
        INITCAP(TRIM(current_city)),
        INITCAP(TRIM(current_state)),
        INITCAP(TRIM(current_country))
      ORDER BY alumni_count DESC, city ASC
      LIMIT 20
    `;
    
    const result = await query(sql, [searchPattern]);
    
    return result.rows.map(row => {
      const parts = [row.city];
      if (row.state) parts.push(row.state);
      if (row.country) parts.push(row.country);
      return parts.join(', ');
    });
  }

  /**
   * Get unique industries
   * @param {string} searchQuery - Search query
   * @returns {Promise<Array<string>>}
   */
  static async getUniqueIndustries(searchQuery = '') {
    const searchPattern = `%${searchQuery.toLowerCase()}%`;
    
    const sql = `
      SELECT DISTINCT
        INITCAP(TRIM(industry_sector)) as industry,
        COUNT(*) as usage_count
      FROM alumni_profiles
      WHERE LOWER(TRIM(industry_sector)) LIKE $1
        AND industry_sector IS NOT NULL
        AND industry_sector != ''
        AND LENGTH(TRIM(industry_sector)) > 0
      GROUP BY INITCAP(TRIM(industry_sector))
      ORDER BY usage_count DESC, industry ASC
      LIMIT 20
    `;
    
    const result = await query(sql, [searchPattern]);
    return result.rows.map(row => row.industry);
  }

  /**
   * Get unique skills from all profiles
   * @param {string} searchQuery - Search query
   * @returns {Promise<Array<string>>}
   */
  static async getUniqueSkills(searchQuery = '') {
    const searchPattern = `%${searchQuery.toLowerCase()}%`;
    
    const sql = `
      SELECT DISTINCT
        INITCAP(TRIM(skill)) as skill,
        COUNT(*) as usage_count
      FROM (
        SELECT unnest(skills) as skill
        FROM alumni_profiles
        WHERE array_length(skills, 1) > 0
      ) AS skill_list
      WHERE LOWER(TRIM(skill)) LIKE $1
        AND LENGTH(TRIM(skill)) > 0
      GROUP BY INITCAP(TRIM(skill))
      ORDER BY usage_count DESC, skill ASC
      LIMIT 20
    `;
    
    const result = await query(sql, [searchPattern]);
    return result.rows.map(row => row.skill);
  }

  /**
   * Get unique branches/departments
   * @param {string} searchQuery - Search query
   * @returns {Promise<Array<string>>}
   */
  static async getUniqueBranches(searchQuery = '') {
    const searchPattern = `%${searchQuery.toLowerCase()}%`;
    
    const sql = `
      SELECT DISTINCT
        INITCAP(TRIM(branch)) as branch,
        COUNT(*) as usage_count
      FROM alumni_profiles
      WHERE LOWER(TRIM(branch)) LIKE $1
        AND branch IS NOT NULL
        AND branch != ''
        AND LENGTH(TRIM(branch)) > 0
      GROUP BY INITCAP(TRIM(branch))
      ORDER BY usage_count DESC, branch ASC
      LIMIT 20
    `;
    
    const result = await query(sql, [searchPattern]);
    return result.rows.map(row => row.branch);
  }

  /**
   * Convert camelCase to snake_case for database operations
   * @param {Object} data - Data object
   * @returns {Object}
   */
  static convertToDbFormat(data) {
    const dbData = {};
    const fieldMap = {
      firstName: "first_name",
      lastName: "last_name",
      middleName: "middle_name",
      profilePictureUrl: "profile_picture_url",
      dateOfBirth: "date_of_birth",
      studentId: "student_id",
      admissionYear: "admission_year",
      graduationYear: "graduation_year",
      currentCompany: "current_company",
      currentPosition: "current_position",
      workExperienceYears: "work_experience_years",
      linkedinUrl: "linkedin_url",
      githubUrl: "github_url",
      portfolioUrl: "portfolio_url",
      twitterUrl: "twitter_url",
      currentCity: "current_city",
      currentState: "current_state",
      currentCountry: "current_country",
      hometownCity: "hometown_city",
      hometownState: "hometown_state",
      isProfilePublic: "is_profile_public",
      showContactInfo: "show_contact_info",
      showWorkInfo: "show_work_info",
      showAcademicInfo: "show_academic_info",
      // Legacy field mappings
      profilePicture: "profile_picture_url",
      rollNumber: "student_id",
      // Accreditation / profile canonical mappings
      employmentStatus: "employment_status",
      targetRole: "target_role",
      institutionName: "institution_name",
      expectedCompletionYear: "expected_completion_year",
      professionalInterests: "professional_interests",
      careerGoals: "career_goals",
      interestedInMentoring: "interested_in_mentoring",
      openToReferrals: "open_to_referrals",
      availableForSpeaking: "available_for_speaking",
      twitterUrl: "twitter_url",
      currentEmployer: "current_employer",
      currentJobTitle: "current_job_title",
      currentPosition: "current_job_title",
      industrySector: "industry_sector",
      jobLocation: "job_location",
      jobStartYear: "job_start_year",
      annualSalaryRange: "annual_salary_range",
      jobType: "job_type",
      higherStudyInstitution: "higher_study_institution",
      higherStudyProgram: "higher_study_program",
      higherStudyField: "higher_study_field",
      higherStudyCountry: "higher_study_country",
      higherStudyYear: "higher_study_year",
      higherStudyStatus: "higher_study_status",
      consentForAccreditation: "consent_for_accreditation",
      consentDate: "consent_date",
      consentIpAddress: "consent_ip_address",
      alternateEmail: "alternate_email",
      currentAddress: "current_address",
      permanentAddress: "permanent_address",
      profileVerifiedAt: "profile_verified_at",
      verificationSource: "verification_source",
      employment_status: "employment_status",
      current_employer: "current_employer",
      current_job_title: "current_job_title",
      industry_sector: "industry_sector",
      job_location: "job_location",
      job_start_year: "job_start_year",
      annual_salary_range: "annual_salary_range",
      job_type: "job_type",
      higher_study_institution: "higher_study_institution",
      higher_study_program: "higher_study_program",
      higher_study_field: "higher_study_field",
      higher_study_country: "higher_study_country",
      higher_study_year: "higher_study_year",
      higher_study_status: "higher_study_status",
      consent_for_accreditation: "consent_for_accreditation",
      consent_date: "consent_date",
      consent_ip_address: "consent_ip_address",
    };

    Object.keys(data).forEach((key) => {
      const dbKey = fieldMap[key] || key;
      dbData[dbKey] = data[key];
    });

    return dbData;
  }

  /**
   * Convert snake_case to camelCase for API responses
   * @param {Object} data - Database row data
   * @returns {Object}
   */
  static convertFromDbFormat(data) {
    if (!data) {
      return null;
    }

    const apiData = {};
    const fieldMap = {
      first_name: "firstName",
      last_name: "lastName",
      middle_name: "middleName",
      profile_picture_url: "profilePictureUrl",
      date_of_birth: "dateOfBirth",
      student_id: "studentId",
      admission_year: "admissionYear",
      graduation_year: "graduationYear",
      current_company: "currentCompany",
      current_position: "currentPosition",
      work_experience_years: "workExperienceYears",
      linkedin_url: "linkedinUrl",
      github_url: "githubUrl",
      portfolio_url: "portfolioUrl",
      twitter_url: "twitterUrl",
      current_city: "currentCity",
      current_state: "currentState",
      current_country: "currentCountry",
      hometown_city: "hometownCity",
      hometown_state: "hometownState",
      is_profile_public: "isProfilePublic",
      show_contact_info: "showContactInfo",
      show_work_info: "showWorkInfo",
      show_academic_info: "showAcademicInfo",
      created_at: "createdAt",
      updated_at: "updatedAt",
      user_id: "userId",
      // Accreditation & canonical fields
      employment_status: "employmentStatus",
      target_role: "targetRole",
      institution_name: "institutionName",
      expected_completion_year: "expectedCompletionYear",
      professional_interests: "professionalInterests",
      career_goals: "careerGoals",
      interested_in_mentoring: "interestedInMentoring",
      open_to_referrals: "openToReferrals",
      available_for_speaking: "availableForSpeaking",
      twitter_url: "twitterUrl",
      current_employer: "currentEmployer",
      current_job_title: "currentJobTitle",
      industry_sector: "industrySector",
      job_location: "jobLocation",
      job_start_year: "jobStartYear",
      annual_salary_range: "annualSalaryRange",
      job_type: "jobType",
      higher_study_institution: "higherStudyInstitution",
      higher_study_program: "higherStudyProgram",
      higher_study_field: "higherStudyField",
      higher_study_country: "higherStudyCountry",
      higher_study_year: "higherStudyYear",
      higher_study_status: "higherStudyStatus",
      consent_for_accreditation: "consentForAccreditation",
      consent_date: "consentDate",
      consent_ip_address: "consentIpAddress",
      program: "program",
      department: "department",
      alternate_email: "alternateEmail",
      current_address: "currentAddress",
      permanent_address: "permanentAddress",
      profile_verified_at: "profileVerifiedAt",
      verification_source: "verificationSource",
    };

    Object.keys(data).forEach((key) => {
      const apiKey = fieldMap[key] || key;
      apiData[apiKey] = data[key];
    });

    // Ensure currentCompany is populated even if only currentEmployer is set
    if (!apiData.currentCompany && apiData.currentEmployer) {
      apiData.currentCompany = apiData.currentEmployer;
    }

    return apiData;
  }
}

export default AlumniProfile;
