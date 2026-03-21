import { useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { COLORS } from '@/data/hepatitisData';
import { FilterBar } from '@/components/FilterBar';
import { CountryDetailPanel } from '@/components/CountryDetailPanel';
import { VaccinationCalculator } from '@/components/VaccinationCalculator';
import { TrendingUp, Users, Heart, Syringe } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';

export default function MainDashboard() {
  const { filteredData, setDetailCountry } = useFilters();

  const kpis = useMemo(() => {
    const totalCases = filteredData.reduce((s, d) => s + d.cases, 0);
    const totalDeaths = filteredData.reduce((s, d) => s + d.deaths, 0);
    const avgTreatment = filteredData.length ? +(filteredData.reduce((s, d) => s + d.treatmentSuccess, 0) / filteredData.length).toFixed(1) : 0;
    const avgVacc = filteredData.length ? +(filteredData.reduce((s, d) => s + d.vaccinationCoverage, 0) / filteredData.length).toFixed(1) : 0;
    return { totalCases, totalDeaths, avgTreatment, avgVacc };
  }, [filteredData]);

  const lineData = useMemo(() => {
    const byYear = new Map<number, Map<string, number>>();
    filteredData.forEach(d => {
      if (!byYear.has(d.year)) byYear.set(d.year, new Map());
      byYear.get(d.year)!.set(d.country, d.cases);
    });
    const countriesInData = [...new Set(filteredData.map(d => d.country))];
    return Array.from(byYear.entries()).map(([year, countryMap]) => {
      const row: Record<string, number> = { year };
      countriesInData.forEach(c => { row[c] = countryMap.get(c) || 0; });
      return row;
    }).sort((a, b) => a.year - b.year);
  }, [filteredData]);

  const barData = useMemo(() => {
    const byCountry = new Map<string, { deaths: number; complicated: number }>();
    filteredData.forEach(d => {
      if (!byCountry.has(d.country)) byCountry.set(d.country, { deaths: 0, complicated: 0 });
      const c = byCountry.get(d.country)!;
      c.deaths += d.deaths; c.complicated += d.complicatedCases;
    });
    return Array.from(byCountry.entries()).map(([country, v]) => ({ country, ...v })).sort((a, b) => b.deaths - a.deaths);
  }, [filteredData]);

  const countriesInData = [...new Set(filteredData.map(d => d.country))];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title">Главный дашборд — Гепатит B</h1>
      <FilterBar />
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Всего случаев', value: kpis.totalCases.toLocaleString(), icon: TrendingUp, color: 'text-primary' },
          { label: 'Смертей', value: kpis.totalDeaths.toLocaleString(), icon: Heart, color: 'text-danger' },
          { label: 'Успешность лечения', value: `${kpis.avgTreatment}%`, icon: Users, color: 'text-accent' },
          { label: 'Охват вакцинацией', value: `${kpis.avgVacc}%`, icon: Syringe, color: 'text-primary' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">Динамика заболеваемости по странам</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              {countriesInData.map((c, i) => (
                <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2, cursor: 'pointer' }}
                  activeDot={{ r: 5, cursor: 'pointer', onClick: () => setDetailCountry(c) }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">Смерти и осложненные формы</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" fontSize={10} angle={-20} textAnchor="end" height={50} />
              <YAxis fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              <Bar dataKey="deaths" fill="#E74C3C" name="Смерти" radius={[2, 2, 0, 0]} onClick={(d) => setDetailCountry(d.country)} cursor="pointer" />
              <Bar dataKey="complicated" fill="#E67E22" name="Осложнения" radius={[2, 2, 0, 0]} onClick={(d) => setDetailCountry(d.country)} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <VaccinationCalculator />
      <CountryDetailPanel />
    </div>
  );
}
