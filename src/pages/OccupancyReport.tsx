import { useState } from 'react';
import { TODAY } from '../data/mock';
import { Card, CardTitle } from '../components/ui';
import { BarChart, DonutChart } from '../components/charts';
import { Tabs } from '../components/controls';

const RANGES = ['7 days', '14 days', '30 days'] as const;

const DATA: Record<(typeof RANGES)[number], number[]> = {
  '7 days': [62, 70, 66, 74, 81, 78, 78],
  '14 days': [58, 62, 70, 66, 74, 81, 78, 78, 72, 69, 75, 80, 77, 79],
  '30 days': [55, 58, 62, 70, 66, 74, 81, 78, 78, 72, 69, 75, 80, 77, 79, 71, 68, 73, 76, 82, 78, 74, 70, 66, 72, 78, 81, 79, 83, 80],
};

export function OccupancyReport() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('7 days');
  const values = DATA[range];
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  const labels = values.map((_, i) => `D${i + 1}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Average occupancy', `${avg}%`],
          ['Peak night', `${Math.max(...values)}%`],
          ['Rooms sold (7d)', '812'],
          ['Available tonight', String(TODAY.available)],
        ].map(([k, v]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle
          title="Occupancy trend"
          subtitle="Demo sample — range updates the chart locally"
          action={<Tabs label="Date range" tabs={RANGES.map((r) => ({ id: r, label: r }))} active={range} onChange={setRange} />}
        />
        <BarChart label={`Occupancy over ${range}`} data={values.map((v, i) => ({ label: labels[i], value: v, highlight: i === values.length - 3 }))} />
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle title="Occupancy by segment" subtitle="Room-nights, last 7 days" />
          <DonutChart
            label="Room nights by segment"
            slices={[
              { label: 'Leisure', value: 412, color: 'var(--color-primary)' },
              { label: 'Corporate', value: 268, color: 'var(--color-soft)' },
              { label: 'Group', value: 132, color: 'var(--color-warning-text)' },
            ]}
          />
        </Card>
        <Card>
          <CardTitle title="Room performance" subtitle="Occupancy by type" />
          <div className="overflow-x-auto">
            <table className="pms-table min-w-[420px]">
              <thead><tr><th>Type</th><th className="text-right">Rooms</th><th className="text-right">Occ %</th></tr></thead>
              <tbody>
                {[['Standard', 58, 82], ['Deluxe', 46, 79], ['Family', 24, 71], ['Suite', 22, 86], ['Penthouse', 9, 44]].map(([t, n, o]) => (
                  <tr key={t as string}>
                    <td className="font-medium">{t}</td>
                    <td className="tnum text-right">{n}</td>
                    <td className="tnum text-right font-semibold">{o}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pms-helper mt-2">Figures are static samples, not live analytics.</p>
        </Card>
      </div>
    </div>
  );
}
