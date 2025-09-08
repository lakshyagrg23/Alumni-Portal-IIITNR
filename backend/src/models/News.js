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
 * News Model - SQL-based operations for news table
 */
class News {
  /**
   * Find news article by ID
   * @param {string} id - News UUID
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return await executeTransaction(async (client) => {
      const newsQuery = `
        SELECT 
          n.*,
          u.email as author_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as author_name,
          ap.profile_picture_url as author_avatar
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE n.id = $1 AND n.is_published = true
      `;
      
      const result = await client.query(newsQuery, [id]);
      return result.rows.length > 0 ? this.convertFromDbFormat(result.rows[0]) : null;
    });
  }

  /**
   * Find all published news with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async findAll(options = {}) {
    const {
      category,
      featured,
      author_id,
      search,
      page = 1,
      limit = 10,
      sortBy = 'published_at',
      sortOrder = 'DESC'
    } = options;

    return await executeTransaction(async (client) => {
      let baseQuery = `
        SELECT 
          n.*,
          u.email as author_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as author_name,
          ap.profile_picture_url as author_avatar
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE n.is_published = true
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM news n
        WHERE n.is_published = true
      `;

      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      let whereClause = '';

      if (category) {
        whereClause += ` AND n.category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }

      if (featured === 'true') {
        whereClause += ` AND n.is_featured = true`;
      }

      if (author_id) {
        whereClause += ` AND n.author_id = $${paramIndex}`;
        queryParams.push(author_id);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (
          LOWER(n.title) LIKE LOWER($${paramIndex}) OR 
          LOWER(n.content) LIKE LOWER($${paramIndex}) OR
          LOWER(n.excerpt) LIKE LOWER($${paramIndex})
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Apply filters to both queries
      baseQuery += whereClause;
      countQuery += whereClause;

      // Add ordering and pagination
      const validSortFields = ['published_at', 'created_at', 'title', 'category'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'published_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      baseQuery += ` ORDER BY n.${sortField} ${order}`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), offset);

      // Execute queries
      const [newsResult, countResult] = await Promise.all([
        client.query(baseQuery, queryParams),
        client.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
      ]);

      const news = newsResult.rows.map(row => this.convertFromDbFormat(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        news,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: news.length,
          totalRecords: total
        }
      };
    });
  }

  /**
   * Get featured news articles
   * @param {number} limit - Number of featured articles to return
   * @returns {Promise<Array>}
   */
  static async getFeatured(limit = 3) {
    return await executeTransaction(async (client) => {
      const featuredQuery = `
        SELECT 
          n.*,
          u.email as author_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as author_name,
          ap.profile_picture_url as author_avatar
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE n.is_published = true AND n.is_featured = true
        ORDER BY n.published_at DESC
        LIMIT $1
      `;

      const result = await client.query(featuredQuery, [limit]);
      return result.rows.map(row => this.convertFromDbFormat(row));
    });
  }

  /**
   * Get latest news articles
   * @param {number} limit - Number of articles to return
   * @returns {Promise<Array>}
   */
  static async getLatest(limit = 5) {
    return await executeTransaction(async (client) => {
      const latestQuery = `
        SELECT 
          n.*,
          u.email as author_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as author_name,
          ap.profile_picture_url as author_avatar
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE n.is_published = true
        ORDER BY n.published_at DESC
        LIMIT $1
      `;

      const result = await client.query(latestQuery, [limit]);
      return result.rows.map(row => this.convertFromDbFormat(row));
    });
  }

  /**
   * Get related articles by category (excluding current article)
   * @param {string} articleId - Current article ID to exclude
   * @param {string} category - Category to match
   * @param {number} limit - Number of related articles
   * @returns {Promise<Array>}
   */
  static async getRelated(articleId, category, limit = 3) {
    return await executeTransaction(async (client) => {
      const relatedQuery = `
        SELECT 
          n.*,
          u.email as author_email,
          COALESCE(CONCAT(ap.first_name, ' ', ap.last_name), u.email) as author_name,
          ap.profile_picture_url as author_avatar
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE n.is_published = true 
          AND n.category = $1 
          AND n.id != $2
        ORDER BY n.published_at DESC
        LIMIT $3
      `;

      const result = await client.query(relatedQuery, [category, articleId, limit]);
      return result.rows.map(row => this.convertFromDbFormat(row));
    });
  }

  /**
   * Get unique categories with article counts
   * @returns {Promise<Array>}
   */
  static async getCategories() {
    return await executeTransaction(async (client) => {
      const categoriesQuery = `
        SELECT 
          category,
          COUNT(*) as article_count
        FROM news 
        WHERE is_published = true
        GROUP BY category
        ORDER BY article_count DESC, category ASC
      `;

      const result = await client.query(categoriesQuery);
      return result.rows;
    });
  }

  /**
   * Create a new news article
   * @param {Object} newsData - News article data
   * @returns {Promise<Object>}
   */
  static async create(newsData) {
    const {
      title,
      content,
      excerpt,
      featuredImageUrl,
      authorId,
      category = 'general',
      tags = [],
      isFeatured = false,
      isPublished = false,
      publishedAt = null
    } = newsData;

    const insertData = {
      title,
      content,
      excerpt,
      featured_image_url: featuredImageUrl,
      author_id: authorId,
      category,
      tags,
      is_featured: isFeatured,
      is_published: isPublished,
      published_at: publishedAt || (isPublished ? new Date() : null),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await insertOne('news', insertData);
    return this.convertFromDbFormat(result);
  }

  /**
   * Update news article
   * @param {string} id - News article ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>}
   */
  static async update(id, updateData) {
    const {
      title,
      content,
      excerpt,
      featuredImageUrl,
      category,
      tags,
      isFeatured,
      isPublished,
      publishedAt
    } = updateData;

    const dbUpdateData = {
      updated_at: new Date()
    };

    // Only update provided fields
    if (title !== undefined) dbUpdateData.title = title;
    if (content !== undefined) dbUpdateData.content = content;
    if (excerpt !== undefined) dbUpdateData.excerpt = excerpt;
    if (featuredImageUrl !== undefined) dbUpdateData.featured_image_url = featuredImageUrl;
    if (category !== undefined) dbUpdateData.category = category;
    if (tags !== undefined) dbUpdateData.tags = tags;
    if (isFeatured !== undefined) dbUpdateData.is_featured = isFeatured;
    if (isPublished !== undefined) {
      dbUpdateData.is_published = isPublished;
      // Set published_at when publishing for the first time
      if (isPublished && publishedAt === undefined) {
        dbUpdateData.published_at = new Date();
      }
    }
    if (publishedAt !== undefined) dbUpdateData.published_at = publishedAt;

    const results = await updateMany('news', { id }, dbUpdateData);
    return results.length > 0 ? this.convertFromDbFormat(results[0]) : null;
  }

  /**
   * Delete news article (soft delete by unpublishing)
   * @param {string} id - News article ID
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const results = await updateMany('news', { id }, { 
      is_published: false,
      updated_at: new Date()
    });
    return results.length > 0;
  }

  /**
   * Get news statistics
   * @returns {Promise<Object>}
   */
  static async getStats() {
    return await executeTransaction(async (client) => {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_articles,
          COUNT(CASE WHEN is_published = true THEN 1 END) as published_articles,
          COUNT(CASE WHEN is_featured = true AND is_published = true THEN 1 END) as featured_articles,
          COUNT(DISTINCT category) as categories_count,
          COUNT(DISTINCT author_id) as authors_count
        FROM news
      `;

      const result = await client.query(statsQuery);
      return result.rows[0];
    });
  }

  /**
   * Convert database format to API format
   * @param {Object} data - Database row data
   * @returns {Object}
   */
  static convertFromDbFormat(data) {
    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      featuredImageUrl: data.featured_image_url,
      authorId: data.author_id,
      authorName: data.author_name,
      authorEmail: data.author_email,
      authorAvatar: data.author_avatar,
      category: data.category,
      tags: data.tags || [],
      isFeatured: data.is_featured,
      isPublished: data.is_published,
      publishedAt: data.published_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Convert API format to database format
   * @param {Object} data - API data
   * @returns {Object}
   */
  static convertToDbFormat(data) {
    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      featured_image_url: data.featuredImageUrl,
      author_id: data.authorId,
      category: data.category,
      tags: data.tags,
      is_featured: data.isFeatured,
      is_published: data.isPublished,
      published_at: data.publishedAt,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    };
  }
}

module.exports = News;
