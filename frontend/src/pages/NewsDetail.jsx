import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BiChevronLeft, BiTime, BiCalendar, BiShare, BiLink, BiBookmark, BiTrendingUp } from 'react-icons/bi';
import styles from './NewsDetail.module.css';

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NewsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readTime, setReadTime] = useState(null);
  const [toc, setToc] = useState([]);
  const heroRef = useRef(null);
  const [parallax, setParallax] = useState(0);

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try fetch by id/slug; if 404 and looks like slug, attempt alternate endpoint
      let res = await fetch(`${API_URL}/news/${id}`);
      // Note: Backend currently does not expose /news/slug/:slug.
      // If slug support is added later, we can add an alternate fetch here.

      if (res.ok) {
        const data = await res.json();
        // Backend returns { success, data: { article, related } }
        const payload = data && data.data ? data.data : data;
        const rawArticle = payload && payload.article ? payload.article : payload;
        const normalized = normalizeArticle(rawArticle);
        setArticle(normalized);
        // Estimate read time (~200 words/min)
        const text = (normalized.content || '').replace(/<[^>]+>/g, ' ');
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setReadTime(Math.max(1, Math.round(words / 200)));
        const related = (payload && payload.related) || [];
        setRelatedArticles(Array.isArray(related) ? related.map(normalizeArticle) : []);
      } else if (res.status === 404) {
        setError('Article not found');
      } else {
        const text = await res.text().catch(() => '')
        setError(`Failed to fetch article (${res.status}). ${text}`);
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Build Table of Contents from headings in rendered content
  useEffect(() => {
    const container = document.querySelector(`.${styles.content}`);
    if (!container) return;
    const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
    const items = headings.map((el) => {
      const id = el.id || el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      el.id = id;
      return { id, text: el.textContent || '', level: el.tagName.toLowerCase() };
    });
    setToc(items);
  }, [article]);

  // Parallax for hero image
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setParallax(Math.min(30, y * 0.15));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // Normalize various API field shapes into a consistent article object
  const normalizeArticle = (a = {}) => {
    const title = a.title || a.name || ''
    const excerpt = a.excerpt || a.summary || ''
    const content = a.content || a.body || a.content_html || ''
    const category = a.category || a.type || ''
    const featuredImageUrl = a.featuredImageUrl || a.imageUrl || a.image_url || ''
    const publishedAt = a.publishedAt || a.published_at || a.createdAt || a.created_at || null
    const updatedAt = a.updatedAt || a.updated_at || null
    const authorName = a.authorName || a.author || ''
    const isFeatured = !!(a.isFeatured || a.featured)
    const idVal = a.slug || a.id
    return {
      id: idVal,
      slug: a.slug,
      title,
      excerpt,
      content,
      category,
      featuredImageUrl,
      publishedAt,
      updatedAt,
      authorName,
      isFeatured,
      tags: Array.isArray(a.tags) ? a.tags : [],
    }
  }

  const formatContent = (content) => {
    return { __html: content };
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>{`Loading Article - IIIT Naya Raipur Alumni Portal`}</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading article...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Article Not Found - IIIT Naya Raipur Alumni Portal</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h1>Article Not Found</h1>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={() => navigate('/news')} className={styles.backBtn}>
                ← Back to News
              </button>
              <button onClick={() => window.location.reload()} className={styles.retryBtn}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Helmet>
          <title>News Article - IIIT Naya Raipur Alumni Portal</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <p>No article data available. Please check the link or try again.</p>
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => navigate('/news')} className={styles.backBtn}>← Back to News</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const safeTitle = String(article.title || 'News Article')
  const safeDescription = String(article.excerpt || 'Read the latest news from IIIT Naya Raipur')

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: safeTitle,
          text: safeDescription,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <>
      <Helmet>
        <title>{`${safeTitle} - IIIT Naya Raipur Alumni Portal`}</title>
        <meta name="description" content={safeDescription} />
      </Helmet>
      
      <div className={styles.pageWrapper}>
        {/* Back Navigation Bar */}
        <nav className={styles.topNav}>
          <div className={styles.navContainer}>
            <Link to="/news" className={styles.backButton}>
              <BiChevronLeft size={24} />
              <span>Back to News</span>
            </Link>
            
            <div className={styles.navActions}>
              <button onClick={handleShare} className={styles.iconButton} title="Share">
                <BiShare size={20} />
              </button>
              <button onClick={handleCopyLink} className={styles.iconButton} title="Copy Link">
                <BiLink size={20} />
              </button>
              <button className={styles.iconButton} title="Bookmark">
                <BiBookmark size={20} />
              </button>
            </div>
          </div>
        </nav>

        <article className={styles.container}>
          {/* Hero Image Section */}
          {article.featuredImageUrl && (
            <div className={styles.heroImageWrapper}>
              <img
                src={article.featuredImageUrl}
                alt={safeTitle}
                className={styles.heroImage}
                style={{ transform: `translateY(${Math.min(parallax * 0.5, 15)}px)` }}
              />
              <div className={styles.heroGradient}></div>
            </div>
          )}

          {/* Article Content Container */}
          <div className={styles.contentWrapper}>
            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Article Header */}
              <header className={styles.articleHeader}>
                <div className={styles.headerMeta}>
                  {article.category && (
                    <span 
                      className={styles.categoryBadge}
                      style={{ backgroundColor: getCategoryColor(article.category) }}
                    >
                      {String(article.category).replace('-', ' ').toUpperCase()}
                    </span>
                  )}
                  {article.isFeatured && (
                    <span className={styles.featuredBadge}>
                      <BiTrendingUp size={16} />
                      Featured
                    </span>
                  )}
                </div>
                
                <h1 className={styles.articleTitle}>{safeTitle}</h1>
                
                {article.excerpt && (
                  <p className={styles.articleExcerpt}>{article.excerpt}</p>
                )}
                
                <div className={styles.metaInfo}>
                  {article.publishedAt && (
                    <div className={styles.metaItem}>
                      <BiCalendar size={18} />
                      <time>{formatDate(article.publishedAt)}</time>
                    </div>
                  )}
                  
                  {readTime && (
                    <div className={styles.metaItem}>
                      <BiTime size={18} />
                      <span>{readTime} min read</span>
                    </div>
                  )}
                </div>
              </header>

              {/* Article Body */}
              <div className={styles.articleBody}>
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={formatContent(article.content)}
                />
              </div>

              {/* Tags Section */}
              {article.tags && article.tags.length > 0 && (
                <div className={styles.tagsSection}>
                  <h3 className={styles.tagsTitle}>Related Topics</h3>
                  <div className={styles.tagsList}>
                    {article.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Section */}
              <div className={styles.shareSection}>
                <h3 className={styles.shareTitle}>Share this article</h3>
                <div className={styles.shareButtons}>
                  <button onClick={handleShare} className={styles.shareBtn}>
                    <BiShare size={18} />
                    Share
                  </button>
                  <button onClick={handleCopyLink} className={styles.shareBtn}>
                    <BiLink size={18} />
                    Copy Link
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              {/* Table of Contents */}
              {toc.length > 0 && (
                <div className={styles.tocCard}>
                  <h3 className={styles.sidebarTitle}>Table of Contents</h3>
                  <ul className={styles.tocList}>
                    {toc.map((item, idx) => (
                      <li key={idx} className={styles[`toc-${item.level}`]}>
                        <a href={`#${item.id}`}>{item.text}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Article Info */}
              <div className={styles.infoCard}>
                <h3 className={styles.sidebarTitle}>Article Info</h3>
                <div className={styles.infoList}>
                  {article.publishedAt && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Published</span>
                      <span className={styles.infoValue}>{formatDate(article.publishedAt)}</span>
                    </div>
                  )}
                  {article.updatedAt && article.updatedAt !== article.publishedAt && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Updated</span>
                      <span className={styles.infoValue}>{formatDate(article.updatedAt)}</span>
                    </div>
                  )}
                  {readTime && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Read Time</span>
                      <span className={styles.infoValue}>{readTime} min</span>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {/* Related Articles */}
          {relatedArticles && relatedArticles.length > 0 && (
            <section className={styles.relatedSection}>
              <h2 className={styles.relatedTitle}>Related Articles</h2>
              <div className={styles.relatedGrid}>
                {relatedArticles.slice(0, 3).map((related) => (
                  <Link
                    key={related.id}
                    to={`/news/${related.slug || related.id}`}
                    className={styles.relatedCard}
                  >
                    {related.featuredImageUrl && (
                      <div className={styles.relatedImageContainer}>
                        <img 
                          src={related.featuredImageUrl} 
                          alt={related.title}
                          className={styles.relatedImage}
                        />
                      </div>
                    )}
                    <div className={styles.relatedContent}>
                      {related.category && (
                        <span 
                          className={styles.relatedCategory}
                          style={{ backgroundColor: getCategoryColor(related.category) }}
                        >
                          {String(related.category).replace('-', ' ').toUpperCase()}
                        </span>
                      )}
                      <h3 className={styles.relatedCardTitle}>{related.title}</h3>
                      {related.excerpt && (
                        <p className={styles.relatedExcerpt}>{related.excerpt}</p>
                      )}
                      {related.publishedAt && (
                        <time className={styles.relatedDate}>{formatDate(related.publishedAt)}</time>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </>
  );
};

export default NewsDetail;
