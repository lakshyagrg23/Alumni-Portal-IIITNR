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
 * Event Model - SQL-based operations for events table
 */
class Event {
  /**
   * Find event by ID
   * @param {string} id - Event UUID
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return await executeTransaction(async (client) => {
      const eventQuery = `
        SELECT 
          e.*,
          u.email as organizer_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), e.organizer_name, u.email) as organizer_display_name,
          ap.profile_picture_url as organizer_avatar,
          COUNT(er.id) as registered_count
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        LEFT JOIN event_registrations er ON e.id = er.event_id AND er.registration_status = 'approved'
        WHERE e.id = $1 AND e.is_published = true
        GROUP BY e.id, u.email, ap.first_name, ap.last_name, ap.profile_picture_url
      `;
      
      const result = await client.query(eventQuery, [id]);
      return result.rows.length > 0 ? this.convertFromDbFormat(result.rows[0]) : null;
    });
  }

  /**
   * Get all upcoming events (start_datetime > now)
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async getAllUpcoming(options = {}) {
    const {
      event_type,
      mode,
      experience_level,
      search,
      limit = 20,
      offset = 0,
      sortBy = 'start_datetime',
      sortOrder = 'ASC'
    } = options;

    return await executeTransaction(async (client) => {
      let whereConditions = ['e.is_published = true', 'e.start_datetime > NOW()'];
      let params = [];
      let paramIndex = 1;

      // Add filters
      if (event_type) {
        whereConditions.push(`e.event_type = $${paramIndex++}`);
        params.push(event_type);
      }

      if (mode) {
        whereConditions.push(`e.mode = $${paramIndex++}`);
        params.push(mode);
      }

      if (experience_level) {
        whereConditions.push(`e.experience_level = $${paramIndex++}`);
        params.push(experience_level);
      }

      if (search) {
        whereConditions.push(`(e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM events e
        WHERE ${whereClause}
      `;

      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Main query
      const eventsQuery = `
        SELECT 
          e.*,
          u.email as organizer_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), e.organizer_name, u.email) as organizer_display_name,
          ap.profile_picture_url as organizer_avatar,
          COUNT(er.id) as registered_count
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        LEFT JOIN event_registrations er ON e.id = er.event_id AND er.registration_status = 'approved'
        WHERE ${whereClause}
        GROUP BY e.id, u.email, ap.first_name, ap.last_name, ap.profile_picture_url
        ORDER BY e.${sortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);
      const result = await client.query(eventsQuery, params);

      const events = result.rows.map(row => this.convertFromDbFormat(row));

      return {
        events,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };
    });
  }

  /**
   * Get all past events (end_datetime < now)
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async getAllPast(options = {}) {
    const {
      event_type,
      mode,
      search,
      limit = 20,
      offset = 0,
      sortBy = 'start_datetime',
      sortOrder = 'DESC'
    } = options;

    return await executeTransaction(async (client) => {
      let whereConditions = ['e.is_published = true', 'e.end_datetime < NOW()'];
      let params = [];
      let paramIndex = 1;

      // Add filters
      if (event_type) {
        whereConditions.push(`e.event_type = $${paramIndex++}`);
        params.push(event_type);
      }

      if (mode) {
        whereConditions.push(`e.mode = $${paramIndex++}`);
        params.push(mode);
      }

      if (search) {
        whereConditions.push(`(e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM events e
        WHERE ${whereClause}
      `;

      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Main query
      const eventsQuery = `
        SELECT 
          e.*,
          u.email as organizer_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), e.organizer_name, u.email) as organizer_display_name,
          ap.profile_picture_url as organizer_avatar,
          COUNT(er.id) as registered_count,
          AVG(er.feedback_rating) as average_rating
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        LEFT JOIN event_registrations er ON e.id = er.event_id AND er.registration_status = 'approved'
        WHERE ${whereClause}
        GROUP BY e.id, u.email, ap.first_name, ap.last_name, ap.profile_picture_url
        ORDER BY e.${sortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);
      const result = await client.query(eventsQuery, params);

      const events = result.rows.map(row => this.convertFromDbFormat(row));

      return {
        events,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };
    });
  }

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>}
   */
  static async createEvent(eventData) {
    const dbData = this.convertToDbFormat(eventData);
    
    return await executeTransaction(async (client) => {
      const query = `
        INSERT INTO events (
          title, description, event_type, mode, location, start_datetime, end_datetime,
          registration_deadline, max_participants, required_skills, experience_level,
          agenda, requirements, benefits, contact_email, contact_phone,
          organizer_id, organizer_name, status, is_published, requires_approval
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `;

      const values = [
        dbData.title, dbData.description, dbData.event_type, dbData.mode, dbData.location,
        dbData.start_datetime, dbData.end_datetime, dbData.registration_deadline,
        dbData.max_participants, dbData.required_skills, dbData.experience_level,
        dbData.agenda, dbData.requirements, dbData.benefits, dbData.contact_email,
        dbData.contact_phone, dbData.organizer_id, dbData.organizer_name,
        dbData.status, dbData.is_published, dbData.requires_approval
      ];

      const result = await client.query(query, values);
      return this.convertFromDbFormat(result.rows[0]);
    });
  }

  /**
   * Update an event
   * @param {string} id - Event ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>}
   */
  static async updateEvent(id, updateData) {
    const dbData = this.convertToDbFormat(updateData);
    
    return await executeTransaction(async (client) => {
      const fields = Object.keys(dbData);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      const query = `
        UPDATE events 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *
      `;

      const values = [id, ...Object.values(dbData)];
      const result = await client.query(query, values);
      
      return result.rows.length > 0 ? this.convertFromDbFormat(result.rows[0]) : null;
    });
  }

  /**
   * Get event proposals (for admin)
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async getProposals(options = {}) {
    const {
      status = 'pending',
      limit = 20,
      offset = 0
    } = options;

    return await executeTransaction(async (client) => {
      const query = `
        SELECT 
          e.*,
          u.email as organizer_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as organizer_display_name,
          ap.profile_picture_url as organizer_avatar
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE e.status = $1
        ORDER BY e.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [status, limit, offset]);
      const events = result.rows.map(row => this.convertFromDbFormat(row));

      // Get count
      const countQuery = `SELECT COUNT(*) as total FROM events WHERE status = $1`;
      const countResult = await client.query(countQuery, [status]);
      const total = parseInt(countResult.rows[0].total);

      return {
        events,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };
    });
  }

  /**
   * Approve or reject event proposal
   * @param {string} id - Event ID
   * @param {string} action - 'approve' or 'reject'
   * @returns {Promise<Object|null>}
   */
  static async updateProposalStatus(id, action) {
    const status = action === 'approve' ? 'upcoming' : 'rejected';
    const isPublished = action === 'approve';

    return await executeTransaction(async (client) => {
      const query = `
        UPDATE events 
        SET status = $1, is_published = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = 'pending'
        RETURNING *
      `;

      const result = await client.query(query, [status, isPublished, id]);
      return result.rows.length > 0 ? this.convertFromDbFormat(result.rows[0]) : null;
    });
  }

  /**
   * Register user for an event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} alumniId - Alumni profile ID
   * @param {Object} registrationData - Registration details
   * @returns {Promise<Object>}
   */
  static async registerForEvent(eventId, userId, alumniId, registrationData = {}) {
    return await executeTransaction(async (client) => {
      // Check if already registered
      const existingQuery = `
        SELECT id FROM event_registrations 
        WHERE event_id = $1 AND user_id = $2
      `;
      const existing = await client.query(existingQuery, [eventId, userId]);
      
      if (existing.rows.length > 0) {
        throw new Error('User is already registered for this event');
      }

      // Check event capacity
      const capacityQuery = `
        SELECT 
          max_participants,
          current_participants,
          requires_approval
        FROM events 
        WHERE id = $1
      `;
      const capacityResult = await client.query(capacityQuery, [eventId]);
      const event = capacityResult.rows[0];

      if (!event) {
        throw new Error('Event not found');
      }

      let registrationStatus = 'pending';
      if (!event.requires_approval) {
        if (event.max_participants && event.current_participants >= event.max_participants) {
          registrationStatus = 'waitlist';
        } else {
          registrationStatus = 'approved';
        }
      }

      // Insert registration
      const insertQuery = `
        INSERT INTO event_registrations (
          event_id, user_id, alumni_id, registration_status, motivation, relevant_experience
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        eventId, userId, alumniId, registrationStatus,
        registrationData.motivation || null,
        registrationData.relevant_experience || null
      ];

      const result = await client.query(insertQuery, values);

      // Update current participants count if approved
      if (registrationStatus === 'approved') {
        await client.query(
          'UPDATE events SET current_participants = current_participants + 1 WHERE id = $1',
          [eventId]
        );
      }

      return {
        registration: result.rows[0],
        status: registrationStatus
      };
    });
  }

  /**
   * Get event registrations (for organizers/admin)
   * @param {string} eventId - Event ID
   * @returns {Promise<Array>}
   */
  static async getEventRegistrations(eventId) {
    return await executeTransaction(async (client) => {
      const query = `
        SELECT 
          er.*,
          u.email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as participant_name,
          ap.current_company,
          ap.current_position
        FROM event_registrations er
        JOIN users u ON er.user_id = u.id
        LEFT JOIN alumni_profiles ap ON er.alumni_id = ap.id
        WHERE er.event_id = $1
        ORDER BY er.registered_at DESC
      `;

      const result = await client.query(query, [eventId]);
      return result.rows;
    });
  }

  /**
   * Convert database format to API format
   * @param {Object} dbData - Raw database row
   * @returns {Object}
   */
  static convertFromDbFormat(dbData) {
    return {
      id: dbData.id,
      title: dbData.title,
      description: dbData.description,
      eventType: dbData.event_type,
      mode: dbData.mode,
      location: dbData.location,
      startDateTime: dbData.start_datetime,
      endDateTime: dbData.end_datetime,
      registrationDeadline: dbData.registration_deadline,
      maxParticipants: dbData.max_participants,
      currentParticipants: dbData.current_participants || 0,
      registeredCount: parseInt(dbData.registered_count) || 0,
      requiredSkills: dbData.required_skills || [],
      experienceLevel: dbData.experience_level,
      agenda: dbData.agenda,
      requirements: dbData.requirements,
      benefits: dbData.benefits,
      contactEmail: dbData.contact_email,
      contactPhone: dbData.contact_phone,
      organizerId: dbData.organizer_id,
      organizerName: dbData.organizer_name,
      organizerDisplayName: dbData.organizer_display_name,
      organizerEmail: dbData.organizer_email,
      organizerAvatar: dbData.organizer_avatar,
      status: dbData.status,
      isPublished: dbData.is_published,
      requiresApproval: dbData.requires_approval,
      averageRating: dbData.average_rating ? parseFloat(dbData.average_rating) : null,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  /**
   * Convert API format to database format
   * @param {Object} apiData - API format data
   * @returns {Object}
   */
  static convertToDbFormat(apiData) {
    const dbData = {};
    
    if (apiData.title) dbData.title = apiData.title;
    if (apiData.description) dbData.description = apiData.description;
    if (apiData.eventType) dbData.event_type = apiData.eventType;
    if (apiData.mode) dbData.mode = apiData.mode;
    if (apiData.location) dbData.location = apiData.location;
    if (apiData.startDateTime) dbData.start_datetime = apiData.startDateTime;
    if (apiData.endDateTime) dbData.end_datetime = apiData.endDateTime;
    if (apiData.registrationDeadline) dbData.registration_deadline = apiData.registrationDeadline;
    if (apiData.maxParticipants) dbData.max_participants = apiData.maxParticipants;
    if (apiData.requiredSkills) dbData.required_skills = apiData.requiredSkills;
    if (apiData.experienceLevel) dbData.experience_level = apiData.experienceLevel;
    if (apiData.agenda) dbData.agenda = apiData.agenda;
    if (apiData.requirements) dbData.requirements = apiData.requirements;
    if (apiData.benefits) dbData.benefits = apiData.benefits;
    if (apiData.contactEmail) dbData.contact_email = apiData.contactEmail;
    if (apiData.contactPhone) dbData.contact_phone = apiData.contactPhone;
    if (apiData.organizerId) dbData.organizer_id = apiData.organizerId;
    if (apiData.organizerName) dbData.organizer_name = apiData.organizerName;
    if (apiData.status) dbData.status = apiData.status;
    if (apiData.isPublished !== undefined) dbData.is_published = apiData.isPublished;
    if (apiData.requiresApproval !== undefined) dbData.requires_approval = apiData.requiresApproval;

    return dbData;
  }
}

module.exports = Event;
