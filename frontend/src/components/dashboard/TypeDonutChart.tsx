import React, { memo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  DoughnutController,
  Tooltip,
} from 'chart.js';
import { MSG_TYPE_COLORS } from '../../lib/constants';

ChartJS.register(ArcElement, DoughnutController, Tooltip);

interface TypeDonutChartProps {
  typeCounts: Record<string, number>;
}

export const TypeDonutChart: React.FC<TypeDonutChartProps> = memo(({ typeCounts }) => {
  const sorted = Object.entries(typeCounts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([, v]) => v);
  const colors = sorted.map(([k]) => MSG_TYPE_COLORS[k] ?? '#64748b');

  if (values.length === 0) {
    return (
      <div
        style={{
          height: '190px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: '12px',
        }}
      >
        No data yet
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '190px', width: '190px', margin: '0 auto' }}>
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderColor: '#080c14',
              borderWidth: 2,
              hoverOffset: 4,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: true,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#161e2e',
              borderColor: '#1e2d45',
              borderWidth: 1,
              titleColor: '#e2e8f0',
              bodyColor: '#94a3b8',
              padding: 10,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}`,
              },
            },
          },
          animation: { duration: 400 },
        }}
      />
    </div>
  );
});

TypeDonutChart.displayName = 'TypeDonutChart';
