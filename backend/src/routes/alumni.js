const express = require("express");
const router = express.Router();
const AlumniProfile = require("../models/AlumniProfile");
const { query } = require("../config/database");

/**
 * @route   GET /api/alumni
 * @desc    Get all alumni profiles with filtering and search
 * @access  Public (with privacy settings respected)
 */
router.get("/", async (req, res) => {
  try {
    const {
      search,
      batch,
      branch,
      company,
      location,
      skills,
      page = 1,
      limit = 20,
      sortBy = "graduation_year",
      sortOrder = "DESC",
    } = req.query;

    // Simple query for now - we'll enhance this
    let queryText = `
      SELECT 
        id, first_name, last_name, graduation_year, branch, degree,
        current_company, current_position, current_city, current_state,
        current_country, skills, linkedin_url, bio, profile_picture_url
      FROM alumni_profiles 
      WHERE is_profile_public = true
    `;
    
    let queryParams = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      queryText += ` AND (
        LOWER(first_name || ' ' || last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(current_company) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add batch filter
    if (batch) {
      queryText += ` AND graduation_year = $${paramIndex}`;
      queryParams.push(parseInt(batch));
      paramIndex++;
    }

    // Add branch filter
    if (branch) {
      queryText += ` AND LOWER(branch) LIKE LOWER($${paramIndex})`;
      queryParams.push(`%${branch}%`);
      paramIndex++;
    }

    // Add ordering
    queryText += ` ORDER BY ${sortBy} ${sortOrder}`;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);

    // Execute query
    const result = await query(queryText, queryParams);
    const alumni = result.rows;

    // Get total count for pagination
    const countResult = await query(
      "SELECT COUNT(*) FROM alumni_profiles WHERE is_profile_public = true",
      []
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: alumni,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: alumni.length,
        totalRecords: total,
      },
    });
  } catch (error) {
    console.error("Get alumni error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching alumni",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/alumni/:id
 * @desc    Get alumni profile by ID with work experience
 * @access  Public (with privacy settings)
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Use findWithDetails to get complete profile information
    const alumni = await AlumniProfile.findWithDetails(id);

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni profile not found",
      });
    }

    // Check privacy settings
    if (!alumni.isProfilePublic) {
      return res.status(403).json({
        success: false,
        message: "This profile is private",
      });
    }

    res.json({
      success: true,
      data: {
        alumni: alumni,
        workExperiences: alumni.workExperiences || [],
        education: alumni.education || []
      }
    });
  } catch (error) {
    console.error("Get alumni profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching alumni profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/alumni
 * @desc    Create alumni profile
 * @access  Private
 */
router.post("/", async (req, res) => {
  try {
    const profileData = req.body;

    // This will need authentication middleware to get user_id
    // For now, we'll expect user_id in the body
    if (!profileData.user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const alumni = await AlumniProfile.create(profileData);

    res.status(201).json({
      success: true,
      message: "Alumni profile created successfully",
      data: alumni,
    });
  } catch (error) {
    console.error("Create alumni profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating alumni profile",
    });
  }
});

/**
 * @route   PUT /api/alumni/:id
 * @desc    Update alumni profile
 * @access  Private (Own profile or Admin)
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove user_id from update data to prevent changing ownership
    delete updateData.user_id;

    const updatedAlumni = await AlumniProfile.update(id, updateData);

    if (!updatedAlumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni profile not found",
      });
    }

    res.json({
      success: true,
      message: "Alumni profile updated successfully",
      data: updatedAlumni,
    });
  } catch (error) {
    console.error("Update alumni profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating alumni profile",
    });
  }
});

/**
 * @route   GET /api/alumni/search/suggestions
 * @desc    Get search suggestions for alumni directory
 * @access  Public
 */
router.get("/search/suggestions", async (req, res) => {
  try {
    const { type, query } = req.query;

    let suggestions = [];

    switch (type) {
      case "companies":
        suggestions = await AlumniProfile.getUniqueCompanies(query);
        break;
      case "locations":
        suggestions = await AlumniProfile.getUniqueLocations(query);
        break;
      case "skills":
        suggestions = await AlumniProfile.getUniqueSkills(query);
        break;
      case "branches":
        suggestions = await AlumniProfile.getUniqueBranches(query);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid suggestion type",
        });
    }

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching suggestions",
    });
  }
});

/**
 * @route   GET /api/alumni/stats/dashboard
 * @desc    Get alumni statistics for dashboard
 * @access  Public
 */
router.get("/stats/dashboard", async (req, res) => {
  try {
    const stats = await AlumniProfile.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get alumni stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching alumni statistics",
    });
  }
});

module.exports = router;
