import React, { isValidElement } from 'react'
import TOCInline from 'pliny/ui/TOCInline'
import Pre from 'pliny/ui/Pre'
import BlogNewsletterForm from 'pliny/ui/BlogNewsletterForm'
import type { MDXComponents } from 'mdx/types'
import Image from './Image'
import CustomLink from './Link'
import LinkPreview from './LinkPreview'
import Video from './Video'
import VideoCompare from './VideoCompare'

const isExternalHref = (href: unknown): href is string =>
  typeof href === 'string' && /^https?:\/\//.test(href)

const isVideoHref = (href: unknown): href is string =>
  typeof href === 'string' && /\.(mp4|mov|webm|m4v|ogg)$/i.test(href)

type Embed =
  | { kind: 'video'; href: string }
  | { kind: 'preview'; href: string; children?: React.ReactNode }

/** 링크 노드를 임베드(비디오/미리보기 카드)로 분류. 대상 아니면 null. */
const classifyLink = (node: React.ReactNode): Embed | null => {
  if (!isValidElement(node)) return null
  const props = node.props as { href?: unknown; children?: React.ReactNode }
  if (isVideoHref(props.href)) return { kind: 'video', href: props.href }
  if (isExternalHref(props.href))
    return { kind: 'preview', href: props.href, children: props.children }
  return null
}

/**
 * 의미 있는 자식이 전부 임베드 대상 링크인 문단을 변환한다.
 * - 비디오 파일 링크(.mp4/.mov 등) → 인라인 <video> 플레이어
 * - 외부 http 링크(단독/연속) → 미리보기 카드
 * 그 외(인라인 링크 + 텍스트, 내부 비디오 아닌 링크, 일반 텍스트)는 평범한 <p>로 렌더.
 */
const Paragraph = ({ children }: { children?: React.ReactNode }) => {
  const meaningful = React.Children.toArray(children).filter(
    (c) => !(typeof c === 'string' && c.trim() === '')
  )

  const embeds = meaningful.map(classifyLink)
  if (embeds.length > 0 && embeds.every(Boolean)) {
    return (
      <>
        {embeds.map((embed, i) =>
          embed!.kind === 'video' ? (
            <Video key={i} src={embed!.href} />
          ) : (
            <LinkPreview key={i} href={embed!.href}>
              {embed!.children}
            </LinkPreview>
          )
        )}
      </>
    )
  }

  return <p>{children}</p>
}

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  p: Paragraph,
  pre: Pre,
  BlogNewsletterForm,
  VideoCompare,
}
