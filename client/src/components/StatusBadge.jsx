// Shows whether a course is published. The word carries the meaning, not just the color.
export default function StatusBadge({ isPublished }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        isPublished ? 'bg-success-soft text-success' : 'bg-track text-muted'
      }`}
    >
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}
