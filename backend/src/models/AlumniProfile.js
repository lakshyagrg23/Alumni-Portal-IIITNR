const {
  findOne,
  findMany,
  insertOne,
  updateMany,
  deleteMany,
  count,
  query,
  executeTransaction,
} = require("../utils/sqlHelpers");

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
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      currentCity,
      currentState,
      currentCountry = "India",
      hometownCity,
      hometownState,
      bio,
      achievements,
      interests = [],
      isProfilePublic = true,
      showContactInfo = false,
      showWorkInfo = true,
      showAcademicInfo = true,
      isOpenToWork = false,
      isAvailableForMentorship = false,
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
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      portfolio_url: portfolioUrl,
      current_city: currentCity,
      current_state: currentState,
      current_country: currentCountry,
      hometown_city: hometownCity,
      hometown_state: hometownState,
      bio,
      achievements,
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
    const arrayFields = ['skills', 'achievements', 'interests'];
    arrayFields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        if (data[field] === '' || data[field] === null || data[field] === undefined) {
          // Convert empty/null values to empty arrays
          data[field] = [];
        } else if (typeof data[field] === 'string') {
          // Convert comma-separated string to array
          if (data[field].trim() === '') {
            data[field] = [];
          } else {
            data[field] = data[field]
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
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
    const arrayFields = ['skills', 'achievements', 'interests'];
    arrayFields.forEach(field => {
      if (dbData.hasOwnProperty(field)) {
        if (dbData[field] === '' || dbData[field] === null || dbData[field] === undefined) {
          // Convert empty/null values to empty arrays
          dbData[field] = [];
        } else if (typeof dbData[field] === 'string') {
          // Convert comma-separated string to array
          if (dbData[field].trim() === '') {
            dbData[field] = [];
          } else {
            dbData[field] = dbData[field]
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
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
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Only show public profiles by default
    if (publicOnly) {
      whereConditions.push(`ap.is_profile_public = $${paramIndex}`);
      queryParams.push(true);
      paramIndex++;
    }

    // Only show alumni role users (not admin users)
    whereConditions.push(`u.role = $${paramIndex}`);
    queryParams.push("alumni");
    paramIndex++;

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
      'created_at DESC': 'ap.created_at DESC',
      'created_at ASC': 'ap.created_at ASC',
      'graduation_year DESC': 'ap.graduation_year DESC',
      'graduation_year ASC': 'ap.graduation_year ASC',
      'first_name ASC': 'ap.first_name ASC',
      'first_name DESC': 'ap.first_name DESC',
      'last_name ASC': 'ap.last_name ASC',
      'last_name DESC': 'ap.last_name DESC',
    };

    const safeOrderBy = allowedOrderBy[orderBy] || 'ap.created_at DESC';

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
      WHERE is_profile_public = true
    `;

    const result = await query(statsQuery);

    // Get top locations
    const locationsQuery = `
      SELECT current_city, current_state, COUNT(*) as count
      FROM alumni_profiles
      WHERE is_profile_public = true AND current_city IS NOT NULL
      GROUP BY current_city, current_state
      ORDER BY count DESC
      LIMIT 10
    `;

    const locationsResult = await query(locationsQuery);

    // Get top industries
    const industriesQuery = `
      SELECT industry, COUNT(*) as count
      FROM alumni_profiles
      WHERE is_profile_public = true AND industry IS NOT NULL
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 10
    `;

    const industriesResult = await query(industriesQuery);

    // Get graduation year distribution
    const yearQuery = `
      SELECT graduation_year, COUNT(*) as count
      FROM alumni_profiles
      WHERE is_profile_public = true AND graduation_year IS NOT NULL
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
    };

    Object.keys(data).forEach((key) => {
      const apiKey = fieldMap[key] || key;
      apiData[apiKey] = data[key];
    });

    return apiData;
  }
}

module.exports = AlumniProfile;
