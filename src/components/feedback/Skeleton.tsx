/*
 * Loading placeholders. Every list, table and panel that waits on an API
 * resource shows these instead of "Loading…" text, so the wait looks the
 * same on every screen. Row and line counts only shape the placeholder; they
 * are not data.
 */

/** One shimmering bar. Size it with width/height utilities. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`pms-skeleton block h-3 rounded-full ${className}`} />;
}

const CELL_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-24'];

/** Placeholder `<tr>` rows that match the real row height of `.pms-table`. */
export function TableSkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} aria-hidden="true">
          {Array.from({ length: cols }).map((__, col) => (
            <td key={col}>
              <Skeleton className={CELL_WIDTHS[(row + col) % CELL_WIDTHS.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Body rows for a table that may be loading, failed or empty: skeleton rows
 * while loading, the error message on failure, the empty text otherwise.
 */
export function TableStateRows({
  cols,
  loading,
  error,
  empty,
  rows = 5,
}: {
  cols: number;
  loading: boolean;
  error?: string | null;
  empty: string;
  rows?: number;
}) {
  if (loading && !error) {
    return <TableSkeletonRows cols={cols} rows={rows} />;
  }
  return (
    <tr>
      <td
        colSpan={cols}
        className={`py-8 text-center text-label ${error ? 'text-danger-text' : 'text-ink-muted'}`}
        role={error ? 'alert' : undefined}
      >
        {error ?? empty}
      </td>
    </tr>
  );
}

/** Placeholder for a whole card or panel: a title bar and a few text lines. */
export function CardSkeleton({ lines = 4, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <div className="pms-card p-5 sm:p-6" role="status" aria-busy="true" aria-label={label}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={i % 3 === 2 ? 'w-2/3' : 'w-full'} />
        ))}
      </div>
    </div>
  );
}

/** What a panel shows until its data arrives: a skeleton, or the load error. */
export function PanelLoadState({ error, lines = 5, label = 'Loading' }: { error?: string | null; lines?: number; label?: string }) {
  if (error) {
    return (
      <div role="alert" className="pms-card p-8 text-center text-body text-danger-text">
        {error}
      </div>
    );
  }
  return <CardSkeleton lines={lines} label={label} />;
}

/** Page-level placeholder: header card plus a KPI row. Also the lazy-route fallback. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading page" role="status">
      <div className="pms-card p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pms-card pms-skeleton min-h-[112px] p-4" />
        ))}
      </div>
      <CardSkeleton lines={6} label="Loading content" />
    </div>
  );
}
