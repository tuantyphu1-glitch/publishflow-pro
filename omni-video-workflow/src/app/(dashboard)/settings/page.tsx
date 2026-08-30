import { db } from '@/lib/db';
import { Card, CardTitle } from '@/components/shared/Card';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const usage = await db.usageRecord.groupBy({
    by: ['provider'],
    _count: { _all: true },
    _sum: { estimatedCost: true, durationMs: true },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-neutral-400 mb-6">Estimated usage across every provider call ever recorded (Rule 24: every call is logged, even at $0).</p>

      <Card>
        <CardTitle>Estimated Usage</CardTitle>
        {usage.length === 0 ? (
          <p className="text-sm text-neutral-500">No generations recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wide">
                <th className="pb-2">Provider</th>
                <th className="pb-2">Generation count</th>
                <th className="pb-2">Estimated cost</th>
                <th className="pb-2">Total duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {usage.map((u) => (
                <tr key={u.provider}>
                  <td className="py-2 text-neutral-200">{u.provider}</td>
                  <td className="py-2">{u._count._all}</td>
                  <td className="py-2">${(u._sum.estimatedCost ?? 0).toFixed(4)}</td>
                  <td className="py-2">{((u._sum.durationMs ?? 0) / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
