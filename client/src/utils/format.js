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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole calendar days between a date and today (0 means today).
function daysAgo(value) {
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(value))) / MS_PER_DAY);
}

// A friendly date: "today", "yesterday", "3 days ago", then the full date after a week.
export function timeAgo(value) {
  const days = daysAgo(value);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}

// Groups dated items under headings such as "Today" and "Yesterday", keeping their order.
export function groupByDay(items, getDate) {
  const groups = [];
  for (const item of items) {
    const label = capitalize(timeAgo(getDate(item)));
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.label === label) lastGroup.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
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
