import { Button, IconButton, ListItem, SelectField } from '../../../components/primitives';
import * as Lucide from 'lucide-react';
import { ROOM_TYPES } from './data';
import type { InventoryDate, InventoryRow, InventorySelection } from './types';

interface Props {
  dates: InventoryDate[];
  rows: InventoryRow[];
  roomFilter: string;
  dateLabel: string;
  lastUpdatedLabel: string;
  onRoomFilterChange: (roomType: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectCell: (selection: InventorySelection) => void;
}

function availabilityStyle(available: number, total: number) {
  const ratio = total > 0 ? available / total : 0;
  if (available === 0) return { background: 'var(--color-ink)', color: 'var(--color-surface)', label: 'Sold out' };
  if (ratio >= 0.7) return { background: 'var(--color-success-bg)', color: 'var(--color-success-text)', label: 'High availability' };
  if (ratio >= 0.4) return { background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', label: 'Moderate availability' };
  return { background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', label: 'Low availability' };
}

export function InventoryPanel({ dates, rows, roomFilter, dateLabel, lastUpdatedLabel, onRoomFilterChange, onPrevious, onNext, onToday, onSelectCell }: Props) {
  const visibleRows = rows.filter((row) => roomFilter === 'all' || row.roomType.toLowerCase() === roomFilter);
  const totalInventory = visibleRows.reduce((sum, row) => sum + row.totalRooms, 0);

  return (
    <section className="pms-card overflow-hidden" aria-labelledby="inventory-calendar-title">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
            <Lucide.CalendarDays size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="inventory-calendar-title" className="text-body font-bold text-ink tracking-tight">Availability Calendar</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-micro font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Live Feed
              </span>
            </div>
            <p className="text-label text-ink-muted mt-0.5">{totalInventory} rooms · Select a cell to edit channel availability</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label>
            <span className="sr-only">Filter inventory by room type</span>
            <SelectField value={roomFilter} onChange={(event) => onRoomFilterChange(event.target.value)} className="min-w-[145px]">
              <option value="all">All room types</option>
              {ROOM_TYPES.map((roomType) => <option key={roomType} value={roomType.toLowerCase()}>{roomType}</option>)}
            </SelectField>
          </label>
          <div className="flex items-center gap-1 rounded-control border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <IconButton variant="ghost" type="button" onClick={onPrevious} aria-label="Previous 15 days" className="flex items-center justify-center"><Lucide.ChevronLeft size={16} /></IconButton>
            <span className="min-w-[145px] text-center text-label font-semibold text-ink" aria-live="polite">{dateLabel}</span>
            <IconButton variant="ghost" type="button" onClick={onNext} aria-label="Next 15 days" className="flex items-center justify-center"><Lucide.ChevronRight size={16} /></IconButton>
          </div>
          <Button variant="secondary" type="button" onClick={onToday} >Today</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-micro font-medium text-ink-secondary sm:px-5">
        {[
          { label: 'High ≥70%', color: 'var(--color-success-text)' },
          { label: 'Moderate 40–69%', color: 'var(--color-warning-text)' },
          { label: 'Low <40%', color: 'var(--color-danger-text)' },
          { label: 'Sold out', color: 'var(--color-ink)' },
        ].map((legend) => <span key={legend.label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: legend.color }} />{legend.label}</span>)}
      </div>

      <div className="grid gap-2 border-t p-3 sm:hidden" style={{ borderColor: 'var(--color-divider)' }}>
        {visibleRows.map((row) => (
          <section key={row.roomType} className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }} aria-label={`${row.roomType} availability`}>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-label font-bold text-ink">{row.roomType}</h3><span className="text-micro text-ink-muted">{row.totalRooms} rooms</span></div>
            <div className="grid grid-cols-5 gap-1.5">
              {dates.map((date, index) => {
                const available = row.availability[index] ?? 0;
                const tone = availabilityStyle(available, row.totalRooms);
                return <button key={date.iso} type="button" onClick={() => onSelectCell({ roomType: row.roomType, date, available, total: row.totalRooms })} title={`${date.weekday}, ${date.month} ${date.day}: ${available}/${row.totalRooms} rooms`} aria-label={`${row.roomType}, ${date.month} ${date.day}: ${available} of ${row.totalRooms} rooms available`} className="flex min-h-[48px] flex-col items-center justify-center rounded-control transition-transform active:scale-95" style={{ background: tone.background, color: tone.color }}><span className="text-micro font-medium opacity-80">{date.day}</span><span className="text-label font-bold tnum">{available}</span></button>;
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="pms-table-scroll hidden overflow-x-auto border-t sm:block" style={{ borderColor: 'var(--color-divider)' }}>
        <table className="pms-matrix-table min-w-[1040px] w-full border-collapse text-label">
          <thead><tr>
            <th className="sticky left-0 z-20 min-w-[140px] border-r px-4 py-3 text-left text-micro font-bold uppercase tracking-wider text-ink-muted" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>Room type</th>
            <th className="min-w-[72px] border-r px-2 py-3 text-center text-micro font-bold uppercase tracking-wider text-ink-muted" style={{ borderColor: 'var(--color-divider)' }}>Total</th>
            {dates.map((date) => <th key={date.iso} className={`min-w-[48px] border-r px-1 py-2 text-center ${date.isWeekend ? 'bg-primary/5' : ''}`} style={{ borderColor: 'var(--color-divider)' }}><span className="block text-micro font-medium text-ink-muted">{date.weekday}</span><span className="block text-body font-bold text-ink">{date.day}</span><span className="block text-micro text-ink-muted">{date.month}</span></th>)}
          </tr></thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.roomType} className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
                <th scope="row" className="sticky left-0 z-10 border-r px-4 py-3 text-left font-semibold text-ink" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>{row.roomType}</th>
                <td className="border-r px-2 py-3 text-center font-semibold text-ink-secondary tnum" style={{ borderColor: 'var(--color-divider)' }}>{row.totalRooms}</td>
                {row.availability.map((available, index) => {
                  const date = dates[index];
                  const tone = availabilityStyle(available, row.totalRooms);
                  return (
                    <td key={date.iso} className="border-r p-0.5" style={{ borderColor: 'var(--color-divider)' }}>
                      <ListItem type="button" onClick={() => onSelectCell({ roomType: row.roomType, date, available, total: row.totalRooms })} className="flex w-full items-center justify-center text-label font-bold tnum transition-transform hover:scale-[1.04] focus-visible:z-10" style={{ background: tone.background, color: tone.color }} aria-label={`${row.roomType}: ${available} of ${row.totalRooms} rooms available on ${date.weekday}, ${date.month} ${date.day}. ${tone.label}`} title={`${available}/${row.totalRooms} rooms · ${tone.label}`}>
                        {available}
                      </ListItem>
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleRows.length === 0 && <tr><td colSpan={dates.length + 2} className="py-10 text-center text-label text-ink-muted">No room types match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-label text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
        <span>Availability shown is the channel inventory limit.</span><span>Last sync {lastUpdatedLabel}</span>
      </div>
    </section>
  );
}
