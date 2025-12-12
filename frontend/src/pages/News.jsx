import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styles from './News.module.css';

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NewsCard = ({ article, index = 0 }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'achievement': '#10b981',
      'announcement': '#3b82f6',
      'alumni-spotlight': '#f59e0b',
      'research': '#8b5cf6',
      'event': '#ef4444'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <article className={styles.newsCard} style={{ animationDelay: `${index * 60}ms` }}>
      {article.featuredImageUrl && (
        <div className={styles.imageContainer}>
          <img 
            src={article.featuredImageUrl} 
            alt={article.title}
            className={styles.featuredImage}
          />
          {article.isFeatured && (
            <span className={styles.featuredBadge}>Featured</span>
          )}
        </div>
      )}
      
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <span 
            className={styles.categoryTag}
            style={{ backgroundColor: getCategoryColor(article.category) }}
          >
            {article.category.replace('-', ' ').toUpperCase()}
          </span>
          <time className={styles.publishDate}>
            {formatDate(article.publishedAt)}
          </time>
        </div>
        
        <h3 className={styles.articleTitle}>
          <Link to={`/news/${article.slug || article.id}`} className={styles.titleLink}>
            {article.title}
          </Link>
        </h3>
        
        <p className={styles.excerpt}>{article.excerpt}</p>
        
        {article.tags && article.tags.length > 0 && (
          <div className={styles.tags}>
            {article.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className={styles.tag}>
                #{tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className={styles.moreTagsIndicator}>
                +{article.tags.length - 3} more
              </span>
            )}
          </div>
        )}
        
        <div className={styles.cardFooter}>
          <span className={styles.authorInfo}>
            By {article.authorName || 'Unknown Author'}
          </span>
          <Link to={`/news/${article.slug || article.id}`} className={styles.readMoreBtn}>
            Read More →
          </Link>
        </div>
      </div>
    </article>
  );
};

const News = () => {
  const [articles, setArticles] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    featured: false
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchFeaturedArticles();
    fetchArticles();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [filters, pagination.page]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/news/categories`);
      if (response.ok) {
        const data = await response.json();
        // Extract just the category names from the response
        const categoryNames = data.data?.map(item => item.category) || [];
        setCategories(categoryNames);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchFeaturedArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/news/featured?limit=3`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedArticles(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching featured articles:', err);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.category && { category: filters.category }),
        ...(filters.search && { search: filters.search }),
        ...(filters.featured && { featured: 'true' })
      });

      const response = await fetch(`${API_URL}/news?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0
        }));
      } else {
        setError('Failed to fetch news articles');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const SkeletonCard = () => (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonLine} style={{ width: '60%' }}></div>
        <div className={styles.skeletonLine} style={{ width: '85%' }}></div>
        <div className={styles.skeletonLine} style={{ width: '75%' }}></div>
        <div className={styles.skeletonTags}></div>
      </div>
    </div>
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      search: '',
      featured: false
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (error) {
    return (
      <>
        <Helmet>
          <title>News & Achievements - IIIT Naya Raipur Alumni Portal</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>Error Loading News</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>News & Achievements - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div className={styles.container}>
        {/* Hero Section with Featured Articles */}
        {featuredArticles.length > 0 && (
          <section className={styles.heroSection}>
            <h1 className={styles.pageTitle}>Latest News</h1>
            <p className={styles.pageSubtitle}>
              Stay updated with the latest happenings at IIIT Naya Raipur
            </p>
            
            <div className={styles.featuredGrid}>
              {featuredArticles.map((article, index) => (
                <div 
                  key={article.id} 
                  className={`${styles.featuredCard} ${index === 0 ? styles.mainFeatured : ''}`}
                >
                  <div className={styles.featuredImageContainer}>
                    <img 
                      src={article.featuredImageUrl} 
                      alt={article.title}
                      className={styles.featuredImage}
                    />
                    <div className={styles.featuredOverlay}>
                      <span className={styles.featuredLabel}>Featured</span>
                      <h2 className={styles.featuredTitle}>
                        <Link to={`/news/${article.slug || article.id}`} className={styles.featuredTitleLink}>
                          {article.title}
                        </Link>
                      </h2>
                      <p className={styles.featuredExcerpt}>{article.excerpt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filters Section */}
        <section className={styles.filtersSection}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search news articles..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterControls}>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className={styles.categorySelect}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
              
              <label className={styles.featuredFilter}>
                <input
                  type="checkbox"
                  checked={filters.featured}
                  onChange={(e) => handleFilterChange('featured', e.target.checked)}
                />
                Featured Only
              </label>
              
              {(filters.category || filters.search || filters.featured) && (
                <button onClick={clearFilters} className={styles.clearFiltersBtn}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className={styles.articlesSection}>
          {loading ? (
            <>
              <div className={styles.articlesGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </>
          ) : articles.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Articles Found</h3>
              <p>Try adjusting your filters or check back later for new content.</p>
            </div>
          ) : (
            <>
              <div className={styles.articlesGrid}>
                {articles.map((article, idx) => (
                  <NewsCard key={article.id} article={article} index={idx} />
                ))}
              </div>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={styles.paginationBtn}
                  >
                    Previous
                  </button>
                  
                  <div className={styles.pageNumbers}>
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`${styles.pageNumber} ${
                            pageNum === pagination.page ? styles.activePage : ''
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className={styles.paginationBtn}
                  >
                    Next
                  </button>
                </div>
              )}
              
              <div className={styles.resultsInfo}>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} articles
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
};

export default News;
