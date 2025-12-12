import express from "express";
const router = express.Router();
import AlumniProfile from "../models/AlumniProfile.js";
import { query } from "../config/database.js";
import {
  authenticate,
  requireOnboardedUser,
} from "../models/middleware/auth.js";
import {
  uploadProfilePicture,
  handleUploadError,
} from "../models/middleware/upload.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      studentType = "alumni", // 'alumni' or 'current'
    } = req.query;

    const currentYear = new Date().getFullYear();

    // Use AlumniProfile.findAll to get only alumni (not admin) users
    const result = await AlumniProfile.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      graduationYear: batch ? parseInt(batch) : undefined,
      branch,
      company,
      currentCity: location, // Map location to currentCity
      orderBy: `ap.${sortBy} ${sortOrder}`,
      publicOnly: true, // Only show public profiles for privacy
      studentType, // Filter by alumni or current students
      currentYear, // Pass current year for filtering
    });

    res.json({
      success: true,
      data: result.profiles,
      pagination: {
        current: result.pagination.page,
        total: result.pagination.pages,
        count: result.profiles.length,
        totalRecords: result.pagination.total,
      },
    });
  } catch (error) {
    console.error("Get alumni error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching alumni",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/alumni/profile
 * @desc    Get current user's alumni profile
 * @access  Private (Requires completed onboarding)
 */
router.get("/profile", requireOnboardedUser, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const result = await query(
      `SELECT ap.*, u.email 
       FROM alumni_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const profile = AlumniProfile.convertFromDbFormat(result.rows[0]);

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
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

    res.json({
      success: true,
      data: {
        alumni: alumni,
        workExperiences: alumni.workExperiences || [],
        education: alumni.education || [],
      },
    });
  } catch (error) {
    console.error("Get alumni profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching alumni profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

    // For demo purposes, if no user_id provided, get the first user
    let userId = profileData.user_id;

    if (!userId) {
      const { query } = await import("../config/database.js");
      const userResult = await query(
        "SELECT id FROM users ORDER BY created_at LIMIT 1",
        []
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No users found. Please register first.",
        });
      }

      userId = userResult.rows[0].id;
      profileData.user_id = userId;
    }

    // Map frontend fields to model expected format
    const mappedData = {
      userId: profileData.user_id,
      firstName: profileData.first_name,
      lastName: profileData.last_name,
      graduationYear: profileData.graduation_year,
      degree: profileData.degree,
      branch: profileData.branch,
      studentId: profileData.roll_number, // roll_number maps to student_id
      currentCompany: profileData.current_company,
      currentPosition: profileData.current_position,
      currentCity: profileData.current_city,
      currentState: profileData.current_state,
      currentCountry: profileData.current_country,
      bio: profileData.bio,
      skills: profileData.skills, // Already an array from frontend
      linkedinUrl: profileData.linkedin_url,
      githubUrl: profileData.github_url,
      interests: profileData.interests || [],
      workExperienceYears: profileData.work_experience_years || 0,
      isProfilePublic:
        profileData.is_profile_public !== undefined
          ? profileData.is_profile_public
          : true,
      showContactInfo:
        profileData.show_contact_info !== undefined
          ? profileData.show_contact_info
          : false,
      showWorkInfo:
        profileData.show_work_info !== undefined
          ? profileData.show_work_info
          : true,
      showAcademicInfo:
        profileData.show_academic_info !== undefined
          ? profileData.show_academic_info
          : true,
    };

    const alumni = await AlumniProfile.create(mappedData);

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

/**
 * @route   PUT /api/alumni/profile/employment
 * @desc    Update employment information
 * @access  Private (Alumni only)
 */
router.put("/profile/employment", authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const {
      employment_status,
      current_employer,
      current_job_title,
      industry_sector,
      job_location,
      job_start_year,
      annual_salary_range,
      job_type,
    } = req.body;

    const result = await query(
      `UPDATE alumni_profiles
       SET employment_status = $1,
           current_employer = $2,
           current_job_title = $3,
           industry_sector = $4,
           job_location = $5,
           job_start_year = $6,
           annual_salary_range = $7,
           job_type = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $9
       RETURNING *`,
      [
        employment_status,
        current_employer,
        current_job_title,
        industry_sector,
        job_location,
        job_start_year,
        annual_salary_range,
        job_type,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const profile = AlumniProfile.convertFromDbFormat(result.rows[0]);

    res.json({
      success: true,
      message: "Employment information updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update employment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating employment information",
    });
  }
});

/**
 * @route   PUT /api/alumni/profile/education
 * @desc    Update higher education information
 * @access  Private (Alumni only)
 */
router.put("/profile/education", authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const {
      higher_study_institution,
      higher_study_program,
      higher_study_field,
      higher_study_country,
      higher_study_year,
      higher_study_status,
    } = req.body;

    const result = await query(
      `UPDATE alumni_profiles
       SET higher_study_institution = $1,
           higher_study_program = $2,
           higher_study_field = $3,
           higher_study_country = $4,
           higher_study_year = $5,
           higher_study_status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7
       RETURNING *`,
      [
        higher_study_institution,
        higher_study_program,
        higher_study_field,
        higher_study_country,
        higher_study_year,
        higher_study_status,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const profile = AlumniProfile.convertFromDbFormat(result.rows[0]);

    res.json({
      success: true,
      message: "Higher education information updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update education error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating education information",
    });
  }
});

/**
 * @route   PUT /api/alumni/profile/consent
 * @desc    Update accreditation consent
 * @access  Private (Alumni only)
 */
router.put("/profile/consent", authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { consent } = req.body;

    const result = await query(
      `UPDATE alumni_profiles
       SET consent_for_accreditation = $1,
           consent_date = ${consent ? "CURRENT_TIMESTAMP" : "NULL"},
           consent_ip_address = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING *`,
      [consent, req.ip, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const profile = AlumniProfile.convertFromDbFormat(result.rows[0]);

    res.json({
      success: true,
      message: consent ? "Consent granted successfully" : "Consent withdrawn",
      profile,
    });
  } catch (error) {
    console.error("Update consent error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating consent",
    });
  }
});

/**
 * @route   POST /api/alumni/profile/upload-picture
 * @desc    Upload profile picture for current user
 * @access  Private (Requires authentication)
 */
router.post(
  "/profile/upload-picture",
  authenticate,
  uploadProfilePicture.single("profilePicture"),
  handleUploadError,
  async (req, res) => {
    console.log("=== PROFILE PICTURE UPLOAD REQUEST RECEIVED ===");
    console.log("User:", req.user);
    console.log("File:", req.file);
    console.log("Body:", req.body);

    try {
      if (!req.user || !req.user.id) {
        console.log("❌ Authentication failed - no user");
        // Clean up uploaded file if authentication fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      if (!req.file) {
        console.log("❌ No file in request");
        return res.status(400).json({
          success: false,
          message: "No file uploaded. Please select an image file.",
        });
      }

      console.log("✅ File received:", req.file.filename);
      console.log("File path:", req.file.path);
      console.log("File size:", req.file.size);

      // Get user's current profile to check for existing picture
      const profileResult = await query(
        "SELECT profile_picture_url FROM alumni_profiles WHERE user_id = $1",
        [req.user.id]
      );

      console.log(
        "Current profile picture:",
        profileResult.rows[0]?.profile_picture_url
      );

      // Delete old profile picture if exists
      if (
        profileResult.rows.length > 0 &&
        profileResult.rows[0].profile_picture_url
      ) {
        const oldPicturePath = profileResult.rows[0].profile_picture_url;
        // Extract filename from URL (e.g., /uploads/profile_pics/filename.jpg)
        const oldFileName = oldPicturePath.split("/").pop();
        const oldFilePath = path.join(
          __dirname,
          "../../uploads/profile_pics",
          oldFileName
        );

        // Delete old file if it exists
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Deleted old profile picture: ${oldFileName}`);
          } catch (err) {
            console.error("Error deleting old profile picture:", err);
            // Don't fail the upload if we can't delete the old file
          }
        }
      }

      // Generate the URL path for the uploaded file
      const fileUrl = `/uploads/profile_pics/${req.file.filename}`;

      let uploadResult = profileResult;

      // If no profile exists yet (common during onboarding), create a minimal one
      if (profileResult.rows.length === 0) {
        // Fetch basic user info to satisfy NOT NULL constraints
        const userInfo = await query(
          "SELECT first_name, last_name FROM users WHERE id = $1",
          [req.user.id]
        );

        const firstName = userInfo.rows[0]?.first_name?.trim() || "Alumni";
        const lastName = userInfo.rows[0]?.last_name?.trim() || "User";

        uploadResult = await query(
          `INSERT INTO alumni_profiles (
            user_id,
            first_name,
            last_name,
            profile_picture_url,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, profile_picture_url`,
          [req.user.id, firstName, lastName, fileUrl]
        );
      } else {
        // Update profile picture URL in database
        uploadResult = await query(
          `UPDATE alumni_profiles 
           SET profile_picture_url = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $2 
           RETURNING id, profile_picture_url`,
          [fileUrl, req.user.id]
        );
      }

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        data: {
          profilePictureUrl:
            uploadResult.rows[0].profile_picture_url || fileUrl,
          filename: req.file.filename,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Error cleaning up file:", err);
        }
      }

      console.error("Upload profile picture error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while uploading profile picture",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/alumni/profile/delete-picture
 * @desc    Delete profile picture for current user
 * @access  Private (Requires authentication)
 */
router.delete("/profile/delete-picture", authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Get current profile picture URL
    const profileResult = await query(
      "SELECT profile_picture_url FROM alumni_profiles WHERE user_id = $1",
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const currentPictureUrl = profileResult.rows[0].profile_picture_url;

    if (!currentPictureUrl) {
      return res.status(400).json({
        success: false,
        message: "No profile picture to delete",
      });
    }

    // Delete file from filesystem
    const fileName = currentPictureUrl.split("/").pop();
    const filePath = path.join(
      __dirname,
      "../../uploads/profile_pics",
      fileName
    );

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted profile picture: ${fileName}`);
      } catch (err) {
        console.error("Error deleting file:", err);
        // Continue even if file deletion fails
      }
    }

    // Remove profile picture URL from database
    await query(
      `UPDATE alumni_profiles 
       SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    console.error("Delete profile picture error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting profile picture",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
