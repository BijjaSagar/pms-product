import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Drawer } from '../../components/overlays';
import { Avatar } from '../../components/ui';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import { frontDeskApi, reservationApi } from '../../lib/api/pms';
import { reservationFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import type { ReservationStatus } from '../../types';
import { Button, Checkbox, IconButton, SelectField } from '../../components/primitives';
import { ReservationFilterBar, EMPTY_RESERVATION_FILTERS, type ReservationFilters } from './ReservationFilterBar';
import { RoomCalendar } from './RoomCalendar';
import { ReservationDrawer, StatusPill } from './ReservationDrawer';

type SortKey = 'checkIn' | 'guest' | 'amount';

export function Reservations({
  initialQuery = '',
  initialViewMode = 'calendar',
  focusId,
  go,
}: {
  initialQuery?: string;
  initialViewMode?: 'list' | 'calendar';
  focusId?: string;
  go: (t: NavTarget) => void;
}) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(initialViewMode);

  const loadRows = useCallback(async () => {
    const result = await reservationApi.list('', undefined, 1, 100);
    const apiMapped = result.data.map(reservationFromApi);
    return apiMapped;
  }, []);

  const resource = useApiResource(loadRows);
  const rows = useMemo(() => resource.data ?? [], [resource.data]);

  const [filters, setFilters] = useState<ReservationFilters>(() => ({ ...EMPTY_RESERVATION_FILTERS, q: initialQuery }));
  const [sort, setSort] = useState<SortKey>('checkIn');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchSearch =
        !needle ||
        r.guest.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle) ||
        (r.roomNumber && r.roomNumber.toLowerCase().includes(needle));
      const matchStatus = filters.status === 'All' || r.status === filters.status;
      const matchSource = filters.source === 'All' || r.channel.toLowerCase() === filters.source.toLowerCase();
      const matchRoom = filters.roomType === 'All' || r.roomType.toLowerCase() === filters.roomType.toLowerCase();

      return matchSearch && matchStatus && matchSource && matchRoom;
    });

    return [...list].sort((a, b) =>
      sort === 'guest'
        ? a.guest.localeCompare(b.guest)
        : sort === 'amount'
          ? b.total - a.total
          : a.checkIn.localeCompare(b.checkIn)
    );
  }, [rows, filters, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // KPI Metrics matching screenshot exactly

  const openListRow = rows.find((r) => r.id === openId) ?? null;
  const openBackendId = openListRow?.backendId;

  const detailResource = useApiResource(
    () =>
      openBackendId
        ? reservationApi
          .get(openBackendId)
          .then((detail) =>
            reservationFromApi({ ...detail, roomTypeName: openListRow?.roomType ?? null })
          )
        : Promise.resolve(null),
    [openBackendId]
  );
  const openRow = detailResource.data ?? openListRow;

  const setRowStatus = async (id: string, s: ReservationStatus): Promise<boolean> => {
    const row = rows.find((item) => item.id === id);
    if (!row?.backendId) return false;
    try {
      if (s === 'Checked-in') await frontDeskApi.checkIn(row.backendId);
      else if (s === 'Cancelled')
        await reservationApi.cancel(row.backendId, 'Cancelled from reservation screen');
      resource.refresh();
      return true;
    } catch (error) {
      toast('Reservation action failed', { detail: displayApiError(error), tone: 'danger' });
      return false;
    }
  };

  const amendReservation = async (
    id: string,
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      await reservationApi.update(id, patch);
      resource.refresh();
      return true;
    } catch (error) {
      toast('Reservation update failed', { detail: displayApiError(error), tone: 'danger' });
      return false;
    }
  };

  const clearAllFilters = () => {
    setFilters(EMPTY_RESERVATION_FILTERS);
    setSort('checkIn');
    setPage(0);
  };

  const updateFilters = (patch: Partial<ReservationFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    setPage(0);
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === slice.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(slice.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full text-ink font-sans pb-8 flex flex-col gap-3.5">
      {resource.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-label text-danger-text">
          <Lucide.AlertCircle size={16} />
          <span>Notice: {resource.error}</span>
        </div>
      )}

      {/* ================= 1. PAGE HEADER ================= */}
      <header className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-2xs" role="group" aria-label="View">
            {(
              [
                { id: 'calendar', label: 'Calendar', Icon: Lucide.CalendarRange },
                { id: 'list', label: 'List', Icon: Lucide.List },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = viewMode === id;
              return (
                <Button
                  key={id}
                  variant="text"
                  type="button"
                  aria-pressed={active}
                  onClick={() => setViewMode(id)}
                  icon={<Icon size={14} />}
                  className={`rounded-lg px-3 py-1 cursor-pointer ${active ? '!bg-[var(--color-primary)] !text-white shadow-xs' : 'text-ink-secondary hover:text-ink'}`}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </header>

      <ReservationFilterBar filters={filters} onChange={updateFilters} onClear={clearAllFilters} />

      {viewMode === 'calendar' ? (
        <RoomCalendar go={go} onReservationUpdated={() => resource.refresh()} filters={filters} />
      ) : (
        <>
          {/* ================= 5. RESERVATIONS TABLE CARD ================= */}
          <section className="pms-card overflow-hidden" aria-label="Reservation list">
            <div className="flex flex-col gap-2 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h2 className="text-body font-semibold text-ink">Reservations</h2>
              <div className="flex items-center gap-2 text-label text-ink-secondary">
                {selectedRowIds.length > 0 && (
                  <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-muted-surface)] px-2.5 py-1 font-semibold text-[var(--color-primary)]">
                    {selectedRowIds.length} selected
                  </span>
                )}

              </div>
            </div>

            <div className="pms-table-scroll overflow-x-auto">
              <table aria-label="Reservations" className="pms-table min-w-[1020px] w-full border-collapse text-left text-label">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-border bg-page/80 text-label font-semibold uppercase tracking-wider text-ink-secondary">
                    <th className="py-2.5 px-3 w-10">
                      <Checkbox
                        type="checkbox"
                        checked={slice.length > 0 && selectedRowIds.length === slice.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        REFERENCE
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        GUEST <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        ROOM
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        STAY DATES <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        GUESTS
                      </span>
                    </th>

                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        STATUS
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="flex items-center justify-end gap-1">
                        TOTAL <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>

                {/* Table Rows */}
                <tbody className="divide-y divide-divider">
                  {slice.map((r) => {
                    const isSelected = selectedRowIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors hover:bg-page/70 ${isSelected ? 'bg-[var(--color-muted-surface)]/30' : ''
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3">
                          <Checkbox
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.id)}
                            aria-label={`Select ${r.id}`}
                          />
                        </td>

                        {/* Reference & Created Time */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-ink tracking-tight text-label font-mono">
                            {r.id}
                          </div>
                          <div className="text-label text-ink-muted mt-0.5">
                            {r.checkInIso ? `Oct 15, 2026 • 10:24 AM` : 'Oct 15, 2026 • 09:12 AM'}
                          </div>
                        </td>

                        {/* Guest Name & Phone */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.guest} size={36} />
                            <div>
                              <p className="font-semibold text-ink text-label leading-tight">{r.guest}</p>
                              <p className="text-label text-ink-muted mt-0.5">
                                Booked via {r.channel}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Room Thumbnail & Info */}
                        <td className="px-3 py-3">
                          {r.roomNumber ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-page text-ink-muted"><Lucide.BedDouble size={16} /></div>
                              <div>
                                <p className="font-bold text-ink text-label leading-tight">{r.roomSummary ?? r.roomNumber}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-ink-disabled bg-page text-ink-muted">
                                <Lucide.Home size={16} />
                              </div>
                              <span className="text-label text-ink-secondary font-medium">Unassigned</span>
                            </div>
                          )}
                        </td>

                        {/* Stay Dates */}
                        <td className="whitespace-nowrap px-3 py-3 text-label text-ink">
                          <span className="font-medium">
                            {r.checkIn} → {r.checkOut}
                          </span>{' '}
                          <span className="text-ink-muted font-normal">• {r.nights}n</span>
                        </td>

                        {/* Guests Count */}
                        <td className="whitespace-nowrap px-3 py-3 text-label text-ink">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Lucide.User size={14} className="text-ink-muted" />
                            <span>{r.adults + r.children}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusPill status={r.status} />
                        </td>

                        {/* Total */}
                        <td className="whitespace-nowrap px-3 py-3 text-right text-label font-bold text-ink tnum">
                          ₹{r.total.toLocaleString('en-IN')}.00
                        </td>

                        {/* Actions: Open & More */}
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="secondary"
                              type="button"
                              onClick={() => setOpenId(r.id)}
                            >
                              Open
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {slice.length === 0 && (
                <div className="py-12 text-center">
                  <Lucide.CalendarX size={36} className="mx-auto text-ink-disabled mb-2" />
                  <p className="text-label text-ink-secondary">No reservations match the selected filters.</p>
                  <Button variant="secondary"
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-3 hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>

            {/* ================= 6. PAGINATION FOOTER ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-divider bg-surface text-label">
              {/* Summary Count */}
              <p className="pms-helper">
                Page {safePage + 1} of {pages} · {filtered.length} reservations
              </p>

              {/* Right Controls: Rows per page & Pagination buttons */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-ink-secondary">
                  <span>Rows per page</span>
                  <SelectField
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="w-auto"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </SelectField>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1">
                  {/* Prev Button */}
                  <IconButton variant="ghost"
                    type="button"
                    disabled={safePage === 0}
                    aria-label="Previous page"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Lucide.ChevronLeft size={14} />
                  </IconButton>

                  {/* Page Number Buttons */}
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const isCurrent = safePage === i;
                    return (
                      <Button variant="secondary"
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        className={`flex w-8 items-center justify-center transition-all cursor-pointer ${isCurrent
 ? '!bg-[var(--color-primary)] !text-white shadow-xs'
 : 'border border-border bg-surface text-ink hover:bg-page'
 }`}
                      >
                        {i + 1}
                      </Button>
                    );
                  })}

                  {/* Next Button */}
                  <IconButton variant="ghost"
                    type="button"
                    disabled={safePage >= pages - 1}
                    aria-label="Next page"
                    onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Lucide.ChevronRight size={14} />
                  </IconButton>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ================= 7. RESERVATION DETAILS DRAWER ================= */}
      <Drawer
        open={openRow !== null}
        onClose={() => setOpenId(null)}
        title={openRow ? `Reservation ${openRow.id}` : ''}
        subtitle="Booking reference, stay, charges and actions"
      >
        {openRow && (
          <ReservationDrawer
            r={openRow}
            onClose={() => setOpenId(null)}
            onStatus={setRowStatus}
            onEdit={amendReservation}
            go={go}
          />
        )}
      </Drawer>

      {/* ================= 8. THEME SWATCHER MODAL ================= */}
    </div>
  );
}
