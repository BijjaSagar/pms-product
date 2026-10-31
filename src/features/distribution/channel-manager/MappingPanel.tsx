import * as Lucide from 'lucide-react';
import { ROOM_TYPES } from './data';
import type { Channel, RateMapping } from './types';

interface Props {
  mappings: RateMapping[];
  channels: Channel[];
  onChange: (id: string, field: keyof RateMapping, value: string) => void;
  onAdd: () => void;
  onSave: () => void;
}

const RATE_PLANS = ['Best Available Rate', 'Room Only', 'Breakfast Included', 'Half Board', 'Advance Purchase', 'Member Discount', 'Corporate Rate'];

export function MappingPanel({ mappings, channels, onChange, onAdd, onSave }: Props) {
  return (
    <section className="pms-card overflow-hidden" aria-labelledby="mapping-title">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
            <Lucide.GitMerge size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="mapping-title" className="text-body font-bold text-ink tracking-tight">Room & Rate Mapping</h2>
            <p className="text-label text-ink-muted mt-0.5">Match internal inventory and rate plans to each channel’s product codes</p>
          </div>
        </div>
        <div className="flex gap-2"><button type="button" onClick={onAdd} className="pms-btn-ghost min-h-[38px] px-3 py-1.5 text-label"><Lucide.Plus size={14} /> Add mapping</button><button type="button" onClick={onSave} className="pms-btn-primary min-h-[38px] px-3 py-1.5 text-label"><Lucide.Upload size={14} /> Save mappings</button></div>
      </div>
      <div className="pms-table-scroll overflow-x-auto">
        <table className="pms-table min-w-[850px]">
          <thead><tr><th>Channel</th><th>Room type</th><th>Rate plan</th><th>External code</th><th>Status</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {mappings.map((mapping) => {
              return (
                <tr key={mapping.id}>
                  <td><select value={mapping.channelId} onChange={(event) => onChange(mapping.id, 'channelId', event.target.value)} aria-label={`Channel for mapping ${mapping.id}`} className="pms-input min-h-[34px] min-w-[140px] px-2 py-1 text-label">{channels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                  <td><select value={mapping.roomType} onChange={(event) => onChange(mapping.id, 'roomType', event.target.value)} aria-label={`Room type for mapping ${mapping.id}`} className="pms-input min-h-[34px] min-w-[130px] px-2 py-1 text-label">{ROOM_TYPES.map((roomType) => <option key={roomType}>{roomType}</option>)}</select></td>
                  <td><select value={mapping.ratePlan} onChange={(event) => onChange(mapping.id, 'ratePlan', event.target.value)} aria-label={`Rate plan for mapping ${mapping.id}`} className="pms-input min-h-[34px] min-w-[170px] px-2 py-1 text-label">{RATE_PLANS.map((plan) => <option key={plan}>{plan}</option>)}</select></td>
                  <td><input value={mapping.externalCode} onChange={(event) => onChange(mapping.id, 'externalCode', event.target.value)} aria-label={`External code for mapping ${mapping.id}`} className="pms-input min-h-[34px] min-w-[150px] px-2 py-1 font-mono text-label" /></td>
                  <td><span className={`inline-flex items-center gap-1.5 text-label font-semibold ${mapping.status === 'Mapped' ? 'text-success-text' : 'text-warning-text'}`}><span className={`h-1.5 w-1.5 rounded-full ${mapping.status === 'Mapped' ? 'bg-success-text' : 'bg-warning-text'}`} />{mapping.status}</span></td>
                  <td className="text-right"><button type="button" onClick={() => onChange(mapping.id, 'status', mapping.status === 'Mapped' ? 'Needs review' : 'Mapped')} className="text-label font-semibold text-primary hover:underline">{mapping.status === 'Mapped' ? 'Review' : 'Mark mapped'}</button></td>
                </tr>
              );
            })}
            {mappings.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-label text-ink-muted">No mappings configured.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-start gap-2 border-t px-4 py-3 text-label text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}><Lucide.Info size={13} className="mt-0.5 flex-none" /><span>Mapping changes are a local demo and do not update external channel services.</span></div>
    </section>
  );
}
