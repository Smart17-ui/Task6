// Small display helpers shared across pages.

export function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

export function formatDate(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Works out how to play a lesson's video link. YouTube and Vimeo links need their
// special "embed" address; anything else is either a video file or a plain link.
export function getVideoSource(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v') || parsed.pathname.split('/embed/')[1];
    if (id) return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    if (id) return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.slice(1).split('/')[0];
    if (/^\d+$/.test(id)) return { type: 'embed', src: `https://player.vimeo.com/video/${id}` };
  }
  if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) return { type: 'file', src: url };

  return { type: 'link', src: url };
}
