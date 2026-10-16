import { useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../config/navigation';
import { toast } from '../utils';
import { Modal } from '../components/overlays';

interface NightAuditProps {
  go?: (t: NavTarget) => void;
  onOpenThemes?: () => void;
}

export function NightAudit({ go }: NightAuditProps) {
  // Modal states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [auditStep, setAuditStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [openFoliosModalOpen, setOpenFoliosModalOpen] = useState(false);
  const [pendingPaymentsModalOpen, setPendingPaymentsModalOpen] = useState(false);
  const [unpostedChargesModalOpen, setUnpostedChargesModalOpen] = useState(false);
  const [auditCompleted, setAuditCompleted] = useState(false);

  // Business date
  const [currentBusinessDate, setCurrentBusinessDate] = useState('Tuesday, Oct 14, 2026');

  // Simulated audit run
  const handleStartAudit = () => {
    setAuditStep(1);
    setAuditCompleted(false);
    setWizardOpen(true);
  };

  const handleNextStep = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (auditStep === 1) {
        setAuditStep(2);
        toast('Pre-audit checks verified successfully', { tone: 'info' });
      } else if (auditStep === 2) {
        setAuditStep(3);
        toast('Room & service charges posted to 68 rooms', { tone: 'success' });
      } else if (auditStep === 3) {
        setAuditStep(4);
        toast('Ledgers & balances settled', { tone: 'info' });
      } else if (auditStep === 4) {
        setAuditCompleted(true);
        setCurrentBusinessDate('Wednesday, Oct 15, 2026');
        toast('Night Audit Complete! Rolled over to Oct 15, 2026', { tone: 'success' });
      }
    }, 700);
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* ================= 1. HEADER SECTION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink">
            Night Audit
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-normal">
            Close the day, post room charges, settle accounts and roll over to the next day.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLogsModalOpen(true)}
            className="pms-btn-ghost px-3.5 py-2 text-sm font-medium flex items-center gap-2 border shadow-2xs"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
            }}
          >
            <Lucide.ScrollText size={15} className="text-ink-muted" />
            <span>Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => go?.({ view: 'reports' })}
            className="pms-btn-ghost px-3.5 py-2 text-sm font-medium flex items-center gap-2 border shadow-2xs"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
            }}
          >
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 4-STEP WIZARD / PROGRESS BAR ================= */}
      <div
        className="rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-none text-white shadow-xs"
              style={{ background: 'var(--color-primary)' }}
            >
              1
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Pre-Audit Checks</p>
              <p className="text-xs text-ink-secondary">Review status &amp; resolve issues</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-none border-2"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                color: 'var(--color-primary)',
                background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)',
              }}
            >
              2
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Post Charges</p>
              <p className="text-xs text-ink-secondary">Apply room and service charges</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-none border-2"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                color: 'var(--color-primary)',
                background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)',
              }}
            >
              3
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Settle &amp; Verify</p>
              <p className="text-xs text-ink-secondary">Check payments and balances</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-none border-2"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                color: 'var(--color-primary)',
                background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)',
              }}
            >
              4
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Close Day</p>
              <p className="text-xs text-ink-secondary">Lock date and roll over</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. TOP KPI CARDS ROW (5 CARDS) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {/* KPI 1: Occupied Rooms */}
        <div
          className="rounded-xl border p-3 shadow-xs flex items-center gap-3 transition-all"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none bg-blue-50 text-blue-600 border border-blue-100">
            <Lucide.Bed size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xl font-bold text-ink leading-tight">68</p>
            <p className="text-xs font-medium text-ink-secondary">Occupied Rooms</p>
            <p className="text-xs font-normal text-ink-muted">68 / 100 (68%)</p>
          </div>
        </div>

        {/* KPI 2: Expected Arrivals */}
        <div
          className="rounded-xl border p-3 shadow-xs flex items-center gap-3 transition-all"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Lucide.DoorOpen size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-black text-ink leading-tight">12</p>
            <p className="text-xs font-semibold text-ink-secondary">Expected Arrivals</p>
            <p className="text-[11.5px] font-bold text-emerald-600 flex items-center gap-0.5">
              <span>↗</span> 2 walk-ins
            </p>
          </div>
        </div>

        {/* KPI 3: Expected Departures */}
        <div
          className="rounded-2xl border p-4 shadow-2xs flex items-center gap-3.5 transition-all"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Lucide.DoorClosed size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-black text-ink leading-tight">8</p>
            <p className="text-xs font-semibold text-ink-secondary">Expected Departures</p>
            <p className="text-[11.5px] font-bold text-rose-500 flex items-center gap-0.5">
              <span>↓</span> 1 early check-out
            </p>
          </div>
        </div>

        {/* KPI 4: In-House Guests */}
        <div
          className="rounded-2xl border p-4 shadow-2xs flex items-center gap-3.5 transition-all"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none bg-blue-50 text-blue-600 border border-blue-100">
            <Lucide.Users size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-black text-ink leading-tight">2</p>
            <p className="text-xs font-semibold text-ink-secondary">In-House Guests</p>
            <p className="text-[11.5px] font-medium text-ink-muted">124 total guests</p>
          </div>
        </div>

        {/* KPI 5: Pending Issues */}
        <div
          className="rounded-2xl border p-4 shadow-2xs flex items-center gap-3.5 transition-all"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none bg-rose-50 text-rose-600 border border-rose-100">
            <Lucide.AlertCircle size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-black text-rose-600 leading-tight">3</p>
            <p className="text-xs font-bold text-rose-600">Pending Issues</p>
            <button
              type="button"
              onClick={() => setOpenFoliosModalOpen(true)}
              className="text-[11.5px] font-bold hover:underline cursor-pointer"
              style={{ color: 'var(--color-primary)' }}
            >
              View details →
            </button>
          </div>
        </div>
      </div>

      {/* ================= 4. MIDDLE TWO-COLUMN MAIN SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Pre-Audit Checklist (approx 68% / 8 cols) */}
        <div
          className="lg:col-span-8 rounded-2xl border p-4 sm:p-5 shadow-2xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div>
            {/* Header with red pill */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink">
                  Pre-Audit Checklist
                </h2>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Please review and resolve all items before proceeding with the audit.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex-none self-start sm:self-auto">
                <Lucide.AlertCircle size={13} className="text-rose-600" />
                <span>3 items pending</span>
              </span>
            </div>

            {/* Checklist items list */}
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-slate-800">
              {/* Item 1: Open Folios */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-none">
                    <Lucide.AlertCircle size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Open Folios</p>
                    <p className="text-xs text-ink-secondary truncate">
                      3 in-house guests have open folios with balance
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-none">
                  <span className="text-sm font-bold text-rose-600">3</span>
                  <button
                    type="button"
                    onClick={() => setOpenFoliosModalOpen(true)}
                    className="text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <span>View guests</span>
                    <Lucide.ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Item 2: Pending Payments */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-none">
                    <Lucide.AlertCircle size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Pending Payments</p>
                    <p className="text-xs text-ink-secondary truncate">
                      2 bookings with pending payments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-none">
                  <span className="text-sm font-bold text-rose-600">2</span>
                  <button
                    type="button"
                    onClick={() => setPendingPaymentsModalOpen(true)}
                    className="text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <span>View bookings</span>
                    <Lucide.ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Item 3: Unposted Charges */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-none">
                    <Lucide.AlertTriangle size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Unposted Charges</p>
                    <p className="text-xs text-ink-secondary truncate">
                      5 manual charges pending to post
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-none">
                  <span className="text-sm font-bold text-amber-600">5</span>
                  <button
                    type="button"
                    onClick={() => setUnpostedChargesModalOpen(true)}
                    className="text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <span>Review charges</span>
                    <Lucide.ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Item 4: Room Status Updated */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-none">
                    <Lucide.CheckCircle2 size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Room Status Updated</p>
                    <p className="text-xs text-ink-secondary truncate">
                      All room statuses are up to date
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              </div>

              {/* Item 5: No Pending Check-outs */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-none">
                    <Lucide.CheckCircle2 size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">No Pending Check-outs</p>
                    <p className="text-xs text-ink-secondary truncate">
                      All due check-outs processed
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              </div>

              {/* Item 6: Housekeeping Status */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-none">
                    <Lucide.CheckCircle2 size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Housekeeping Status</p>
                    <p className="text-xs text-ink-secondary truncate">
                      Room status and housekeeping sync complete
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Audit Summary (approx 32% / 4 cols) */}
        <div
          className="lg:col-span-4 rounded-2xl border p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-bold text-ink border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              Audit Summary <span className="font-normal text-xs text-ink-secondary">(Oct 14, 2026)</span>
            </h2>

            {/* Metrics breakdown grid in two sub-columns */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3.5 text-xs">
              {/* Left sub-column */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">Total Rooms</span>
                  <span className="font-bold text-ink">100</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">Occupied Rooms</span>
                  <span className="font-bold text-ink">68 (68%)</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">Arrivals</span>
                  <span className="font-bold text-ink">12</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">Departures</span>
                  <span className="font-bold text-ink">8</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">In-House Guests</span>
                  <span className="font-bold text-ink">124</span>
                </div>
              </div>

              {/* Right sub-column with highlighted rows */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">Room Revenue</span>
                  <span className="font-bold text-ink font-mono">₹3,40,000</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-ink-secondary">Other Revenue</span>
                  <span className="font-bold text-ink font-mono">₹45,200</span>
                </div>

                {/* Total Revenue Highlight */}
                <div className="flex justify-between items-center px-2 py-1.5 rounded-lg bg-blue-50/90 border border-blue-100">
                  <span className="font-semibold text-blue-950 text-[11.5px]">Total Revenue</span>
                  <span className="font-extrabold text-blue-950 font-mono text-[12px]">₹3,85,200</span>
                </div>

                {/* Total Payments Highlight */}
                <div className="flex justify-between items-center px-2 py-1.5 rounded-lg bg-emerald-50/90 border border-emerald-100">
                  <span className="font-semibold text-emerald-950 text-[11.5px]">Total Payments</span>
                  <span className="font-extrabold text-emerald-950 font-mono text-[12px]">₹3,72,500</span>
                </div>

                {/* Outstanding Balance Highlight */}
                <div className="flex justify-between items-center px-2 py-1.5 rounded-lg bg-rose-50/90 border border-rose-100">
                  <span className="font-semibold text-rose-700 text-[11.5px]">Outstanding Balance</span>
                  <span className="font-extrabold text-rose-700 font-mono text-[12px]">₹12,700</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {/* Audit Date Callout Banner */}
            <div className="rounded-xl p-3 flex items-center gap-3 bg-blue-50/70 border border-blue-200/60">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-none text-white text-xs font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                <Lucide.Info size={15} />
              </div>
              <div>
                <p className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider">Audit Date</p>
                <p className="text-xs font-bold text-ink">{currentBusinessDate}</p>
              </div>
            </div>

            {/* Big Action CTA */}
            <button
              type="button"
              onClick={handleStartAudit}
              className="pms-btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Start Night Audit</span>
              <Lucide.ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 5. BOTTOM 3 DATA TABLES SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table 1: In-House Guests with Balance */}
        <div
          className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-xs sm:text-sm text-ink">
                In-House Guests with Balance
              </h3>
              <button
                type="button"
                onClick={() => setOpenFoliosModalOpen(true)}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: 'var(--color-primary)' }}
              >
                View all (3)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs mt-2">
                <thead>
                  <tr className="text-ink-muted text-[10.5px] font-bold uppercase tracking-wider border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="py-2 pr-2">GUEST NAME</th>
                    <th className="py-2 px-2">ROOM</th>
                    <th className="py-2 px-2 text-right">BALANCE (₹)</th>
                    <th className="py-2 pl-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 pr-2 font-medium text-ink">Rahul Mehta</td>
                    <td className="py-2.5 px-2 text-ink-secondary">205</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-ink">2,500.00</td>
                    <td className="py-2.5 pl-2 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        Open
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-2 font-medium text-ink">Sarah Wilson</td>
                    <td className="py-2.5 px-2 text-ink-secondary">312</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-ink">1,200.00</td>
                    <td className="py-2.5 pl-2 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        Open
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-2 font-medium text-ink">Amit Kumar</td>
                    <td className="py-2.5 px-2 text-ink-secondary">418</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-ink">3,000.00</td>
                    <td className="py-2.5 pl-2 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        Open
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table 2: Pending Payments */}
        <div
          className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-xs sm:text-sm text-ink">
                Pending Payments
              </h3>
              <button
                type="button"
                onClick={() => setPendingPaymentsModalOpen(true)}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: 'var(--color-primary)' }}
              >
                View all (2)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs mt-2">
                <thead>
                  <tr className="text-ink-muted text-[10.5px] font-bold uppercase tracking-wider border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="py-2 pr-2">BOOKING ID</th>
                    <th className="py-2 px-2">GUEST NAME</th>
                    <th className="py-2 px-2 text-right">AMOUNT (₹)</th>
                    <th className="py-2 pl-2 text-right">DUE DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 pr-2 font-mono font-bold text-ink">BK123456</td>
                    <td className="py-2.5 px-2 text-ink-secondary">John Smith</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-ink">5,000.00</td>
                    <td className="py-2.5 pl-2 text-right text-ink-muted">Oct 14, 2026</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-2 font-mono font-bold text-ink">BK123789</td>
                    <td className="py-2.5 px-2 text-ink-secondary">Priya Sharma</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-ink">7,500.00</td>
                    <td className="py-2.5 pl-2 text-right text-ink-muted">Oct 14, 2026</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table 3: Recent Audit History */}
        <div
          className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-xs sm:text-sm text-ink">
                Recent Audit History
              </h3>
              <button
                type="button"
                onClick={() => setLogsModalOpen(true)}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: 'var(--color-primary)' }}
              >
                View all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs mt-2">
                <thead>
                  <tr className="text-ink-muted text-[10.5px] font-bold uppercase tracking-wider border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="py-2 pr-2">DATE</th>
                    <th className="py-2 px-2">STATUS</th>
                    <th className="py-2 px-2 text-right">TOTAL REVENUE (₹)</th>
                    <th className="py-2 pl-2 text-right">USER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 pr-2 font-medium text-ink">Oct 13, 2026</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-ink">3,72,800</td>
                    <td className="py-2 pl-2 text-right text-ink-muted">Admin</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-medium text-ink">Oct 12, 2026</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-ink">3,68,500</td>
                    <td className="py-2 pl-2 text-right text-ink-muted">Admin</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-medium text-ink">Oct 11, 2026</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-ink">3,55,200</td>
                    <td className="py-2 pl-2 text-right text-ink-muted">Manager</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-medium text-ink">Oct 10, 2026</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-ink">3,61,400</td>
                    <td className="py-2 pl-2 text-right text-ink-muted">Admin</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-medium text-ink">Oct 09, 2026</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-ink">3,48,900</td>
                    <td className="py-2 pl-2 text-right text-ink-muted">Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 6. INTERACTIVE NIGHT AUDIT RUN WIZARD MODAL ================= */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Night Audit Day Close Wizard"
        subtitle={`Audit date: ${currentBusinessDate}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setWizardOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              {auditCompleted ? 'Close' : 'Cancel'}
            </button>

            {!auditCompleted ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isProcessing}
                className="pms-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Lucide.Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : auditStep === 1 ? (
                  <>
                    <span>Confirm Pre-Audit Checks &amp; Proceed</span>
                    <Lucide.ArrowRight size={14} />
                  </>
                ) : auditStep === 2 ? (
                  <>
                    <span>Post All Room &amp; Extra Charges</span>
                    <Lucide.ArrowRight size={14} />
                  </>
                ) : auditStep === 3 ? (
                  <>
                    <span>Verify Ledgers &amp; Trial Balance</span>
                    <Lucide.ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    <span>Finalize Close Day &amp; Roll Over Date</span>
                    <Lucide.CheckCircle2 size={14} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="pms-btn-primary px-5 py-2 text-xs font-bold"
              >
                Done
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          {!auditCompleted ? (
            <>
              {/* Step tracker in modal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-page border" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  { step: 1, label: 'Pre-Audit' },
                  { step: 2, label: 'Post Charges' },
                  { step: 3, label: 'Settle Ledgers' },
                  { step: 4, label: 'Date Rollover' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        auditStep === s.step
                          ? 'bg-primary text-white shadow-xs'
                          : auditStep > s.step
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-black/5 text-ink-muted'
                      }`}
                    >
                      {auditStep > s.step ? '✓' : s.step}
                    </span>
                    <span className={`font-semibold ${auditStep === s.step ? 'text-ink' : 'text-ink-muted'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {auditStep === 1 && (
                <div className="flex flex-col gap-2.5 p-3 rounded-xl border bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="font-bold text-sm text-ink">Step 1: Pre-Audit Validation</h4>
                  <p className="text-ink-secondary leading-relaxed">
                    Checking departures, arrivals, in-house guest folios, and housekeeping room synchronization.
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                      <span>Expected Departures Processed</span>
                      <span className="font-bold text-emerald-600">8 / 8 (Completed)</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                      <span>Occupied Rooms Cleaned &amp; Inspected</span>
                      <span className="font-bold text-emerald-600">100% Up to date</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Open Folios with Pending Balance</span>
                      <span className="font-bold text-amber-600">3 guests (Carried over to next business day)</span>
                    </div>
                  </div>
                </div>
              )}

              {auditStep === 2 && (
                <div className="flex flex-col gap-2.5 p-3 rounded-xl border bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="font-bold text-sm text-ink">Step 2: Post Room &amp; Recurring Charges</h4>
                  <p className="text-ink-secondary leading-relaxed">
                    Automated posting engine will apply room tariff, GST, and daily recurring package charges across all 68 occupied guest rooms.
                  </p>
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/50 mt-1">
                    <p className="font-bold text-blue-950">Estimated Room Postings: ₹3,40,000</p>
                    <p className="text-[11px] text-blue-800 mt-0.5">68 active guest rooms × average nightly rate</p>
                  </div>
                </div>
              )}

              {auditStep === 3 && (
                <div className="flex flex-col gap-2.5 p-3 rounded-xl border bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="font-bold text-sm text-ink">Step 3: Settle &amp; Verify Ledgers</h4>
                  <p className="text-ink-secondary leading-relaxed">
                    Balancing the Guest Ledger, City Ledger, and Deposit Ledger against payments captured today.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2.5 rounded-lg border bg-page">
                      <span className="text-ink-muted text-[11px] block">Payments Reconciled</span>
                      <span className="font-bold text-ink font-mono text-sm">₹3,72,500</span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-page">
                      <span className="text-ink-muted text-[11px] block">Ledger Variance</span>
                      <span className="font-bold text-emerald-600 font-mono text-sm">₹0.00 (Balanced)</span>
                    </div>
                  </div>
                </div>
              )}

              {auditStep === 4 && (
                <div className="flex flex-col gap-2.5 p-3 rounded-xl border bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="font-bold text-sm text-ink">Step 4: Roll Over Business Date</h4>
                  <p className="text-ink-secondary leading-relaxed">
                    Final lock of financial transactions for <strong>Oct 14, 2026</strong>. System will advance the PMS operating date to <strong>Wednesday, Oct 15, 2026</strong>.
                  </p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mt-1">
                    <p className="font-bold text-amber-900">Notice:</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Once confirmed, the current business date will close permanently and post-audit reports will be generated.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Lucide.CheckCircle2 size={32} />
              </div>
              <h3 className="font-extrabold text-lg text-ink">Night Audit Completed!</h3>
              <p className="text-ink-secondary max-w-sm text-xs leading-relaxed">
                The business day has been successfully closed. All room charges have posted, ledger accounts are balanced, and the system business date has advanced to <strong>Wednesday, Oct 15, 2026</strong>.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ================= 7. AUDIT LOGS MODAL ================= */}
      <Modal
        open={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title="Night Audit Execution Logs"
        subtitle="Historical run logs, automated charges & system rollover timestamps"
        footer={
          <button
            type="button"
            onClick={() => setLogsModalOpen(false)}
            className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col gap-2 py-2 text-xs max-h-[380px] overflow-y-auto">
          {[
            { time: '14-Oct-2026 23:45', action: 'Daily flash report & pre-audit check snapshot generated', user: 'System Automated', status: 'Success' },
            { time: '13-Oct-2026 23:58', action: 'Day Closed: Business date rolled from Oct 13 to Oct 14', user: 'Admin (Karan)', status: 'Success' },
            { time: '13-Oct-2026 23:55', action: '68 Room tariff charges & 12% GST auto-posted to in-house folios', user: 'Admin (Karan)', status: 'Success' },
            { time: '13-Oct-2026 23:50', action: 'Audit verification: ₹3,72,800 total payments balanced', user: 'Admin (Karan)', status: 'Success' },
            { time: '12-Oct-2026 23:59', action: 'Day Closed: Business date rolled from Oct 12 to Oct 13', user: 'Admin (Karan)', status: 'Success' },
            { time: '11-Oct-2026 23:58', action: 'Day Closed: Business date rolled from Oct 11 to Oct 12', user: 'Manager (Sunita)', status: 'Success' },
          ].map((log, i) => (
            <div key={i} className="p-3 rounded-xl border bg-page flex items-start justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-bold text-ink">{log.action}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">By {log.user} • {log.time}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </Modal>

      {/* ================= 8. OPEN FOLIOS MODAL ================= */}
      <Modal
        open={openFoliosModalOpen}
        onClose={() => setOpenFoliosModalOpen(false)}
        title="Open Folios with Pending Balance"
        subtitle="In-house guests with outstanding balances prior to night audit"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              onClick={() => {
                setOpenFoliosModalOpen(false);
                go?.({ view: 'folios' });
              }}
              className="text-xs font-bold hover:underline cursor-pointer"
              style={{ color: 'var(--color-primary)' }}
            >
              Open Folios &amp; Billing module →
            </button>
            <button
              type="button"
              onClick={() => setOpenFoliosModalOpen(false)}
              className="pms-btn-primary px-4 py-2 text-xs font-bold"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 py-2 text-xs">
          {[
            { name: 'Rahul Mehta', room: '205', balance: '₹2,500.00', checkOut: 'Tomorrow, Oct 15' },
            { name: 'Sarah Wilson', room: '312', balance: '₹1,200.00', checkOut: 'Oct 16, 2026' },
            { name: 'Amit Kumar', room: '418', balance: '₹3,000.00', checkOut: 'Oct 17, 2026' },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl border bg-page flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-bold text-ink">{item.name} (Room {item.room})</p>
                <p className="text-[11px] text-ink-muted">Due checkout: {item.checkOut}</p>
              </div>
              <span className="font-mono font-bold text-rose-600 text-sm">{item.balance}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* ================= 9. PENDING PAYMENTS MODAL ================= */}
      <Modal
        open={pendingPaymentsModalOpen}
        onClose={() => setPendingPaymentsModalOpen(false)}
        title="Pending Payments Checklist"
        subtitle="Unsettled pre-authorizations and pending transactions"
        footer={
          <button
            type="button"
            onClick={() => setPendingPaymentsModalOpen(false)}
            className="pms-btn-primary px-4 py-2 text-xs font-bold"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col gap-2 py-2 text-xs">
          {[
            { id: 'BK123456', guest: 'John Smith', amount: '₹5,000.00', reason: 'Online Gateway Pre-Auth awaiting card capture' },
            { id: 'BK123789', guest: 'Priya Sharma', amount: '₹7,500.00', reason: 'Corporate direct bill awaiting company voucher' },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl border bg-page flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-bold text-ink">{item.id} • {item.guest}</p>
                <p className="text-[11px] text-ink-muted">{item.reason}</p>
              </div>
              <span className="font-mono font-bold text-ink text-sm">{item.amount}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* ================= 10. UNPOSTED CHARGES MODAL ================= */}
      <Modal
        open={unpostedChargesModalOpen}
        onClose={() => setUnpostedChargesModalOpen(false)}
        title="Unposted Manual Charges"
        subtitle="5 incidentals and restaurant tickets pending posting"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              onClick={() => {
                setUnpostedChargesModalOpen(false);
                toast('All 5 manual charges auto-posted', { tone: 'success' });
              }}
              className="pms-btn-primary px-4 py-2 text-xs font-bold"
            >
              Post All 5 Charges
            </button>
            <button
              type="button"
              onClick={() => setUnpostedChargesModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 py-2 text-xs">
          {[
            { room: '201', desc: 'In-Room Dining (Dinner for 2)', amount: '₹1,450.00' },
            { room: '304', desc: 'Laundry Express Service', amount: '₹680.00' },
            { room: '105', desc: 'Minibar Beverages', amount: '₹340.00' },
            { room: '412', desc: 'Airport Pickup Cab', amount: '₹1,800.00' },
            { room: '501', desc: 'Spa Ayurvedic Therapy', amount: '₹2,500.00' },
          ].map((c, i) => (
            <div key={i} className="p-3 rounded-xl border bg-page flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-bold text-ink">Room {c.room} • {c.desc}</p>
              </div>
              <span className="font-mono font-bold text-ink text-sm">{c.amount}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
