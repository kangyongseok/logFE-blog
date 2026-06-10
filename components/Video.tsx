const Video = ({ src }: { src: string }) => {
  return (
    // 화면 녹화 영상이라 자막 트랙이 없음
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      controls
      preload="metadata"
      playsInline
      className="not-prose my-6 w-full rounded-lg border border-gray-200 bg-black dark:border-gray-700"
    >
      <source src={src} />이 브라우저는 video 태그를 지원하지 않습니다.
    </video>
  )
}

export default Video
