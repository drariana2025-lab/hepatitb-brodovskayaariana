import { useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { FilterBar } from '@/components/FilterBar';
import { Footer } from '@/components/Footer';
import { COLORS } from '@/data/hepatitisData';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label,
} from 'recharts';

export default function RiskFactorsPage() {
  const { filteredData } = useFilters();

  const radarData = useMemo(() => {
    const byCountry = new Map<string, { smoking: number[]; malnutrition: number[]; urbanization: number[] }>();
    filteredData.forEach(d => {
      if (!byCountry.has(d.country)) byCountry.set(d.country, { smoking: [], malnutrition: [], urbanization: [] });
      const c = byCountry.get(d.country)!;
      c.smoking.push(d.smoking); c.malnutrition.push(d.malnutrition); c.urbanization.push(d.urbanization);
    });
    const countriesList = Array.from(byCountry.keys());
    const metrics = ['Курение', 'Недоедание', 'Урбанизация'];
    return metrics.map(metric => {
      const row: Record<string, string | number> = { metric };
      countriesList.forEach(c => {
        const vals = byCountry.get(c)!;
        const arr = metric === 'Курение' ? vals.smoking : metric === 'Недоедание' ? vals.malnutrition : vals.urbanization;
        row[c] = +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
      });
      return row;
    });
  }, [filteredData]);

  const gdpVsCases = useMemo(() => {
    const byCountry = new Map<string, { gdp: number; cases: number; count: number }>();
    filteredData.forEach(d => {
      if (!byCountry.has(d.country)) byCountry.set(d.country, { gdp: 0, cases: 0, count: 0 });
      const c = byCountry.get(d.country)!;
      c.gdp += d.gdpPerCapita; c.cases += d.cases; c.count++;
    });
    return Array.from(byCountry.entries()).map(([country, v]) => ({
      country,
      gdp: Math.round(v.gdp / v.count),
      cases: Math.round(v.cases / v.count),
    })).sort((a, b) => a.gdp - b.gdp);
  }, [filteredData]);

  const correlationData = useMemo(() => {
    const fields = [
      { key: 'vaccinationCoverage' as const, label: 'Вакцинация' },
      { key: 'healthcareAccess' as const, label: 'Доступ к медицине' },
      { key: 'smoking' as const, label: 'Курение' },
      { key: 'malnutrition' as const, label: 'Недоедание' },
      { key: 'urbanization' as const, label: 'Урбанизация' },
      { key: 'treatmentSuccess' as const, label: 'Успешность лечения' },
    ];
    const corr = (a: number[], b: number[]) => {
      const n = a.length;
      const ma = a.reduce((s, v) => s + v, 0) / n;
      const mb = b.reduce((s, v) => s + v, 0) / n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) {
        num += (a[i] - ma) * (b[i] - mb);
        da += (a[i] - ma) ** 2;
        db += (b[i] - mb) ** 2;
      }
      return da && db ? +(num / Math.sqrt(da * db)).toFixed(2) : 0;
    };
    const values = fields.map(f => filteredData.map(d => d[f.key]));
    const result: { row: string; col: string; value: number }[] = [];
    for (let i = 0; i < fields.length; i++) {
      for (let j = 0; j < fields.length; j++) {
        result.push({ row: fields[i].label, col: fields[j].label, value: corr(values[i], values[j]) });
      }
    }
    return { matrix: result, labels: fields.map(f => f.label) };
  }, [filteredData]);

  const countriesInData = [...new Set(filteredData.map(d => d.country))];

  const getHeatColor = (v: number) => {
    if (v >= 0.7) return '#2D9F5F';
    if (v >= 0.3) return '#7BC67E';
    if (v >= -0.3) return '#F5F5F5';
    if (v >= -0.7) return '#F4A582';
    return '#E74C3C';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title">Факторы риска</h1>
      <FilterBar />
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">Radar: Курение, Недоедание, Урбанизация</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" fontSize={12} />
              <PolarRadiusAxis fontSize={10} />
              {countriesInData.map((c, i) => (
                <Radar key={c} name={c} dataKey={c} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">ВВП на душу vs Заболеваемость</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={gdpVsCases}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" fontSize={10} angle={-20} textAnchor="end" height={50}>
                <Label value="Страна" position="insideBottom" offset={-3} fontSize={12} />
              </XAxis>
              <YAxis yAxisId="left" fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}>
                <Label value="ВВП на душу (USD)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fontSize={12} />
              </YAxis>
              <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}>
                <Label value="Случаи (среднее)" angle={90} position="insideRight" style={{ textAnchor: 'middle' }} fontSize={12} />
              </YAxis>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              <Bar yAxisId="left" dataKey="gdp" fill="#2C7DA0" name="ВВП на душу ($)" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="right" dataKey="cases" fill="#E74C3C" name="Случаи (среднее)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-container">
        <h3 className="section-title mb-3">Тепловая карта корреляций</h3>
        <div className="overflow-x-auto">
          <table className="mx-auto border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-xs text-muted-foreground"></th>
                {correlationData.labels.map(l => <th key={l} className="p-2 text-xs font-medium text-foreground">{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {correlationData.labels.map(row => (
                <tr key={row}>
                  <td className="p-2 text-xs font-medium text-foreground whitespace-nowrap">{row}</td>
                  {correlationData.labels.map(col => {
                    const val = correlationData.matrix.find(m => m.row === row && m.col === col)?.value ?? 0;
                    return (
                      <td key={col} className="p-2 text-center text-xs font-mono font-medium" style={{
                        backgroundColor: getHeatColor(val),
                        color: Math.abs(val) > 0.5 ? '#fff' : '#333',
                        minWidth: '60px',
                      }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
