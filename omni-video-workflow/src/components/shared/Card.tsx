export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-neutral-900 border border-neutral-800 rounded-xl p-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-neutral-100 mb-4">{children}</div>;
}
