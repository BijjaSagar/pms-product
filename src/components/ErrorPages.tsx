import * as Lucide from 'lucide-react';
import type { NavTarget } from '../config/navigation';
import { toast } from '../utils/toast';

/**
 * Premium 403 Forbidden / Restricted Access Page
 */
export function ForbiddenPage({
  permission,
  userRole,
  propertyName,
  onGo,
}: {
  permission: string;
  userRole?: string;
  propertyName?: string;
  onGo: (t: NavTarget) => void;
}) {
  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4 sm:p-8 pms-animate-fade-in">
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--color-border)',
        }}
      >
        {/* Ambient background glow */}
        <div
          className="absolute -top-24 -left-24 h-48 w-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'var(--color-warning-text)' }}
        />
        <div
          className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'var(--color-primary)' }}
        />

        {/* Central Icon Badge */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-md border"
          style={{
            background: 'var(--color-warning-bg)',
            borderColor: 'var(--color-warning-border)',
            color: 'var(--color-warning-text)',
          }}
        >
          <Lucide.ShieldAlert size={40} strokeWidth={1.8} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-warning-text text-warning-foreground shadow-sm">
            <Lucide.Lock size={13} strokeWidth={2.4} />
          </span>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase mb-3"
          style={{
            background: 'var(--color-warning-bg)',
            color: 'var(--color-warning-text)',
            border: '1px solid var(--color-warning-border)',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-warning-text animate-pulse" />
          <span>Security & Governance · 403 Forbidden</span>
        </div>

        {/* Title & Body */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Access Restricted to This View
        </h1>

        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary max-w-[440px] mx-auto">
          Your staff role at <strong className="text-ink">{propertyName || 'this property'}</strong> does not include the required permission{' '}
          <code className="rounded px-1.5 py-0.5 font-mono text-xs bg-muted text-ink font-semibold border" style={{ borderColor: 'var(--color-border)' }}>
            {permission}
          </code>.
        </p>

        {/* User Identity Chip */}
        <div
          className="my-5 flex items-center justify-center gap-2 rounded-xl border p-2.5 max-w-[360px] mx-auto text-xs"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}
        >
          <Lucide.UserCheck size={14} className="text-ink-muted" />
          <span className="text-ink-secondary">Current Role:</span>
          <span className="font-bold text-ink">{userRole || 'Staff Member'}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onGo({ view: 'dashboard' })}
            className="w-full sm:w-auto pms-btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
          >
            <Lucide.LayoutDashboard size={15} />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toast('Access request dispatched', {
                detail: `Permission request for "${permission}" sent to the property manager.`,
                tone: 'info',
              });
            }}
            className="w-full sm:w-auto rounded-xl border px-4 py-2.5 text-xs font-semibold text-ink hover:bg-hover-surface transition-colors"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            Request Access
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium 404 View Not Found Page
 */
export function NotFoundPage({ onGo }: { onGo: (t: NavTarget) => void }) {
  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4 sm:p-8 pms-animate-fade-in">
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--color-border)',
        }}
      >
        {/* Central Icon Badge */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-md border"
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))',
            borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
            color: 'var(--color-primary)',
          }}
        >
          <Lucide.Compass size={40} strokeWidth={1.8} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <Lucide.HelpCircle size={13} strokeWidth={2.4} />
          </span>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase mb-3"
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
            color: 'var(--color-primary)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
          }}
        >
          <span>Navigation Service · 404 Screen Not Found</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Page or View Unavailable
        </h1>

        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary max-w-[440px] mx-auto">
          The view or route you requested could not be resolved in this hotel PMS session. It may have moved or been decommissioned.
        </p>

        {/* Quick Nav Suggestions */}
        <div className="my-6 grid grid-cols-2 gap-2 text-left">
          {[
            { label: 'Front Desk Bookings', view: 'reservations' as const, icon: Lucide.CalendarDays },
            { label: 'Live Room Overview', view: 'room-overview' as const, icon: Lucide.BedDouble },
            { label: 'Guest Directory', view: 'guests' as const, icon: Lucide.BookUser },
            { label: 'System Settings', view: 'settings' as const, icon: Lucide.Settings },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onGo({ view: item.view })}
              className="flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold text-ink hover:bg-hover-surface transition-colors"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <item.icon size={15} className="text-primary flex-none" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => onGo({ view: 'dashboard' })}
          className="pms-btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
        >
          <Lucide.Home size={15} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
}
