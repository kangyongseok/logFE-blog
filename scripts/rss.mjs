import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import path from 'path'
import { createRequire } from 'module'
import GithubSlugger from 'github-slugger'
import { escape } from 'pliny/utils/htmlEscaper.js'

// CommonJS 모듈을 ESM에서 import하기 위해 createRequire 사용
const require = createRequire(import.meta.url)
const siteMetadata = require('../data/siteMetadata.js')

// JSON 파일을 fs.readFileSync로 읽기
const tagData = JSON.parse(readFileSync(new URL('../app/tag-data.json', import.meta.url), 'utf-8'))

const generateRssItem = (config, post) => `
  <item>
    <guid>${config.siteUrl}/blog/${post.slug}</guid>
    <title>${escape(post.title)}</title>
    <link>${config.siteUrl}/blog/${post.slug}</link>
    ${post.summary && `<description>${escape(post.summary)}</description>`}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${post.tags && post.tags.map((t) => `<category>${t}</category>`).join('')}
  </item>
`

const generateRss = (config, posts, page = 'feed.xml') => `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(config.title)}</title>
      <link>${config.siteUrl}/blog</link>
      <description>${escape(config.description)}</description>
      <language>${config.language}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map((post) => generateRssItem(config, post)).join('')}
    </channel>
  </rss>
`

async function generateRSS(config, allBlogs, page = 'feed.xml') {
  const publishPosts = allBlogs.filter((post) => post.draft !== true)
  // RSS for blog post
  if (publishPosts.length > 0) {
    const rss = generateRss(config, publishPosts)
    writeFileSync(`./public/${page}`, rss)
  }

  if (publishPosts.length > 0) {
    for (const tag of Object.keys(tagData)) {
      const filteredPosts = allBlogs.filter((post) =>
        post.tags?.map((t) => GithubSlugger.slug(t)).includes(tag)
      )
      const rss = generateRss(config, filteredPosts, `tags/${tag}/${page}`)
      const rssPath = path.join('public', 'tags', tag)
      mkdirSync(rssPath, { recursive: true })
      writeFileSync(path.join(rssPath, page), rss)
    }
  }
}

// Contentlayer 생성 파일을 로드하는 함수 (top-level await 제거)
async function loadAllBlogs() {
  try {
    // 동적 import 사용
    const contentlayerModule = await import('../.contentlayer/generated/index.mjs')
    return contentlayerModule.allBlogs
  } catch (error) {
    // Fallback: createRequire 사용 (Vercel 환경 대응)
    try {
      const require = createRequire(import.meta.url)
      const contentlayerModule = require('../.contentlayer/generated/index.mjs')
      return contentlayerModule.allBlogs
    } catch (fallbackError) {
      console.error('Failed to load contentlayer generated files:', error)
      console.error('Fallback also failed:', fallbackError)
      throw new Error(
        `Cannot load contentlayer files. Make sure 'next build' completed successfully. Original error: ${error.message}`
      )
    }
  }
}

const rss = async () => {
  const allBlogs = await loadAllBlogs()
  await generateRSS(siteMetadata, allBlogs)
  console.log('RSS feed generated...')
}
export default rss
