// A single headline number with a label, for the top of a dashboard. The optional
// hint adds context, such as what the number is made up of.
export default function StatTile({ label, value, hint }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
