import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { FilterBar } from '@/components/FilterBar';
import { COLORS } from '@/data/hepatitisData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  LineChart, Line,
  PieChart, Pie,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from 'recharts';

export default function ChartsPage() {
  const { filteredData, setDetailCountry } = useFilters();
  const [radarCountry, setRadarCountry] = useState('');
  const countriesInData = [...new Set(filteredData.map(d => d.country))];

  // 1. Bar Chart — Топ-10 по случаям
  const barTop10 = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => map.set(d.country, (map.get(d.country) || 0) + d.cases));
    return Array.from(map.entries()).map(([country, cases]) => ({ country, cases })).sort((a, b) => b.cases - a.cases).slice(0, 10);
  }, [filteredData]);

  // 2. Line Chart — Динамика заболеваемости
  const lineData = useMemo(() => {
    const byYear = new Map<number, Map<string, number>>();
    filteredData.forEach(d => {
      if (!byYear.has(d.year)) byYear.set(d.year, new Map());
      byYear.get(d.year)!.set(d.country, (byYear.get(d.year)!.get(d.country) || 0) + d.cases);
    });
    return Array.from(byYear.entries()).map(([year, cm]) => {
      const row: Record<string, number> = { year };
      countriesInData.forEach(c => { row[c] = cm.get(c) || 0; });
      return row;
    }).sort((a, b) => a.year - b.year);
  }, [filteredData, countriesInData]);

  // 3. Pie Chart — Распределение по регионам
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => map.set(d.region, (map.get(d.region) || 0) + d.cases));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // 4. Scatter — ВВП vs успешность лечения
  const scatterGdp = useMemo(() => {
    const map = new Map<string, { gdp: number[]; ts: number[] }>();
    filteredData.forEach(d => {
      if (!map.has(d.country)) map.set(d.country, { gdp: [], ts: [] });
      const c = map.get(d.country)!;
      c.gdp.push(d.gdpPerCapita); c.ts.push(d.treatmentSuccess);
    });
    return Array.from(map.entries()).map(([country, v]) => ({
      country, gdp: +(v.gdp.reduce((a, b) => a + b, 0) / v.gdp.length).toFixed(0),
      treatment: +(v.ts.reduce((a, b) => a + b, 0) / v.ts.length).toFixed(1),
    }));
  }, [filteredData]);

  // 5. Histogram — Распределение вакцинации
  const histData = useMemo(() => {
    const bins = [
      { range: '<50%', min: 0, max: 50, count: 0 },
      { range: '50-60%', min: 50, max: 60, count: 0 },
      { range: '60-70%', min: 60, max: 70, count: 0 },
      { range: '70-80%', min: 70, max: 80, count: 0 },
      { range: '80-90%', min: 80, max: 90, count: 0 },
      { range: '≥90%', min: 90, max: 101, count: 0 },
    ];
    filteredData.forEach(d => {
      const b = bins.find(b => d.vaccinationCoverage >= b.min && d.vaccinationCoverage < b.max);
      if (b) b.count++;
    });
    return bins;
  }, [filteredData]);

  // 6. Box Plot (simplified as bar with min/median/max)
  const boxPlotData = useMemo(() => {
    const byIncome = new Map<string, number[]>();
    filteredData.forEach(d => {
      if (!byIncome.has(d.incomeLevel)) byIncome.set(d.incomeLevel, []);
      byIncome.get(d.incomeLevel)!.push(d.complicatedCases);
    });
    return Array.from(byIncome.entries()).map(([income, vals]) => {
      const sorted = [...vals].sort((a, b) => a - b);
      return {
        income,
        min: sorted[0],
        median: sorted[Math.floor(sorted.length / 2)],
        max: sorted[sorted.length - 1],
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      };
    });
  }, [filteredData]);

  // 7. Heatmap — корреляции
  const correlationData = useMemo(() => {
    const fields = [
      { key: 'vaccinationCoverage' as const, label: 'Вакцинация' },
      { key: 'healthcareAccess' as const, label: 'Доступ' },
      { key: 'smoking' as const, label: 'Курение' },
      { key: 'malnutrition' as const, label: 'Недоедание' },
      { key: 'treatmentSuccess' as const, label: 'Лечение' },
      { key: 'mortalityPer100k' as const, label: 'Смертн./100тыс' },
    ];
    const corr = (a: number[], b: number[]) => {
      const n = a.length; const ma = a.reduce((s, v) => s + v, 0) / n; const mb = b.reduce((s, v) => s + v, 0) / n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
      return da && db ? +(num / Math.sqrt(da * db)).toFixed(2) : 0;
    };
    const values = fields.map(f => filteredData.map(d => d[f.key]));
    const matrix: { row: string; col: string; value: number }[] = [];
    for (let i = 0; i < fields.length; i++)
      for (let j = 0; j < fields.length; j++)
        matrix.push({ row: fields[i].label, col: fields[j].label, value: corr(values[i], values[j]) });
    return { matrix, labels: fields.map(f => f.label) };
  }, [filteredData]);

  // 8. Bubble — Вакцинация vs Смертность (размер = население)
  const bubbleData = useMemo(() => {
    const map = new Map<string, { vacc: number[]; mort: number[]; pop: number[] }>();
    filteredData.forEach(d => {
      if (!map.has(d.country)) map.set(d.country, { vacc: [], mort: [], pop: [] });
      const c = map.get(d.country)!;
      c.vacc.push(d.vaccinationCoverage); c.mort.push(d.mortalityPer100k); c.pop.push(d.population);
    });
    return Array.from(map.entries()).map(([country, v]) => ({
      country,
      vaccination: +(v.vacc.reduce((a, b) => a + b, 0) / v.vacc.length).toFixed(1),
      mortality: +(v.mort.reduce((a, b) => a + b, 0) / v.mort.length).toFixed(2),
      population: Math.round(v.pop.reduce((a, b) => a + b, 0) / v.pop.length),
    }));
  }, [filteredData]);

  // 9. Area Chart — Заболеваемость по регионам по годам
  const areaData = useMemo(() => {
    const regs = [...new Set(filteredData.map(d => d.region))];
    const byYear = new Map<number, Map<string, number>>();
    filteredData.forEach(d => {
      if (!byYear.has(d.year)) byYear.set(d.year, new Map());
      byYear.get(d.year)!.set(d.region, (byYear.get(d.year)!.get(d.region) || 0) + d.cases);
    });
    return { regs, data: Array.from(byYear.entries()).map(([year, rm]) => {
      const row: Record<string, number> = { year };
      regs.forEach(r => { row[r] = rm.get(r) || 0; });
      return row;
    }).sort((a, b) => a.year - b.year) };
  }, [filteredData]);

  // 10. Radar — Профиль страны
  const radarData = useMemo(() => {
    const c = radarCountry || countriesInData[0];
    if (!c) return [];
    const recs = filteredData.filter(d => d.country === c);
    if (!recs.length) return [];
    const avg = (fn: (d: typeof recs[0]) => number) => +(recs.reduce((s, d) => s + fn(d), 0) / recs.length).toFixed(1);
    return [
      { metric: 'Вакцинация', value: avg(d => d.vaccinationCoverage) },
      { metric: 'Лечение', value: avg(d => d.treatmentSuccess) },
      { metric: 'Доступ', value: avg(d => d.healthcareAccess) },
      { metric: 'Профилактика', value: avg(d => d.preventionIndex) },
      { metric: 'Скрининг крови', value: avg(d => d.bloodScreening) },
      { metric: 'Безоп. инъекции', value: avg(d => d.safeInjections) },
    ];
  }, [filteredData, radarCountry, countriesInData]);

  // 11. Treemap — Иерархия по случаям
  const treemapData = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => map.set(d.country, (map.get(d.country) || 0) + d.cases));
    return Array.from(map.entries()).map(([name, size]) => ({ name, size }));
  }, [filteredData]);

  const getHeatColor = (v: number) => {
    if (v >= 0.7) return '#2D9F5F';
    if (v >= 0.3) return '#7BC67E';
    if (v >= -0.3) return '#F5F5F5';
    if (v >= -0.7) return '#F4A582';
    return '#E74C3C';
  };

  const fmtNum = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, index } = props;
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} rx={4} />
        {width > 50 && height > 30 && (
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={11} fontWeight={500}>
            {name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title">Визуализация — 11 типов графиков</h1>
      <FilterBar />

      {/* Row 1: Bar + Line */}
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">1. Топ-10 стран по случаям</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barTop10}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" fontSize={10} angle={-15} textAnchor="end" height={45} />
              <YAxis fontSize={11} tickFormatter={fmtNum} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Bar dataKey="cases" name="Случаи" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}
                onClick={(d) => setDetailCountry(d.country)} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">2. Динамика заболеваемости по годам</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={fmtNum} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              {countriesInData.map((c, i) => (
                <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Pie + Scatter */}
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">3. Распределение по регионам</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">4. ВВП vs Успешность лечения</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="gdp" name="ВВП на душу ($)" fontSize={11} />
              <YAxis dataKey="treatment" name="Успешность (%)" domain={[60, 100]} fontSize={11} />
              <ZAxis range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterGdp} fill="hsl(var(--primary))">
                {scatterGdp.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Histogram + Box Plot */}
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">5. Распределение вакцинации</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={histData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" name="Кол-во записей" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">6. Осложнения по уровням дохода</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={boxPlotData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="income" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={fmtNum} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              <Bar dataKey="min" fill="#E74C3C" name="Мин" radius={[2, 2, 0, 0]} />
              <Bar dataKey="median" fill="hsl(var(--primary))" name="Медиана" radius={[2, 2, 0, 0]} />
              <Bar dataKey="max" fill="hsl(var(--accent))" name="Макс" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Heatmap + Bubble */}
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">7. Корреляция факторов</h3>
          <div className="overflow-x-auto">
            <table className="mx-auto border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs" />
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
                          backgroundColor: getHeatColor(val), color: Math.abs(val) > 0.5 ? '#fff' : '#333', minWidth: 55,
                        }}>{val}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">8. Вакцинация vs Смертность (размер = население)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="vaccination" name="Вакцинация (%)" fontSize={11} />
              <YAxis dataKey="mortality" name="Смертн./100тыс" fontSize={11} />
              <ZAxis dataKey="population" range={[50, 800]} name="Население" />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Scatter data={bubbleData} fill="hsl(var(--primary))">
                {bubbleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5: Area + Radar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">9. Заболеваемость по регионам (Area)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={fmtNum} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              {areaData.regs.map((r, i) => (
                <Area key={r} type="monotone" dataKey={r} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">10. Профиль здравоохранения</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Страна:</span>
            <Select value={radarCountry || countriesInData[0] || ''} onValueChange={setRadarCountry}>
              <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {countriesInData.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" fontSize={10} />
              <PolarRadiusAxis domain={[0, 100]} fontSize={9} />
              <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name={radarCountry || countriesInData[0] || ''} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 6: Treemap */}
      <div className="chart-container">
        <h3 className="section-title mb-3">11. Иерархия стран по числу случаев (Treemap)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap data={treemapData} dataKey="size" nameKey="name" content={<CustomTreemapContent />}>
            <Tooltip formatter={(v: number) => v.toLocaleString()} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
