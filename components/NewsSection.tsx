'use client';

import { useState } from 'react';
import { NewsData, NewsArticle } from '@/lib/types/indicators';

interface NewsSectionProps {
  newsData: NewsData | null;
}

export default function NewsSection({ newsData }: NewsSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpand = (articleId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const formatRelativeTime = (unixTimestamp: number): string => {
    const now = Date.now() / 1000;
    const diffSeconds = now - unixTimestamp;

    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      return `${mins}m ago`;
    } else if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!newsData || newsData.articles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📰</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Market News
          </h2>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-400">
          Last updated: {formatTime(newsData.lastUpdated)}
        </p>
      </div>

      {/* 뉴스 리스트 */}
      <div className="space-y-0">
        {newsData.articles.map(article => (
          <NewsItem
            key={article.id}
            article={article}
            isExpanded={expandedItems.has(article.id)}
            onToggle={() => toggleExpand(article.id)}
            formatRelativeTime={formatRelativeTime}
          />
        ))}
      </div>
    </div>
  );
}

interface NewsItemProps {
  article: NewsArticle;
  isExpanded: boolean;
  onToggle: () => void;
  formatRelativeTime: (timestamp: number) => string;
}

function NewsItem({ article, isExpanded, onToggle, formatRelativeTime }: NewsItemProps) {
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      {/* 클릭 가능한 헤더 */}
      <button
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`news-summary-${article.id}`}
        className="w-full py-4 px-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors rounded"
      >
        <div className="flex items-start justify-between gap-3">
          {/* 왼쪽: 헤드라인 + 메타데이터 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1.5 line-clamp-2">
              {article.headline}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              {article.source && <span>{article.source}</span>}
              {article.source && article.datetime && <span>•</span>}
              {article.datetime && (
                <time dateTime={new Date(article.datetime * 1000).toISOString()}>
                  {formatRelativeTime(article.datetime)}
                </time>
              )}
            </div>
          </div>

          {/* 오른쪽: 펼침 아이콘 */}
          <div className="flex-shrink-0 text-zinc-400 dark:text-zinc-500 text-sm">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </button>

      {/* 접을 수 있는 요약 */}
      <div
        id={`news-summary-${article.id}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 space-y-3">
          {article.summary && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-6">
              {article.summary}
            </p>
          )}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Read full article
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
