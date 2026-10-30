import { useCallback, useEffect, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { dismissToast, snapshotToasts, subscribeToasts } from '../utils/toast';
import type { ToastItem } from '../utils/toast';
import { TONE_VARS } from '../theme/tone';
import type { Tone } from '../theme/tone';

interface ToneConfig {
  icon: Lucide.LucideIcon;
  accentColor: string;
  accentGrad: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  borderColor: string;
  ringColor: string;
  tag: { text: string; bg: string; color: string };
}

function buildToneConfig(icon: Lucide.LucideIcon, label: string, tone: Tone): ToneConfig {
  const vars = TONE_VARS[tone];
  return {
    icon,
    accentColor: vars.text,
    accentGrad: vars.border,
    badgeBg: vars.bg,
    badgeBorder: vars.border,
    badgeText: vars.text,
    borderColor: `color-mix(in srgb, ${vars.text} 32%, var(--color-border))`,
    ringColor: `color-mix(in srgb, ${vars.text} 14%, transparent)`,
    tag: { text: label, bg: vars.bg, color: vars.text },
  };
}

const TOAST_CONFIG: Record<ToastItem['tone'], ToneConfig> = {
  success: buildToneConfig(Lucide.CheckCircle2, 'Success', 'success'),
  danger: buildToneConfig(Lucide.AlertCircle, 'Alert', 'danger'),
  warning: buildToneConfig(Lucide.AlertTriangle, 'Notice', 'warning'),
  info: buildToneConfig(Lucide.Sparkles, 'Update', 'info'),
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

function ToastCard({ toast: t, onDismiss }: ToastCardProps) {
  const cfg = TOAST_CONFIG[t.tone] ?? TOAST_CONFIG.info;
  const Icon = cfg.icon;
  const duration = t.duration || 4500;

  const [isHovered, setIsHovered] = useState(false);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const startTimer = useCallback((ms: number) => {
    if (ms <= 0 || ms === Infinity) return;
    startTimeRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      onDismiss(t.id);
    }, ms);
  }, [onDismiss, t.id]);

  useEffect(() => {
    startTimer(duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, startTimer]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(800, remainingRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    startTimer(remainingRef.current);
  };

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group pointer-events-auto relative flex w-full overflow-hidden rounded-[16px] border backdrop-blur-xl transition-all duration-200 select-none ${
        t.isDismissing ? 'pms-toast-exit' : 'pms-toast-enter'
      }`}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: cfg.borderColor,
        boxShadow: `var(--shadow-xl), 0 0 0 1px ${cfg.ringColor}`,
      }}
    >
      {/* Top subtle tone highlight gradient */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-85"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${cfg.accentColor} 25%, ${cfg.accentGrad} 75%, transparent 100%)`,
        }}
      />

      {/* Ambient soft glow near the icon */}
      <div
        className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full opacity-15 blur-xl"
        style={{ background: cfg.accentColor }}
      />

      {/* Main content body */}
      <div className="relative flex flex-1 items-start gap-3.5 p-3.5 sm:p-4 pr-3">
        {/* Glow Icon Disc */}
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl shadow-xs ring-1 ring-inset transition-transform duration-200 group-hover:scale-105"
          style={{
            background: cfg.badgeBg,
            borderColor: cfg.badgeBorder,
            color: cfg.badgeText,
          }}
        >
          <Icon size={19} strokeWidth={2.3} />
        </div>

        {/* Text Area */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 pr-1">
            <h4
              className="text-[13px] font-semibold tracking-tight leading-snug truncate"
              style={{ color: 'var(--color-ink)' }}
            >
              {t.title}
            </h4>
            <span
              className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-none"
              style={{
                background: cfg.tag.bg,
                color: cfg.tag.color,
              }}
            >
              {cfg.tag.text}
            </span>
          </div>

          {t.detail ? (
            <p
              className="mt-1 text-[12px] leading-relaxed line-clamp-3"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              {t.detail}
            </p>
          ) : null}

          {/* Action button if specified */}
          {t.action ? (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void t.action?.onClick();
                  onDismiss(t.id);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border shadow-xs transition-all duration-150 active:scale-95 cursor-pointer"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-ink)',
                }}
              >
                <span>{t.action.label}</span>
                <Lucide.ArrowRight size={12} className="opacity-70" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(t.id)}
          aria-label="Dismiss notification"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-all duration-150 -mt-1 cursor-pointer"
          style={{ color: 'var(--color-ink-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-ink)';
            e.currentTarget.style.backgroundColor = 'var(--color-hover-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-ink-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Lucide.X size={15} strokeWidth={2.2} />
        </button>
      </div>

      {/* Sleek countdown progress bar at bottom */}
      {duration > 0 && duration !== Infinity ? (
        <div
          className="absolute bottom-0 inset-x-0 h-[2.5px] overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--color-ink) 7%, transparent)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${cfg.accentColor}, ${cfg.accentGrad})`,
              animation: `pmsToastProgress ${duration}ms linear forwards`,
              animationPlayState: isHovered ? 'paused' : 'running',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export interface ToasterProps {
  position?: 'bottom-right' | 'top-right' | 'bottom-center' | 'top-center';
}

export function Toaster({ position = 'bottom-right' }: ToasterProps) {
  const [list, setList] = useState<ToastItem[]>(() => snapshotToasts());
  useEffect(() => subscribeToasts(setList), []);

  if (list.length === 0) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 sm:bottom-6 right-4 sm:right-6 flex-col-reverse',
    'top-right': 'top-4 sm:top-6 right-4 sm:right-6 flex-col',
    'bottom-center': 'bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex-col-reverse',
    'top-center': 'top-4 sm:top-6 left-1/2 -translate-x-1/2 flex-col',
  }[position];

  return (
    <div
      className={`fixed z-[9999] flex w-[calc(100vw-32px)] sm:w-[390px] gap-2.5 pointer-events-none ${positionClasses}`}
      role="status"
      aria-live="polite"
    >
      {list.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
