import { useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { FilterBar } from '@/components/FilterBar';
import { COLORS } from '@/data/hepatitisData';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts';

export default function HealthcarePage() {
  const { filteredData } = useFilters();

  const boxPlotData = useMemo(() => {
    const byIncome = new Map<string, number[]>();
    filteredData.forEach(d => {
      if (!byIncome.has(d.incomeLevel)) byIncome.set(d.incomeLevel, []);
      byIncome.get(d.incomeLevel)!.push(d.treatmentSuccess);
    });
    return Array.from(byIncome.entries()).map(([income, vals]) => {
      const sorted = [...vals].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const median = sorted[Math.floor(sorted.length * 0.5)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
      return { income, min, q1, median, q3, max, avg, count: vals.length };
    });
  }, [filteredData]);

  const bubbleData = useMemo(() => {
    const byCountry = new Map<string, { doctors: number[]; treatment: number[]; facilities: number[] }>();
    filteredData.forEach(d => {
      if (!byCountry.has(d.country)) byCountry.set(d.country, { doctors: [], treatment: [], facilities: [] });
      const c = byCountry.get(d.country)!;
      c.doctors.push(d.doctorsPer100k); c.treatment.push(d.treatmentSuccess); c.facilities.push(d.facilitiesPerMln);
    });
    return Array.from(byCountry.entries()).map(([country, v]) => ({
      country,
      doctors: +(v.doctors.reduce((a, b) => a + b, 0) / v.doctors.length).toFixed(2),
      treatment: +(v.treatment.reduce((a, b) => a + b, 0) / v.treatment.length).toFixed(1),
      facilities: +(v.facilities.reduce((a, b) => a + b, 0) / v.facilities.length).toFixed(2),
    }));
  }, [filteredData]);

  const accessData = useMemo(() => {
    return filteredData.map(d => ({
      access: d.healthcareAccess,
      treatment: d.treatmentSuccess,
      country: d.country,
    }));
  }, [filteredData]);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title">Эффективность здравоохранения</h1>
      <FilterBar />
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">Успешность лечения по уровням дохода</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={boxPlotData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="income" fontSize={11} />
              <YAxis domain={[60, 100]} fontSize={11} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Bar dataKey="min" fill="#E74C3C" name="Мин" radius={[2, 2, 0, 0]} />
              <Bar dataKey="median" fill="#2C7DA0" name="Медиана" radius={[2, 2, 0, 0]} />
              <Bar dataKey="max" fill="#2D9F5F" name="Макс" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">Врачи vs Успешность лечения</h3>
          <p className="text-xs text-muted-foreground mb-2">Размер = учреждения на млн</p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="doctors" name="Врачи на 100тыс" fontSize={11} />
              <YAxis dataKey="treatment" name="Успешность (%)" domain={[65, 100]} fontSize={11} />
              <ZAxis dataKey="facilities" range={[50, 500]} name="Учреждения на млн" />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Scatter data={bubbleData} fill="#2C7DA0">
                {bubbleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-container">
        <h3 className="section-title mb-3">Доступ к медицине vs Успешность лечения</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="access" name="Доступ к медицине (%)" fontSize={11} />
            <YAxis dataKey="treatment" name="Успешность лечения (%)" domain={[60, 100]} fontSize={11} />
            <ZAxis range={[40, 40]} />
            <Tooltip />
            <Scatter data={accessData} fill="#2D9F5F" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
