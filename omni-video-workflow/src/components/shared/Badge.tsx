const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-neutral-700/40 text-neutral-300',
  ANALYZING: 'bg-amber-500/15 text-amber-300',
  STORYBOARD: 'bg-blue-500/15 text-blue-300',
  GENERATING: 'bg-violet-500/15 text-violet-300',
  RENDERING: 'bg-violet-500/15 text-violet-300',
  COMPLETED: 'bg-green-500/15 text-green-300',
  FAILED: 'bg-red-500/15 text-red-300',
  QUEUED: 'bg-neutral-700/40 text-neutral-300',
  PROCESSING: 'bg-amber-500/15 text-amber-300',
  CANCELLED: 'bg-neutral-700/40 text-neutral-400',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-neutral-700/40 text-neutral-300';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{status}</span>;
}
