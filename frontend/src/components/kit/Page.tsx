/**
 * Page building blocks shared by every screen
 */

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div className="min-w-0">
      <h1 className="marker text-3xl sm:text-4xl">{title}</h1>
      {description && <p className="mt-1 text-ink-2">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

interface BlankSlateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** An empty screen that says what to do next */
export const BlankSlate = ({ title, children, action }: BlankSlateProps) => (
  <div className="rounded-surface border-2 border-dashed border-line px-6 py-12 text-center">
    <h2 className="marker text-2xl">{title}</h2>
    {children && <p className="mx-auto mt-2 max-w-md text-ink-2">{children}</p>}
    {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
  </div>
);

export const Spinner = ({ label = 'Loading' }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-3 py-16 text-ink-2">
    <span className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-line border-t-ink" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const Notice = ({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`rounded-control border-[1.5px] px-4 py-3 text-sm ${
      tone === 'error' ? 'border-hot bg-hot-soft text-ink' : 'border-line bg-paper-2 text-ink-2'
    }`}
  >
    {children}
  </div>
);
