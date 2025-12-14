import express from "express";
const router = express.Router();
import Event from "../models/Event.js";
import { requireSuperadminAuth } from "../models/middleware/auth.js";

/**
 * @route   GET /api/events/upcoming
 * @desc    Get all upcoming events with filtering and pagination
 * @access  Public
 */
router.get("/upcoming", async (req, res) => {
  try {
    const {
      event_type,
      mode,
      experience_level,
      search,
      page = 1,
      limit = 10,
      sortBy = "start_datetime",
      sortOrder = "ASC",
    } = req.query;

    const options = {
      event_type,
      mode,
      experience_level,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await Event.getAllUpcoming(options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get upcoming events error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming events",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/events/past
 * @desc    Get all past events with filtering and pagination
 * @access  Public
 */
router.get("/past", async (req, res) => {
  try {
    const {
      event_type,
      mode,
      search,
      page = 1,
      limit = 10,
      sortBy = "start_datetime",
      sortOrder = "DESC",
    } = req.query;

    const options = {
      event_type,
      mode,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await Event.getAllPast(options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get past events error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching past events",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/events/types/list
 * @desc    Get available event types
 * @access  Public
 */
router.get("/types/list", async (req, res) => {
  try {
    const eventTypes = [
      "workshop",
      "webinar",
      "volunteer",
      "meetup",
      "seminar",
      "placement-drive",
      "networking",
      "alumni-talk",
    ];

    res.json({
      success: true,
      data: eventTypes,
    });
  } catch (error) {
    console.error("Get event types error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching event types",
    });
  }
});

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Get event by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching event",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/events/propose
 * @desc    Alumni propose a new event (volunteer to conduct)
 * @access  Private (Alumni/Admin)
 */
router.post("/propose", async (req, res) => {
  try {
    // TODO: Add authentication middleware
    // For now, we'll extract user info from request body
    const {
      title,
      description,
      eventType,
      mode,
      location,
      startDateTime,
      endDateTime,
      registrationDeadline,
      maxParticipants,
      requiredSkills,
      experienceLevel,
      agenda,
      requirements,
      benefits,
      contactEmail,
      contactPhone,
      organizerId,
      organizerName
    } = req.body;

    // Validate required fields
    if (!title || !description || !eventType || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, description, eventType, startDateTime, endDateTime"
      });
    }

    // Create event proposal (status: pending, published: false)
    const eventData = {
      title,
      description,
      eventType,
      mode: mode || 'online',
      location,
      startDateTime,
      endDateTime,
      registrationDeadline,
      maxParticipants,
      requiredSkills: requiredSkills || [],
      experienceLevel: experienceLevel || 'all',
      agenda,
      requirements,
      benefits,
      contactEmail,
      contactPhone,
      organizerId,
      organizerName,
      status: 'pending', // Awaiting admin approval
      isPublished: false,
      requiresApproval: true
    };

    const event = await Event.createEvent(eventData);

    res.status(201).json({
      success: true,
      message: "Event proposal submitted successfully. Awaiting admin approval.",
      data: event,
    });
  } catch (error) {
    console.error("Create event proposal error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating event proposal",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/events/admin/proposals
 * @desc    Get event proposals for admin review
 * @access  Private (Superadmin only)
 */
router.get("/admin/proposals", requireSuperadminAuth, async (req, res) => {
  try {
    const {
      status = 'pending',
      page = 1,
      limit = 10
    } = req.query;

    const options = {
      status,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const result = await Event.getProposals(options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get event proposals error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching event proposals",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/events/admin/proposals/:id/:action
 * @desc    Approve or reject event proposal
 * @access  Private (Superadmin only)
 */
router.put("/admin/proposals/:id/:action", requireSuperadminAuth, async (req, res) => {
  try {
    const { id, action } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'approve' or 'reject'"
      });
    }

    const event = await Event.updateProposalStatus(id, action);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event proposal not found or already processed"
      });
    }

    const message = action === 'approve' 
      ? "Event proposal approved and published"
      : "Event proposal rejected";

    res.json({
      success: true,
      message,
      data: event,
    });
  } catch (error) {
    console.error("Update proposal status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating proposal status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/events/:id/register
 * @desc    Register for an event
 * @access  Private (Alumni/Admin)
 */
router.post("/:id/register", async (req, res) => {
  try {
    // TODO: Add authentication middleware
    const { id } = req.params;
    const {
      userId,
      alumniId,
      motivation,
      relevantExperience
    } = req.body;

    if (!userId || !alumniId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, alumniId"
      });
    }

    const registrationData = {
      motivation,
      relevant_experience: relevantExperience
    };

    const result = await Event.registerForEvent(id, userId, alumniId, registrationData);

    let message = "Registration successful";
    if (result.status === 'pending') {
      message = "Registration submitted for approval";
    } else if (result.status === 'waitlist') {
      message = "Event is full. You have been added to the waitlist";
    }

    res.status(201).json({
      success: true,
      message,
      data: {
        registration: result.registration,
        status: result.status
      },
    });
  } catch (error) {
    console.error("Event registration error:", error);
    
    if (error.message === 'User is already registered for this event') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while registering for event",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/events/:id/registrations
 * @desc    Get event registrations (for organizers/admin)
 * @access  Private (Organizer/Admin)
 */
router.get("/:id/registrations", async (req, res) => {
  try {
    // TODO: Add authentication middleware to check if user is organizer or admin
    const { id } = req.params;

    const registrations = await Event.getEventRegistrations(id);

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    console.error("Get event registrations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching event registrations",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/events/:id
 * @desc    Update an event (for organizers/admin)
 * @access  Private (Organizer/Admin)
 */
router.put("/:id", async (req, res) => {
  try {
    // TODO: Add authentication middleware
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const event = await Event.updateEvent(id, updateData);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating event",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
