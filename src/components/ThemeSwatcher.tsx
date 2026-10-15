import { useState } from 'react';
import { PRESET_LIST, isHexColor } from '../theme/presets';
import { useTheme } from '../theme/useTheme';

export function ThemeSwatcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { preset, customAccent, setPreset, setCustomAccent, resetPresetDefaults, resetAll } =
    useTheme();
  const [hexDraft, setHexDraft] = useState(customAccent ?? '');
  const [hexError, setHexError] = useState('');

  if (!open) return null;

  const applyHex = (raw: string) => {
    setHexDraft(raw);
    const v = raw.trim().toUpperCase();
    if (v === '') {
      setHexError('');
      setCustomAccent(null);
      return;
    }
    if (isHexColor(v)) {
      setHexError('');
      setCustomAccent(v);
    } else {
      setHexError('Use a 6-digit hex, e.g. #1D4ED8.');
    }
  };

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
              Live preview · preset saved to active property · custom accent stays on this device
              {customAccent ? ` · custom ${customAccent}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="pms-btn-ghost px-2.5 py-1.5" aria-label="Close panel">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h3 className="pms-label mb-1">Colour preset</h3>
          <p className="pms-helper mb-3">Eight house palettes in a light linen finish.</p>
          <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 sm:grid-cols-2" role="radiogroup" aria-label="Colour preset">
            {PRESET_LIST.map((p) => {
              const checked = preset === p.id;
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

          <h3 className="pms-label mb-1 mt-6">Advanced accent</h3>
          <p className="pms-helper mb-3">Optional. Overrides the preset primary. Keep the preset for a curated look.</p>
          <div
            className="rounded-[12px] border p-3.5"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                <input
                  type="color"
                  value={customAccent ?? '#1D4ED8'}
                  onChange={(e) => applyHex(e.target.value)}
                  aria-label="Pick a custom primary colour"
                  className="h-9 w-12 cursor-pointer rounded-md border"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                />
                Picker
              </label>
              <label className="flex flex-1 items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
                Hex
                <input
                  type="text"
                  value={hexDraft}
                  onChange={(e) => applyHex(e.target.value)}
                  placeholder="#1D4ED8"
                  spellCheck={false}
                  maxLength={7}
                  aria-label="Custom accent hex value"
                  aria-invalid={hexError ? true : undefined}
                  className="pms-input tnum min-w-[110px] flex-1 px-2.5 py-2 uppercase"
                />
              </label>
            </div>
            {hexError ? (
              <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--color-danger-text)' }} role="alert">
                {hexError}
              </p>
            ) : (
              <p className="pms-helper mt-2">
                {customAccent ? `Active override ${customAccent}. Hover/active shades derive automatically.` : 'No override — using preset primary.'}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={resetPresetDefaults} className="pms-btn-ghost px-3 py-2">
                Reset to preset
              </button>
              <button type="button" onClick={resetAll} className="pms-btn-ghost px-3 py-2">
                Reset to default
              </button>
            </div>
          </div>

          <div
            className="mt-4 rounded-[12px] border p-3.5 text-[12.5px]"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
              What changes?
            </p>
            <p className="mt-1" style={{ color: 'var(--color-ink-secondary)' }}>
              Navigation, buttons, cards, tables, forms, dialogs, charts, badges and menus update immediately.
              Status colours (confirmed, occupied, paid…) stay meaningful in every theme. Your page and route state
              are preserved.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
