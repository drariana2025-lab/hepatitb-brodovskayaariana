import { useMemo, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { COLORS } from '@/data/hepatitisData';
import { FilterBar } from '@/components/FilterBar';
import { CountryDetailPanel } from '@/components/CountryDetailPanel';
import { VaccinationCalculator } from '@/components/VaccinationCalculator';
import { ProjectInfo } from '@/components/ProjectInfo';
import { Footer } from '@/components/Footer';
import { TrendingUp, Users, Heart, Syringe, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Label,
} from 'recharts';

export default function MainDashboard() {
  const { filteredData, setDetailCountry, isFiltering } = useFilters();

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

  const handleDownloadPDF = useCallback(async () => {
    toast.info('Генерация PDF...');
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Мониторинг Гепатита B — Отчёт', 14, 15);
    doc.setFontSize(10);
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 14, 22);

    const headers = ['Страна', 'Год', 'Случаи', 'Смерти', 'Вакцинация (%)', 'Успешность лечения (%)'];
    const rows = filteredData.slice(0, 200).map(d => [d.country, d.year, d.cases, d.deaths, d.vaccinationCoverage, d.treatmentSuccess]);
    (doc as any).autoTable({
      head: [headers], body: rows, startY: 28,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [44, 125, 160] },
    });
    doc.save('hepb-report.pdf');
    toast.success('PDF отчёт скачан');
  }, [filteredData]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="page-title">Главная страница — Гепатит B</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" />Скачать отчёт
            </Button>
          </TooltipTrigger>
          <TooltipContent>Скачать данные в PDF</TooltipContent>
        </Tooltip>
      </div>
      <ProjectInfo />
      <FilterBar />

      {isFiltering && (
        <div className="flex justify-center py-8">
          <div className="loading-spinner" />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Всего случаев', value: kpis.totalCases.toLocaleString(), icon: TrendingUp, color: 'text-primary' },
          { label: 'Смертей', value: kpis.totalDeaths.toLocaleString(), icon: Heart, color: 'text-danger' },
          { label: 'Успешность лечения', value: `${kpis.avgTreatment}%`, icon: Users, color: 'text-accent' },
          { label: 'Охват вакцинацией', value: `${kpis.avgVacc}%`, icon: Syringe, color: 'text-primary' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <h3 className="section-title mb-3">Динамика заболеваемости по странам</h3>
          <div className="chart-scroll-wrapper">
            <div className="min-w-[500px]">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="year" fontSize={12} tick={{ fill: 'hsl(var(--chart-text))' }}>
                    <Label value="Год" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                  </XAxis>
                  <YAxis fontSize={11} tick={{ fill: 'hsl(var(--chart-text))' }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}>
                    <Label value="Количество случаев" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                  </YAxis>
                  <RechartsTooltip formatter={(v: number) => v.toLocaleString()} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                  <Legend />
                  {countriesInData.map((c, i) => (
                    <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2, cursor: 'pointer' }}
                      activeDot={{ r: 5, cursor: 'pointer', onClick: () => setDetailCountry(c) }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="chart-container">
          <h3 className="section-title mb-3">Смерти и осложненные формы</h3>
          <div className="chart-scroll-wrapper">
            <div className="min-w-[500px]">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="country" fontSize={10} angle={-20} textAnchor="end" height={50} tick={{ fill: 'hsl(var(--chart-text))' }}>
                    <Label value="Страна" position="insideBottom" offset={-3} fontSize={12} fill="hsl(var(--chart-text))" />
                  </XAxis>
                  <YAxis fontSize={11} tick={{ fill: 'hsl(var(--chart-text))' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}>
                    <Label value="Количество случаев" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--chart-text))' }} fontSize={12} />
                  </YAxis>
                  <RechartsTooltip formatter={(v: number) => v.toLocaleString()} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                  <Legend />
                  <Bar dataKey="deaths" fill="#E74C3C" name="Смерти" radius={[2, 2, 0, 0]} onClick={(d) => setDetailCountry(d.country)} cursor="pointer" />
                  <Bar dataKey="complicated" fill="#E67E22" name="Осложнения" radius={[2, 2, 0, 0]} onClick={(d) => setDetailCountry(d.country)} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <VaccinationCalculator />
      <CountryDetailPanel />
      <Footer />
    </div>
  );
}
