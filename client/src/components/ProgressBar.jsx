// A horizontal bar showing a percentage. The number is always shown as text too, so
// the value never relies on color or on judging the bar's length.
//
// compact: puts the number beside the bar, for tight spaces such as table rows. The
// label is then only read by screen readers.
export default function ProgressBar({ percent, label = 'Progress', compact = false }) {
  const value = Math.min(100, Math.max(0, percent || 0));

  const bar = (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 flex-1 overflow-hidden rounded-full bg-track"
    >
      <div
        className="h-full rounded-full bg-progress transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${value}%` }}
      />
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {bar}
        <span className="w-9 text-right text-xs font-medium tabular-nums">{value}%</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-medium text-ink tabular-nums">{value}%</span>
      </div>
      <div className="flex">{bar}</div>
    </div>
  );
}
