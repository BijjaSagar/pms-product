import { PRESET_LIST } from './presets';
import { useTheme } from './useTheme';
import { toast } from '../utils/toast';
import { Backdrop, Button } from '../components/primitives';

export function ThemeSwatcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { preset = 'crimson', setPreset } = useTheme();
  const activePreset = preset || 'crimson';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Customize appearance">
      <Backdrop
        type="button"
        aria-label="Close appearance settings"
        onClick={onClose}
        
        style={{ background: 'var(--color-scrim)' }}
      />
      <aside
        className="pms-overlay-enter absolute right-0 top-0 flex h-full w-full flex-col border-l"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-2xl)', maxWidth: 'min(460px, 100vw)' }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="pms-section-title">Appearance</h2>
            <p className="pms-helper mt-0.5">
              Live preview · preset saved to active property
            </p>
          </div>
          <Button variant="secondary" type="button" onClick={onClose}  aria-label="Close panel">
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h3 className="pms-label mb-1">Colour preset</h3>
          <p className="pms-helper mb-3">Nine house palettes in a light linen finish.</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Colour preset">
            {PRESET_LIST.map((p) => {
              const checked = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => {
                    setPreset(p.id);
                    toast.success(`Theme updated to ${p.name}`, {
                      detail: p.description,
                    });
                  }}
                  className="flex w-full min-w-0 cursor-pointer flex-col gap-2.5 rounded-card border p-3 text-left whitespace-normal transition-all hover:-translate-y-px"
                  style={{
                    borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
                    background: checked ? 'color-mix(in srgb, var(--color-hover-surface) 78%, var(--color-surface))' : 'var(--color-surface)',
                    boxShadow: checked ? 'var(--shadow-primary), 0 0 0 1px var(--color-primary)' : 'var(--shadow-xs)',
                  }}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-body font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {p.name}
                    </span>
                    <span
                      className="flex h-4 w-4 flex-none items-center justify-center rounded-full border text-micro font-bold"
                      style={{
                        borderColor: 'var(--color-primary)',
                        background: checked ? 'var(--color-primary)' : 'transparent',
                        color: checked ? 'var(--color-primary-foreground)' : 'transparent',
                      }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </span>
                  <span className="flex h-4 w-full overflow-hidden rounded-md border" aria-hidden="true" style={{ borderColor: 'color-mix(in srgb, var(--color-ink) 12%, transparent)' }}>
                    {p.swatch.map((c, index) => (
                      <span key={`${c}-${index}`} className="h-full flex-1" style={{ background: c }} title={c} />
                    ))}
                  </span>
                  <span className="pms-helper block text-label" style={{ color: 'var(--color-ink-muted)' }}>
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Notification Preview Playground */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="pms-label">Preview Toast Notifications</h3>
              <span className="text-label font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                Live Demo
              </span>
            </div>
            <p className="pms-helper mb-3">
              Test each toast variant with smooth physics, glassmorphic styling, and hover-pause.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary"
                type="button"
                onClick={() =>
                  toast.success('Reservation Confirmed', {
                    detail: 'Room 304 · Alex Morgan checked in successfully.',
                  })
                }
                className="flex items-center gap-2 text-left transition-all cursor-pointer"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'color-mix(in srgb, var(--color-success-text) 35%, var(--color-border))',
                  color: 'var(--color-ink)',
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-success-text shadow-xs" />
                <span>Success Toast</span>
              </Button>

              <Button variant="secondary"
                type="button"
                onClick={() =>
                  toast.info('Housekeeping Assigned', {
                    detail: '3 departure rooms queued for immediate inspection.',
                  })
                }
                className="flex items-center gap-2 text-left transition-all cursor-pointer"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'color-mix(in srgb, var(--color-info-text) 35%, var(--color-border))',
                  color: 'var(--color-ink)',
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-info-text shadow-xs" />
                <span>Info Toast</span>
              </Button>

              <Button variant="secondary"
                type="button"
                onClick={() =>
                  toast.warning('Checkout Pending', {
                    detail: 'Room 108 requested late checkout until 1:30 PM.',
                  })
                }
                className="flex items-center gap-2 text-left transition-all cursor-pointer"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'color-mix(in srgb, var(--color-warning-text) 35%, var(--color-border))',
                  color: 'var(--color-ink)',
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-warning-text shadow-xs" />
                <span>Warning Toast</span>
              </Button>

              <Button variant="secondary"
                type="button"
                onClick={() =>
                  toast.error('Payment Authorization Failed', {
                    detail: 'Visa •••• 4242 declined ($420.00). Cardholder notified.',
                    action: {
                      label: 'Retry Charge',
                      onClick: () => {
                        toast.info('Retrying Payment...', {
                          detail: 'Connecting to payment gateway.',
                        });
                      },
                    },
                  })
                }
                className="flex items-center gap-2 text-left transition-all cursor-pointer"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'color-mix(in srgb, var(--color-danger-text) 35%, var(--color-border))',
                  color: 'var(--color-ink)',
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-danger-text shadow-xs" />
                <span>Error Toast</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
