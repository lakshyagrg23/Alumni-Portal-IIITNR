const express = require("express");
const router = express.Router();
const News = require("../models/News");

/**
 * @route   GET /api/news
 * @desc    Get all news articles with filtering and pagination
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const {
      category,
      featured,
      author_id,
      search,
      page = 1,
      limit = 10,
      sortBy = "published_at",
      sortOrder = "DESC",
    } = req.query;

    const options = {
      category,
      featured,
      author_id,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await News.findAll(options);

    res.json({
      success: true,
      data: result.news,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching news",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/news/featured
 * @desc    Get featured news articles
 * @access  Public
 */
router.get("/featured", async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    const featuredNews = await News.getFeatured(parseInt(limit));

    res.json({
      success: true,
      data: featuredNews,
    });
  } catch (error) {
    console.error("Get featured news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching featured news",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/news/latest
 * @desc    Get latest news articles
 * @access  Public
 */
router.get("/latest", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const latestNews = await News.getLatest(parseInt(limit));

    res.json({
      success: true,
      data: latestNews,
    });
  } catch (error) {
    console.error("Get latest news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching latest news",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/news/categories
 * @desc    Get available news categories with counts
 * @access  Public
 */
router.get("/categories", async (req, res) => {
  try {
    const categories = await News.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching categories",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/news/stats
 * @desc    Get news statistics
 * @access  Public
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await News.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get news stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching news statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/news/:id
 * @desc    Get news article by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const newsArticle = await News.findById(id);

    if (!newsArticle) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    // Get related articles
    const relatedArticles = await News.getRelated(id, newsArticle.category, 3);

    res.json({
      success: true,
      data: {
        article: newsArticle,
        related: relatedArticles
      }
    });
  } catch (error) {
    console.error("Get news article error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching news article",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/news
 * @desc    Create news article (Admin only)
 * @access  Private/Admin
 */
router.post("/", async (req, res) => {
  try {
    const newsData = req.body;

    // This will need admin authentication middleware
    // For now, we'll allow creation for testing
    const newArticle = await News.create(newsData);

    res.status(201).json({
      success: true,
      message: "News article created successfully",
      data: newArticle
    });
  } catch (error) {
    console.error("Create news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating news article",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/news/:id
 * @desc    Update news article (Admin only)
 * @access  Private/Admin
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedArticle = await News.update(id, updateData);

    if (!updatedArticle) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    res.json({
      success: true,
      message: "News article updated successfully",
      data: updatedArticle
    });
  } catch (error) {
    console.error("Update news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating news article",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/news/:id
 * @desc    Delete news article (Admin only)
 * @access  Private/Admin
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await News.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    res.json({
      success: true,
      message: "News article deleted successfully",
    });
  } catch (error) {
    console.error("Delete news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting news article",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
