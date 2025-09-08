import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styles from './NewsDetail.module.css';

const NewsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/news/${id}`);
      if (response.ok) {
        const data = await response.json();
        setArticle(data.article);
        setRelatedArticles(data.relatedArticles || []);
      } else if (response.status === 404) {
        setError('Article not found');
      } else {
        setError('Failed to fetch article');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const formatContent = (content) => {
    return { __html: content };
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading Article - IIIT Naya Raipur Alumni Portal</title>
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
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - IIIT Naya Raipur Alumni Portal</title>
        <meta name="description" content={article.excerpt} />
      </Helmet>
      
      <article className={styles.container}>
        {/* Navigation */}
        <nav className={styles.breadcrumb}>
          <Link to="/news" className={styles.breadcrumbLink}>News</Link>
          <span className={styles.breadcrumbSeparator}>→</span>
          <span className={styles.breadcrumbCurrent}>{article.title}</span>
        </nav>

        {/* Article Header */}
        <header className={styles.articleHeader}>
          <div className={styles.metadata}>
            <span 
              className={styles.categoryTag}
              style={{ backgroundColor: getCategoryColor(article.category) }}
            >
              {article.category.replace('-', ' ').toUpperCase()}
            </span>
            {article.isFeatured && (
              <span className={styles.featuredBadge}>Featured</span>
            )}
          </div>
          
          <h1 className={styles.articleTitle}>{article.title}</h1>
          
          <div className={styles.articleMeta}>
            <div className={styles.authorSection}>
              <span className={styles.authorName}>
                By {article.authorName || 'Unknown Author'}
              </span>
              <time className={styles.publishDate}>
                Published on {formatDate(article.publishedAt)}
              </time>
              {article.updatedAt !== article.createdAt && (
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

        {/* Featured Image */}
        {article.featuredImageUrl && (
          <div className={styles.featuredImageContainer}>
            <img 
              src={article.featuredImageUrl} 
              alt={article.title}
              className={styles.featuredImage}
            />
          </div>
        )}

        {/* Article Content */}
        <div className={styles.articleContent}>
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={formatContent(article.content)}
          />
        </div>

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

        {/* Article Footer */}
        <footer className={styles.articleFooter}>
          <div className={styles.shareSection}>
            <h3 className={styles.shareTitle}>Share this article</h3>
            <div className={styles.shareButtons}>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: article.title,
                      text: article.excerpt,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
                className={styles.shareBtn}
              >
                Share
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
                className={styles.copyBtn}
              >
                Copy Link
              </button>
            </div>
          </div>
        </footer>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>Related Articles</h2>
            <div className={styles.relatedGrid}>
              {relatedArticles.map(relatedArticle => (
                <article key={relatedArticle.id} className={styles.relatedCard}>
                  {relatedArticle.featuredImageUrl && (
                    <div className={styles.relatedImageContainer}>
                      <img 
                        src={relatedArticle.featuredImageUrl} 
                        alt={relatedArticle.title}
                        className={styles.relatedImage}
                      />
                    </div>
                  )}
                  <div className={styles.relatedContent}>
                    <span 
                      className={styles.relatedCategory}
                      style={{ backgroundColor: getCategoryColor(relatedArticle.category) }}
                    >
                      {relatedArticle.category.replace('-', ' ').toUpperCase()}
                    </span>
                    <h3 className={styles.relatedTitle}>
                      <Link 
                        to={`/news/${relatedArticle.id}`} 
                        className={styles.relatedLink}
                      >
                        {relatedArticle.title}
                      </Link>
                    </h3>
                    <p className={styles.relatedExcerpt}>{relatedArticle.excerpt}</p>
                    <time className={styles.relatedDate}>
                      {formatDate(relatedArticle.publishedAt)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Back to News */}
        <div className={styles.navigationFooter}>
          <Link to="/news" className={styles.backToNewsBtn}>
            ← Back to All News
          </Link>
        </div>
      </article>
    </>
  );
};

export default NewsDetail;
