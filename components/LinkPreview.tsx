import linkPreviews from 'app/link-previews.json'
import CustomLink from './Link'

type Preview = {
  url: string
  title: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
  failed?: boolean
}

const previews = linkPreviews as Record<string, Preview>

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const LinkPreview = ({ href, children }: { href: string; children?: React.ReactNode }) => {
  const data = previews[href]

  // 데이터 없음 / 수집 실패 → 일반 링크로 폴백
  if (!data || data.failed || !data.title) {
    return <CustomLink href={href}>{children}</CustomLink>
  }

  const site = data.siteName || domainOf(href)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose my-6 flex overflow-hidden rounded-lg border border-gray-200 no-underline transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {data.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.favicon} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
          ) : null}
          <span className="truncate">{site}</span>
        </div>
        <div className="line-clamp-2 font-semibold text-gray-900 dark:text-gray-100">
          {data.title}
        </div>
        {data.description ? (
          <div className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {data.description}
          </div>
        ) : null}
      </div>
      {data.image ? (
        <div className="hidden w-40 shrink-0 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
    </a>
  )
}

export default LinkPreview
