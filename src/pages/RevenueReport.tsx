import { useState } from 'react';
import { TODAY } from '../data/mock';
import { Card, CardTitle } from '../components/ui';
import { BarChart } from '../components/charts';
import { Tabs } from '../components/controls';

const RANGES = ['7 days', '14 days', '30 days'] as const;

const REV: Record<(typeof RANGES)[number], number[]> = {
  '7 days': [32, 38, 35, 44, 52, 48, 41],
  '14 days': [30, 32, 38, 35, 44, 52, 48, 41, 39, 42, 46, 50, 47, 44],
  '30 days': [28, 30, 32, 38, 35, 44, 52, 48, 41, 39, 42, 46, 50, 47, 44, 40, 38, 41, 45, 49, 52, 48, 43, 39, 36, 40, 46, 51, 49, 45],
};

export function RevenueReport() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('7 days');
  const values = REV[range];
  const sum = values.reduce((s, v) => s + v, 0);
  const revpar = Math.round((TODAY.adr * TODAY.occupancyPct) / 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Revenue (' + range + ')', `$${sum}k`], ['ADR', `$${TODAY.adr}`], ['RevPAR', `$${revpar}`], ['Outstanding', '$3.9k']].map(([k, v]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle
          title="Revenue trend"
          subtitle="Room revenue in $k · demo sample"
          action={<Tabs label="Date range" tabs={RANGES.map((r) => ({ id: r, label: r }))} active={range} onChange={setRange} />}
        />
        <BarChart label={`Revenue over ${range}`} data={values.map((v, i) => ({ label: `D${i + 1}`, value: v, highlight: v === Math.max(...values) }))} />
      </Card>
      <Card>
        <CardTitle title="Revenue by department" subtitle="Last 7 days, $k" />
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[480px]">
            <thead><tr><th>Department</th><th className="text-right">Revenue</th><th className="text-right">Share</th></tr></thead>
            <tbody>
              {[['Rooms', 242, '78%'], ['Food & beverage', 48, '15%'], ['Other (laundry, transfers)', 21, '7%']].map(([d, v, s]) => (
                <tr key={d as string}>
                  <td className="font-medium">{d}</td>
                  <td className="tnum text-right font-semibold">${v}k</td>
                  <td className="tnum text-right" style={{ color: 'var(--color-ink-secondary)' }}>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
