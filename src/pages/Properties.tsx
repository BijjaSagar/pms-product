import { PROPERTY } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { toast } from '../components/toastStore';

const BRANCHES = [
  { name: 'TriponX House', place: 'Lakeshore · flagship', rooms: 159, occ: '78%', current: true },
  { name: 'TriponX Court', place: 'Old Town · suites', rooms: 84, occ: '71%', current: false },
  { name: 'TriponX Bay', place: 'Harbour · seasonal', rooms: 62, occ: '64%', current: false },
];

export function Properties() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle title="Properties" subtitle="Branches in the group · demo overview" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {BRANCHES.map((b) => (
            <article key={b.name} className="rounded-[12px] border p-4" style={{ borderColor: b.current ? 'var(--color-primary)' : 'var(--color-border)', background: b.current ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-brand text-[18px] font-bold" style={{ color: 'var(--color-ink)' }}>{b.name}</p>
                  <p className="text-[12.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{b.place}</p>
                </div>
                {b.current ? <Badge tone="success">Current</Badge> : <Badge tone="neutral">Branch</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-[8px] border p-2" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="tnum text-[16px] font-semibold" style={{ color: 'var(--color-ink)' }}>{b.rooms}</p>
                  <p className="pms-helper">Rooms</p>
                </div>
                <div className="rounded-[8px] border p-2" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="tnum text-[16px] font-semibold" style={{ color: 'var(--color-ink)' }}>{b.occ}</p>
                  <p className="pms-helper">Occupancy</p>
                </div>
              </div>
              {!b.current ? (
                <button type="button" className="pms-btn-ghost mt-3 w-full px-3 py-2" onClick={() => toast('Branch switching (demo)', { detail: 'Multi-property context connects in the full build.', tone: 'info' })}>
                  Switch context
                </button>
              ) : (
                <p className="pms-helper mt-3">Signed in here · {PROPERTY.address}.</p>
              )}
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
