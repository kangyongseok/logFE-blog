const Cell = ({ label, src }: { label: string; src: string }) => (
  <figure className="m-0 flex flex-col gap-2">
    {/* 화면 녹화 영상이라 자막 트랙이 없음 */}
    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
    <video
      controls
      preload="metadata"
      playsInline
      className="w-full rounded-lg border border-gray-200 bg-black dark:border-gray-700"
    >
      <source src={src} />
    </video>
    <figcaption className="m-0 text-center text-sm text-gray-500 dark:text-gray-400">
      {label}
    </figcaption>
  </figure>
)

/**
 * 전/후 비교 영상을 가로로 나란히 보여준다.
 * 휴대폰 화면 녹화(세로 영상)라 모바일에서도 2열 비교가 자연스럽다.
 */
const VideoCompare = ({
  before,
  after,
  beforeLabel = '전',
  afterLabel = '후',
}: {
  before: string
  after: string
  beforeLabel?: string
  afterLabel?: string
}) => (
  <div className="not-prose my-6 grid grid-cols-2 gap-3 sm:gap-4">
    <Cell label={beforeLabel} src={before} />
    <Cell label={afterLabel} src={after} />
  </div>
)

export default VideoCompare
