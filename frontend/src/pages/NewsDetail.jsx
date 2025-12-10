import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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

  return (
    <div className='w-100'>
      <Helmet>
        <title>{`${safeTitle} - IIIT Naya Raipur Alumni Portal`}</title>
        <meta name="description" content={safeDescription} />
      </Helmet>
      
      <article className={styles.container}>
        {/* Navigation */}
        <nav className={styles.breadcrumb}>
          <Link to="/news" className={styles.breadcrumbLink}>News</Link>
          <span className={styles.breadcrumbSeparator}>→</span>
          <span className={styles.breadcrumbCurrent}>{safeTitle}</span>
        </nav>

        {/* Article Header */}
        <header className={styles.articleHeader}>
          <div className={styles.metadata}>
            {article.category && (
              <span 
                className={styles.categoryTag}
                style={{ backgroundColor: getCategoryColor(article.category) }}
              >
                {String(article.category).replace('-', ' ').toUpperCase()}
              </span>
            )}
            {article.isFeatured && (
              <span className={styles.featuredBadge}>Featured</span>
            )}
          </div>
          
          <h1 className={styles.articleTitle}>{safeTitle}</h1>
          
          <div className={styles.articleMeta}>
            <div className={styles.authorSection}>
              <span className={styles.authorName}>
                By {article.authorName || 'Unknown Author'}
              </span>
              {article.publishedAt && (
                <time className={styles.publishDate}>
                  Published on {formatDate(article.publishedAt)}
                </time>
              )}
              {article.updatedAt && article.updatedAt !== article.createdAt && (
                <time className={styles.updateDate}>
                  Updated on {formatDate(article.updatedAt)}
                </time>
              )}
            </div>
          </div>

          {article.excerpt && (
            <p className={styles.excerpt}>{article.excerpt}</p>
          )}
        </header>

        {/* Hero Section */}
        {article.featuredImageUrl && (
          <section className={styles.heroSection} ref={heroRef}>
            <div className={styles.heroMediaWrap}>
              <img
                src={article.featuredImageUrl}
                alt={safeTitle}
                className={styles.heroImage}
                style={{ transform: `translateY(${parallax}px) scale(1.02)` }}
              />
              <div className={styles.heroOverlay}></div>
              <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>{safeTitle}</h1>
                {article.excerpt && <p className={styles.heroSubtitle}>{article.excerpt}</p>}
                <div className={styles.heroMetaRow}>
                  <span className={styles.heroAuthor}>By {article.authorName || 'Unknown'}</span>
                  {article.publishedAt && (
                    <span className={styles.heroDate}>{formatDate(article.publishedAt)}</span>
                  )}
                  {readTime && <span className={styles.heroReadTime}>{readTime} min read</span>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Two-column Premium Layout */}
        <section className={styles.premiumSection}>
          <div className={styles.premiumGrid}>
            {/* Left Column: Publisher + Article */}
            <div className={styles.leftCol}>
              <div className={styles.publisherCard}>
                <div className={styles.publisherAvatar} aria-hidden="true" />
                <div className={styles.publisherInfo}>
                  <h3 className={styles.publisherName}>{article.authorName || 'Unknown Author'}</h3>
                  <p className={styles.publisherRole}>Alumni Contributor</p>
                  <p className={styles.publisherBio}>Building a connected alumni community through stories and events.</p>
                  <div className={styles.publisherMetaRow}>
                    {article.publishedAt && (
                      <span className={styles.publisherDate}>Published {formatDate(article.publishedAt)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.articleMain}>
                <h1 className={styles.articleHeroTitle}>{safeTitle}</h1>
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={formatContent(article.content)}
                />
                {article.excerpt && (
                  <blockquote className={styles.pullQuote}>{article.excerpt}</blockquote>
                )}
              </div>
            </div>

            {/* Column Divider */}
            <div className={styles.columnDivider} aria-hidden="true" />

            {/* Right Column: Sticky Visual Feed */}
            <aside className={styles.rightCol}>
              {/* Carousel */}
              {article.featuredImageUrl && (
                <div className={styles.carousel}>
                  <div className={styles.carouselViewport}>
                    <img src={article.featuredImageUrl} alt={safeTitle} className={styles.carouselImage} />
                  </div>
                  <div className={styles.carouselDots}>
                    <span className={styles.dotActive} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                </div>
              )}

              {/* Thumbnails Grid */}
              <div className={styles.thumbGrid}>
                {[article.featuredImageUrl, article.featuredImageUrl, article.featuredImageUrl].filter(Boolean).map((src, i) => (
                  <div key={i} className={styles.thumbWrap}>
                    <img src={src} alt={`visual-${i+1}`} className={styles.thumb} />
                  </div>
                ))}
              </div>

            </aside>
          </div>
        </section>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className={styles.tagsSection}>
            <h3 className={styles.tagsTitle}>Tags</h3>
            <div className={styles.tags}>
              {article.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* Back to News */}
        <div className={styles.navigationFooter}>
          <Link to="/news" className={styles.backToNewsBtn}>
            ← Back to All News
          </Link>
        </div>
      </article>
    </div>
  );
};

export default NewsDetail;
