import { PRESET_LIST } from '../theme/presets';
import { useTheme } from '../theme/useTheme';

export function ThemeSwatcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { preset = 'crimson', setPreset } = useTheme();
  const activePreset = preset || 'crimson';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Customize appearance">
      <button
        type="button"
        aria-label="Close appearance settings"
        onClick={onClose}
        className="pms-overlay-backdrop absolute inset-0 h-full w-full"
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
          <button type="button" onClick={onClose} className="pms-btn-ghost px-2.5 py-1.5" aria-label="Close panel">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h3 className="pms-label mb-1">Colour preset</h3>
          <p className="pms-helper mb-3">Nine house palettes in a light linen finish.</p>
          <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 sm:grid-cols-2" role="radiogroup" aria-label="Colour preset">
            {PRESET_LIST.map((p) => {
              const checked = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setPreset(p.id)}
                  className="rounded-[14px] border p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
                    background: checked ? 'color-mix(in srgb, var(--color-hover-surface) 78%, white)' : 'var(--color-surface)',
                    boxShadow: checked ? 'var(--shadow-primary), 0 0 0 1px var(--color-primary)' : 'var(--shadow-md)',
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {p.name}
                    </span>
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] font-bold"
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
                  <span className="mt-2.5 flex items-center gap-1.5" aria-hidden="true">
                    {p.swatch.map((c, index) => (
                      <span
                        key={`${c}-${index}`}
                        className="h-6 flex-1 rounded-full border first:flex-[1.2]"
                        style={{ background: c, borderColor: 'rgb(0 0 0 / 0.12)' }}
                        title={c}
                      />
                    ))}
                  </span>
                  <span className="pms-helper mt-2 block text-[11.5px]">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
