// A gray placeholder shaped like the content that's loading. Unlike a spinner, it
// stops the page from jumping around when the real content arrives.
export function Skeleton({ className = '' }) {
  return <div className={`rounded-lg bg-track motion-safe:animate-pulse ${className}`} />;
}

// Wraps a set of placeholders and tells screen readers that the page is loading.
export function SkeletonGroup({ label, className = '', children }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}
