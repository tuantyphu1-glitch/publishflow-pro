'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/projects', label: 'Projects', icon: '🎬' },
  { href: '/projects/new', label: 'Create Video', icon: '✨' },
  { href: '/characters', label: 'Characters', icon: '🧑' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/assets', label: 'Assets', icon: '🗂️' },
  { href: '/workflows', label: 'Workflows', icon: '🧩' },
  { href: '/providers', label: 'Providers', icon: '🔌' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-neutral-800">
        <div className="text-sm font-bold text-neutral-100">OMNI VIDEO</div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Workflow Engine</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/projects/new' && pathname?.startsWith(item.href) && item.href !== '/dashboard');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                active ? 'bg-violet-500/15 text-violet-300 font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-neutral-800 text-[11px] text-neutral-500">
        MOCK MODE by default — no API keys required.
      </div>
    </aside>
  );
}
