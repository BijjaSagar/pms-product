import { Component } from 'react';
import type { ReactNode } from 'react';

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
    console.error('[TriponX error boundary]', error);
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
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true" aria-label="Appearance panel failed">
      <div className="absolute inset-0" style={{ background: 'rgb(0 0 0 / 0.4)' }} />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l p-5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="pms-section-title">Appearance panel failed to load</h2>
        <p className="pms-helper mt-1">The rest of the app is unaffected. Details are in the browser console.</p>
        <button
          type="button"
          className="pms-btn-primary mt-4 px-4 py-2.5"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Close panel
        </button>
      </aside>
    </div>
  );
}

export function AppCrashFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--color-page)' }}>
      <div className="pms-card w-full max-w-[420px] p-6 text-center">
        <h1 className="pms-section-title">Something went wrong</h1>
        <p className="pms-helper mt-1">The app hit an unexpected error. Your theme choice is still saved on this device.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={reset}>
            Try again
          </button>
          <button type="button" className="pms-btn-primary flex-1 px-4 py-2.5" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
