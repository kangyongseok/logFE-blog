import Link from '@/components/Link'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'

interface SeriesPostsProps {
  currentPost: CoreContent<Blog>
  allPosts: CoreContent<Blog>[]
}

const SeriesPosts = ({ currentPost, allPosts }: SeriesPostsProps) => {
  if (!currentPost.series) return null

  // 같은 시리즈의 모든 포스트 찾기
  const seriesPosts = allPosts
    .filter((post) => post.series === currentPost.series && !post.draft)
    .sort((a, b) => {
      // seriesOrder가 있으면 그것으로 정렬, 없으면 날짜로 정렬
      if (a.seriesOrder && b.seriesOrder) {
        return a.seriesOrder - b.seriesOrder
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

  if (seriesPosts.length <= 1) return null

  const currentIndex = seriesPosts.findIndex((post) => post.slug === currentPost.slug)
  const prevInSeries = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null
  const nextInSeries = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null

  return (
    <div className="my-8 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currentPost.series} 시리즈
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {currentIndex + 1} / {seriesPosts.length}
        </p>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">시리즈 목록:</div>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          {seriesPosts.map((post, index) => (
            <li key={post.slug} className="space-y-0.5">
              {post.slug === currentPost.slug ? (
                <div>
                  <span className="font-semibold text-primary-500">{post.title}</span>
                  {post.subtitle && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      - {post.subtitle}
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-gray-600 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    {post.title}
                  </Link>
                  {post.subtitle && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      - {post.subtitle}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
      {(prevInSeries || nextInSeries) && (
        <div className="mt-6 flex justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          {prevInSeries && (
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                이전 글
              </div>
              <Link
                href={`/blog/${prevInSeries.slug}`}
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              >
                ← {prevInSeries.title}
              </Link>
              {prevInSeries.subtitle && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {prevInSeries.subtitle}
                </div>
              )}
            </div>
          )}
          {nextInSeries && (
            <div className="ml-auto text-right">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                다음 글
              </div>
              <Link
                href={`/blog/${nextInSeries.slug}`}
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              >
                {nextInSeries.title} →
              </Link>
              {nextInSeries.subtitle && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {nextInSeries.subtitle}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SeriesPosts
