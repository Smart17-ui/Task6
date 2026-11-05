// A horizontal bar showing a percentage. The number is always shown as text too, so
// the value never relies on color or on judging the bar's length.
export default function ProgressBar({ percent, label = 'Progress' }) {
  const value = Math.min(100, Math.max(0, percent || 0));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-medium text-ink tabular-nums">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-track"
      >
        <div
          className="h-full rounded-full bg-progress transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
