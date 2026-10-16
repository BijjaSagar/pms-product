import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';

interface BoundaryProps {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode;
  resetKeys?: unknown[];
  onReset?: () => void;
}

interface BoundaryState {
  error: Error | null;
}

/** Catches render crashes below it so one failing panel can never blank the app. */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[TriponX PMS error boundary]', error);
  }

  componentDidUpdate(prev: BoundaryProps) {
    const keys = this.props.resetKeys;
    if (this.state.error && keys && prev.resetKeys && keys.some((k, i) => k !== prev.resetKeys?.[i])) {
      this.setState({ error: null });
    }
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) return this.props.fallback(this.reset);
    return this.props.children;
  }
}

export function PanelCrashFallback({ reset, onClose }: { reset: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" role="alertdialog" aria-modal="true" aria-label="Panel failed to load">
      <div
        className="pms-overlay-backdrop absolute inset-0"
        style={{ background: 'var(--color-scrim)' }}
        onClick={() => {
          reset();
          onClose();
        }}
      />
      <aside
        className="pms-overlay-enter relative z-10 flex h-full w-full max-w-[440px] flex-col border-l p-6 shadow-2xl backdrop-blur-md"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Lucide.AlertTriangle size={18} />
            </span>
            <h2 className="text-sm font-bold text-ink">Panel Failed to Render</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border text-ink-muted hover:text-ink"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Lucide.X size={14} />
          </button>
        </div>

        <p className="text-xs text-ink-secondary leading-relaxed">
          This side panel encountered an unexpected rendering error. The primary PMS views and background sync continue operating normally.
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            className="pms-btn-primary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-sm"
            onClick={reset}
          >
            <Lucide.RotateCcw size={14} />
            <span>Retry Loading Panel</span>
          </button>
          <button
            type="button"
            className="rounded-xl border py-2.5 px-4 text-xs font-semibold text-ink hover:bg-hover-surface transition-colors"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Close Side Panel
          </button>
        </div>
      </aside>
    </div>
  );
}

export function AppCrashFallback({ reset }: { reset: () => void }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 pms-animate-fade-in"
      style={{ background: 'var(--color-page, #f2f2f2)' }}
    >
      {/* Ambient Radial Background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[120px] pointer-events-none opacity-25"
        style={{ background: 'var(--color-primary)' }}
      />

      <div
        className="relative w-full max-w-[540px] overflow-hidden rounded-3xl border p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md"
        style={{
          background: 'var(--color-surface, #ffffff)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.16), 0 0 0 1px var(--color-border)',
        }}
      >
        {/* Animated Badge Icon */}
        <div
          className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-md border"
          style={{
            background: 'color-mix(in srgb, #ef4444 12%, var(--color-surface))',
            borderColor: 'color-mix(in srgb, #ef4444 30%, transparent)',
            color: '#dc2626',
          }}
        >
          <Lucide.ServerCrash size={40} strokeWidth={1.8} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
            <Lucide.AlertCircle size={13} strokeWidth={2.4} />
          </span>
        </div>

        {/* Status Chip */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase mb-3"
          style={{
            background: 'color-mix(in srgb, #ef4444 14%, transparent)',
            color: '#dc2626',
            border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>System Exception Intercepted · 500 Error</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Something went unexpectedly wrong
        </h1>

        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary max-w-[420px] mx-auto">
          The property management interface encountered an unhandled exception. Your property databases, local theme, and user session remain completely intact.
        </p>

        {/* Diagnostic Accordion Trigger */}
        <div className="mt-4 mb-5">
          <button
            type="button"
            onClick={() => setShowDetails((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <span>{showDetails ? 'Hide technical diagnostics' : 'Show technical diagnostics'}</span>
            <Lucide.ChevronDown size={13} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          {showDetails && (
            <div
              className="mt-2 text-left rounded-xl border p-3 font-mono text-[11px] text-ink-secondary overflow-x-auto max-h-36 bg-black/5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-rose-600 font-bold mb-1">ComponentStack Error:</p>
              <p>Check browser console logs [TriponX PMS error boundary] for full stack trace.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            className="w-full sm:w-auto pms-btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
            onClick={reset}
          >
            <Lucide.RotateCcw size={15} />
            <span>Try Again</span>
          </button>

          <button
            type="button"
            className="w-full sm:w-auto rounded-xl border px-4 py-2.5 text-xs font-semibold text-ink hover:bg-hover-surface transition-colors flex items-center justify-center gap-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            onClick={() => window.location.reload()}
          >
            <Lucide.RefreshCw size={15} />
            <span>Reload PMS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
