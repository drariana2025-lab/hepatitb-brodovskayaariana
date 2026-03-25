import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { FilterBar } from '@/components/FilterBar';
import { Footer } from '@/components/Footer';
import { COLORS } from '@/data/hepatitisData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Label,
  LineChart, Line,
  PieChart, Pie,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from 'recharts';

const cts = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' };
const tickStyle = { fill: 'hsl(var(--chart-text))' };

export default function ChartsPage() {
  const { filteredData, setDetailCountry } = useFilters();
  const [radarCountry, setRadarCountry] = useState('');
  const countriesInData = [...new Set(filteredData.map(d => d.country))];

  const barTop10 = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => map.set(d.country, (map.get(d.country) || 0) + d.cases));
    return Array.from(map.entries()).map(([country, cases]) => ({ country, cases })).sort((a, b) => b.cases - a.cases).slice(0, 10);
  }, [filteredData]);

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

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => map.set(d.region, (map.get(d.region) || 0) + d.cases));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

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

  const histData = useMemo(() => {
    const bins = [
      { range: '<50%', min: 0, max: 50, count: 0 }, { range: '50-60%', min: 50, max: 60, count: 0 },
      { range: '60-70%', min: 60, max: 70, count: 0 }, { range: '70-80%', min: 70, max: 80, count: 0 },
      { range: '80-90%', min: 80, max: 90, count: 0 }, { range: '≥90%', min: 90, max: 101, count: 0 },
    ];
    filteredData.forEach(d => { const b = bins.find(b => d.vaccinationCoverage >= b.min && d.vaccinationCoverage < b.max); if (b) b.count++; });
    return bins;
  }, [filteredData]);

  const boxPlotData = useMemo(() => {
    const byIncome = new Map<string, number[]>();
    filteredData.forEach(d => { if (!byIncome.has(d.incomeLevel)) byIncome.set(d.incomeLevel, []); byIncome.get(d.incomeLevel)!.push(d.complicatedCases); });
    return Array.from(byIncome.entries()).map(([income, vals]) => {
      const sorted = [...vals].sort((a, b) => a - b);
      return { income, min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1], avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
    });
  }, [filteredData]);

  const correlationData = useMemo(() => {
    const fields = [
      { key: 'doctorsPer100k' as const, label: 'Врачи' },
      { key: 'treatmentSuccess' as const, label: 'Успешность лечения' },
      { key: 'vaccinationCoverage' as const, label: 'Вакцинация' },
      { key: 'mortalityPer100k' as const, label: 'Смертность' },
      { key: 'healthcareAccess' as const, label: 'Доступ к медицине' },
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

  const bubbleData = useMemo(() => {
    const map = new Map<string, { vacc: number[]; mort: number[]; pop: number[] }>();
    filteredData.forEach(d => {
      if (!map.has(d.country)) map.set(d.country, { vacc: [], mort: [], pop: [] });
      const c = map.get(d.country)!;
      c.vacc.push(d.vaccinationCoverage); c.mort.push(d.deaths); c.pop.push(d.population);
    });
    return Array.from(map.entries()).map(([country, v]) => ({
      country, vaccination: +(v.vacc.reduce((a, b) => a + b, 0) / v.vacc.length).toFixed(1),
      deaths: Math.round(v.mort.reduce((a, b) => a + b, 0) / v.mort.length),
      population: Math.round(v.pop.reduce((a, b) => a + b, 0) / v.pop.length),
    }));
  }, [filteredData]);

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

  const radarData = useMemo(() => {
    const c = radarCountry || countriesInData[0];
    if (!c) return [];
    const recs = filteredData.filter(d => d.country === c);
    if (!recs.length) return [];
    const avg = (fn: (d: typeof recs[0]) => number) => +(recs.reduce((s, d) => s + fn(d), 0) / recs.length).toFixed(1);
    return [
      { metric: 'Скрининг крови', value: avg(d => d.bloodScreening) },
      { metric: 'Безопасные инъекции', value: avg(d => d.safeInjections) },
      { metric: 'Успешность лечения', value: avg(d => d.treatmentSuccess) },
      { metric: 'Охват вакцинацией', value: avg(d => d.vaccinationCoverage) },
      { metric: 'Доступ к медицине', value: avg(d => d.healthcareAccess) },
    ];
  }, [filteredData, radarCountry, countriesInData]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">1. Топ-10 стран по количеству случаев</h3>
          <div className="chart-scroll-wrapper"><div className="min-w-[450px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barTop10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="country" fontSize={10} angle={-15} textAnchor="end" height={45} tick={tickStyle}>
                  <Label value="Страна" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis fontSize={11} tickFormatter={fmtNum} tick={tickStyle}>
                  <Label value="Количество случаев" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                </YAxis>
                <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
                <Bar dataKey="cases" name="Случаи" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}
                  onClick={(d) => setDetailCountry(d.country)} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div></div>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">2. Динамика заболеваемости по годам</h3>
          <div className="chart-scroll-wrapper"><div className="min-w-[450px]">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="year" fontSize={12} tick={tickStyle}>
                  <Label value="Год" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis fontSize={11} tickFormatter={fmtNum} tick={tickStyle}>
                  <Label value="Количество случаев" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                </YAxis>
                <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
                <Legend />
                {countriesInData.map((c, i) => (
                  <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">3. Распределение по регионам</h3>
          <p className="text-xs text-muted-foreground mb-1">Регионы — Доля случаев (%)</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">4. ВВП vs Успешность лечения</h3>
          <div className="chart-scroll-wrapper"><div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="gdp" name="ВВП на душу (USD)" fontSize={11} tick={tickStyle}>
                  <Label value="ВВП на душу (USD)" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis dataKey="treatment" name="Успешность лечения (%)" domain={[60, 100]} fontSize={11} tick={tickStyle}>
                  <Label value="Успешность лечения (%)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                </YAxis>
                <ZAxis range={[60, 60]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={cts} />
                <Scatter data={scatterGdp} fill="hsl(var(--primary))">
                  {scatterGdp.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">5. Распределение вакцинации</h3>
          <div className="chart-scroll-wrapper"><div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="range" fontSize={11} tick={tickStyle}>
                  <Label value="Охват вакцинацией (%)" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis fontSize={11} tick={tickStyle}>
                  <Label value="Количество стран" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                </YAxis>
                <Tooltip contentStyle={cts} />
                <Bar dataKey="count" name="Кол-во записей" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div></div>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">6. Осложнения по уровням дохода</h3>
          <div className="chart-scroll-wrapper"><div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={boxPlotData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="income" fontSize={11} tick={tickStyle}>
                  <Label value="Уровень дохода" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis fontSize={11} tickFormatter={fmtNum} tick={tickStyle}>
                  <Label value="Количество осложненных случаев" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={11} />
                </YAxis>
                <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
                <Legend />
                <Bar dataKey="min" fill="#E74C3C" name="Мин" radius={[2, 2, 0, 0]} />
                <Bar dataKey="median" fill="hsl(var(--primary))" name="Медиана" radius={[2, 2, 0, 0]} />
                <Bar dataKey="max" fill="hsl(var(--accent))" name="Макс" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">7. Корреляция факторов</h3>
          <p className="text-xs text-muted-foreground mb-1">Врачи, Успешность лечения, Вакцинация, Смертность, Доступ к медицине</p>
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
          <h3 className="section-title mb-3">8. Вакцинация vs Смертность</h3>
          <p className="text-xs text-muted-foreground mb-1">Размер пузыря = Население</p>
          <div className="chart-scroll-wrapper"><div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="vaccination" name="Охват вакцинацией (%)" fontSize={11} tick={tickStyle}>
                  <Label value="Охват вакцинацией (%)" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis dataKey="deaths" name="Смерти" fontSize={11} tickFormatter={fmtNum} tick={tickStyle}>
                  <Label value="Смерти" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                </YAxis>
                <ZAxis dataKey="population" range={[50, 800]} name="Население" />
                <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
                <Scatter data={bubbleData} fill="hsl(var(--primary))">
                  {bubbleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">9. Объем заболеваемости по регионам</h3>
          <div className="chart-scroll-wrapper"><div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={areaData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="year" fontSize={12} tick={tickStyle}>
                  <Label value="Год" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                </XAxis>
                <YAxis fontSize={11} tickFormatter={fmtNum} tick={tickStyle}>
                  <Label value="Суммарное количество случаев" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={11} />
                </YAxis>
                <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
                <Legend />
                {areaData.regs.map((r, i) => (
                  <Area key={r} type="monotone" dataKey={r} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div></div>
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
              <PolarGrid stroke="hsl(var(--chart-grid))" />
              <PolarAngleAxis dataKey="metric" fontSize={10} tick={tickStyle} />
              <PolarRadiusAxis domain={[0, 100]} fontSize={9} tick={tickStyle} />
              <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name={radarCountry || countriesInData[0] || ''} />
              <Tooltip contentStyle={cts} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="section-title mb-3">11. Иерархия стран по числу случаев (Treemap)</h3>
        <p className="text-xs text-muted-foreground mb-1">Страна — Количество случаев</p>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap data={treemapData} dataKey="size" nameKey="name" content={<CustomTreemapContent />}>
            <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={cts} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      <Footer />
    </div>
  );
}
