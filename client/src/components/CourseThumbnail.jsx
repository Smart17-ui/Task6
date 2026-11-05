// A course image. Falls back to a plain panel when there's no image or it fails to load.
import { useState } from 'react';

export default function CourseThumbnail({ course, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!course.thumbnailUrl || failed) {
    return (
      <div className={`flex items-center justify-center bg-brand p-4 text-center ${className}`}>
        <span className="font-display text-lg text-accent">{course.category}</span>
      </div>
    );
  }

  return (
    <img
      src={course.thumbnailUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      // The background shows while the image loads, so the space never looks empty.
      className={`bg-track object-cover ${className}`}
    />
  );
}
