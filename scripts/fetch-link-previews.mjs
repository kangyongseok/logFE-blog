import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import path from 'path'

/**
 * 빌드 타임에 블로그 MDX의 "단독 링크"(문단에 외부 링크 하나만 있는 형태)를 모아
 * Open Graph 메타데이터를 수집하고 app/link-previews.json 에 캐시한다.
 *
 * - 기본: 캐시에 없는 URL만 새로 가져옴(증분)
 * - `--refresh`: 모든 URL을 다시 가져옴
 * - 네트워크 실패/타임아웃이 있어도 절대 throw 하지 않음(빌드 미중단)
 */

const ROOT = process.cwd()
const BLOG_DIR = path.join(ROOT, 'data', 'blog')
const CACHE_PATH = path.join(ROOT, 'app', 'link-previews.json')
const REFRESH = process.argv.includes('--refresh')
const TIMEOUT_MS = 8000
const UA = 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +https://log-fe-blog.vercel.app)'

// 문단 전체가 단독 외부 링크인 경우만: `[텍스트](http...)`
const BARE_LINK_RE = /^\s*\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*$/

function walkMdx(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walkMdx(full))
    else if (name.endsWith('.mdx') || name.endsWith('.md')) out.push(full)
  }
  return out
}

/** 코드펜스(``` ... ```)를 제거해 코드 블록 안 링크는 무시 */
function stripCodeFences(src) {
  return src.replace(/```[\s\S]*?```/g, '')
}

function collectBareLinks() {
  const links = new Map() // url -> 링크 텍스트
  if (!existsSync(BLOG_DIR)) return links
  for (const file of walkMdx(BLOG_DIR)) {
    const body = stripCodeFences(readFileSync(file, 'utf8'))
    for (const line of body.split('\n')) {
      const m = line.match(BARE_LINK_RE)
      if (m) {
        const text = m[1].trim()
        const url = m[2]
        if (!links.has(url)) links.set(url, text)
      }
    }
  }
  return links
}

function decodeEntities(s) {
  if (!s) return s
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** <meta property/name="key" content="..."> 추출 (property/name, content 순서 무관) */
function metaContent(html, key) {
  const k = key.replace(/[:]/g, '\\:')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${k}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return decodeEntities(m[1])
  }
  return undefined
}

function findFavicon(html, baseUrl) {
  const m = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i)
  if (m) {
    const href = m[0].match(/href=["']([^"']+)["']/i)
    if (href) return absolutize(href[1], baseUrl)
  }
  // 기본 파비콘 경로 폴백
  try {
    return new URL('/favicon.ico', baseUrl).toString()
  } catch {
    return undefined
  }
}

function absolutize(maybeRelative, baseUrl) {
  if (!maybeRelative) return undefined
  try {
    return new URL(maybeRelative, baseUrl).toString()
  } catch {
    return maybeRelative
  }
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

async function fetchPreview(url, fallbackText) {
  const base = { url, title: fallbackText || domainOf(url) }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { ...base, failed: true }
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return { ...base, failed: true }
    const html = await res.text()

    const title =
      metaContent(html, 'og:title') ||
      metaContent(html, 'twitter:title') ||
      decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]) ||
      base.title
    const description =
      metaContent(html, 'og:description') ||
      metaContent(html, 'twitter:description') ||
      metaContent(html, 'description')
    const image = absolutize(
      metaContent(html, 'og:image') || metaContent(html, 'twitter:image'),
      url
    )
    const siteName = metaContent(html, 'og:site_name') || domainOf(url)
    const favicon = findFavicon(html, url)

    return {
      url,
      title: title || base.title,
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      siteName,
      ...(favicon ? { favicon } : {}),
    }
  } catch {
    return { ...base, failed: true }
  }
}

async function main() {
  const links = collectBareLinks()
  let cache = {}
  if (existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
    } catch {
      cache = {}
    }
  }

  const targets = [...links.entries()].filter(([url]) => REFRESH || !cache[url])
  console.log(
    `[link-previews] ${links.size}개 단독 링크 발견, ${targets.length}개 새로 수집${
      REFRESH ? ' (--refresh)' : ''
    }`
  )

  for (const [url, text] of targets) {
    const data = await fetchPreview(url, text)
    cache[url] = data
    console.log(`  ${data.failed ? '✗' : '✓'} ${url}${data.failed ? ' (폴백)' : ''}`)
  }

  // 사용처에서 사라진 URL은 캐시에서 제거(정리)
  for (const url of Object.keys(cache)) {
    if (!links.has(url)) delete cache[url]
  }

  const ordered = Object.fromEntries(
    Object.keys(cache)
      .sort()
      .map((k) => [k, cache[k]])
  )
  writeFileSync(CACHE_PATH, JSON.stringify(ordered, null, 2) + '\n')
  console.log(`[link-previews] ${CACHE_PATH} 기록 완료 (총 ${Object.keys(ordered).length}개)`)
}

main().catch((e) => {
  // 어떤 경우에도 빌드를 깨지 않음
  console.warn('[link-previews] 경고:', e?.message || e)
  process.exit(0)
})
