import { Badge, Card, CardTitle } from '../components/ui';
import { roomTone } from '../components/status';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';

const FLOORS = [1, 2, 3, 4, 5];

export function StatusBoard() {
  const resource = useApiResource(() => loadRoomInventory());
  const rooms = resource.data?.rooms ?? [];
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Card elevated>
          <CardTitle title="Live board" subtitle={resource.loading ? 'Loading room status…' : `${rooms.length} rooms · out-of-order rooms flagged`} />
          {resource.error ? <p role="alert" className="pms-helper">Could not load room status: {resource.error}</p> : null}
        <div className="pms-chip-row flex-wrap gap-2 sm:gap-x-5" aria-label="Legend">
          {['Available', 'Occupied', 'Dirty', 'Cleaning', 'Inspected', 'Out-of-service'].map((s) => (
            <span key={s} className="text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}><Badge tone={roomTone(s as never)}>{s}</Badge></span>
          ))}
        </div>
      </Card>
      {FLOORS.map((f) => {
        const floorRooms = rooms.filter((r) => r.floor === f);
        if (floorRooms.length === 0) return null;
        return (
          <Card key={f}>
            <CardTitle title={`Floor ${f}`} subtitle={`${floorRooms.length} rooms`} />
            <div className="grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
              {floorRooms.map((r) => {
                const oos = r.status === 'Out-of-service';
                return (
                  <div
                    key={r.number}
                    title={`Room ${r.number} · ${r.type} · ${r.status}${r.guest ? ` · ${r.guest}` : ''}`}
                    className="min-w-0 rounded-[12px] border p-2.5 text-center transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      borderColor: oos ? 'var(--color-danger-border)' : 'var(--color-border)',
                      background: oos ? 'var(--color-danger-bg)' : 'color-mix(in srgb, var(--color-muted-surface) 72%, white)',
                      boxShadow: oos ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    }}
                  >
                    <p className="tnum text-[15px] font-semibold" style={{ color: oos ? 'var(--color-danger-text)' : 'var(--color-ink)' }}>{r.number}</p>
                    <p className="mt-0.5 truncate text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: oos ? 'var(--color-danger-text)' : 'var(--color-ink-secondary)' }}>
                      {r.status === 'Out-of-service' ? 'OOS' : r.status}
                    </p>
                    <p className="tnum truncate text-[10.5px]" style={{ color: 'var(--color-ink-muted)' }}>{r.guest ?? r.type}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
