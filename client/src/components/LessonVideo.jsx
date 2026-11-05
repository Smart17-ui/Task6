// Plays a lesson's optional video, choosing the right player for the type of link.
import { getVideoSource } from '../utils/format';

export default function LessonVideo({ url, title }) {
  const video = url ? getVideoSource(url) : null;
  if (!video) return null;

  if (video.type === 'embed') {
    return (
      <iframe
        src={video.src}
        title={`Video: ${title}`}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-xl bg-brand"
      />
    );
  }

  if (video.type === 'file') {
    return <video src={video.src} controls className="aspect-video w-full rounded-xl bg-brand" />;
  }

  return (
    <a href={video.src} target="_blank" rel="noreferrer" className="btn-secondary">
      Watch the video (opens in a new tab)
    </a>
  );
}
