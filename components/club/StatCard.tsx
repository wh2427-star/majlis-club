/** One dashboard number: label, large value, short note. */
export function StatCard({ label, value, note, testId }: { label: string; value: number; note: string; testId: string }) {
  return (
    <div className="flex flex-col rounded-card bg-white p-4" data-testid={testId}>
      <span className="text-sm">{label}</span>
      <span className="tabular mt-1 text-4xl font-semibold leading-none" data-testid="stat-value">{value}</span>
      <span className="mt-2 text-sm font-semibold text-emerald">{note}</span>
    </div>
  );
}
