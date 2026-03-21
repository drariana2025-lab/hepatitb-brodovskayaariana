import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { FilterBar } from '@/components/FilterBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, ArrowUpDown } from 'lucide-react';
import { exportCSV, exportPDF } from '@/lib/exportUtils';

type SortDir = 'asc' | 'desc';

function StatusBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const color = value >= thresholds[1] ? 'bg-green-500' : value >= thresholds[0] ? 'bg-yellow-500' : 'bg-red-500';
  return <span className={`inline-block w-3 h-3 rounded-full ${color}`} />;
}

function SortableTable({ headers, rows, defaultSortCol, title }: {
  headers: { label: string; key: string }[];
  rows: Record<string, string | number>[];
  defaultSortCol: string;
  title: string;
}) {
  const [sortKey, setSortKey] = useState(defaultSortCol);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'desc' ? bv - av : av - bv;
      return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleExportCSV = () => {
    exportCSV(headers.map(h => h.label), sorted.map(r => headers.map(h => r[h.key])), title);
  };
  const handleExportPDF = () => {
    exportPDF(title, headers.map(h => h.label), sorted.map(r => headers.map(h => r[h.key])), title);
  };

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleExportCSV}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-1" />PDF</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {headers.map(h => (
                <th key={h.key} className="px-3 py-2 text-left font-medium text-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(h.key)}>
                  <span className="inline-flex items-center gap-1">{h.label}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                {headers.map(h => (
                  <td key={h.key} className="px-3 py-2 whitespace-nowrap">
                    {h.key === 'status' ? <StatusBadge value={row._statusVal as number} thresholds={row._thresholds as [number, number]} /> : (typeof row[h.key] === 'number' ? (row[h.key] as number).toLocaleString() : row[h.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TablesPage() {
  const { filteredData } = useFilters();

  const aggregate = useMemo(() => {
    const map = new Map<string, typeof filteredData>();
    filteredData.forEach(d => {
      if (!map.has(d.country)) map.set(d.country, []);
      map.get(d.country)!.push(d);
    });
    return Array.from(map.entries()).map(([country, recs]) => {
      const n = recs.length;
      const avg = (fn: (d: typeof recs[0]) => number) => +(recs.reduce((s, d) => s + fn(d), 0) / n).toFixed(2);
      return {
        country,
        region: recs[0].region,
        incomeLevel: recs[0].incomeLevel,
        population: Math.round(avg(d => d.population)),
        gdpPerCapita: avg(d => d.gdpPerCapita),
        healthExpenditure: avg(d => d.healthExpenditure),
        economicIndex: avg(d => d.economicIndex),
        cases: Math.round(avg(d => d.cases)),
        deaths: Math.round(avg(d => d.deaths)),
        incidencePer100k: avg(d => d.incidencePer100k),
        mortalityPer100k: avg(d => d.mortalityPer100k),
        caseFatalityPct: avg(d => d.caseFatalityPct),
        treatmentSuccess: avg(d => d.treatmentSuccess),
        doctorsPer100k: avg(d => d.doctorsPer100k),
        facilitiesPerMln: avg(d => d.facilitiesPerMln),
        healthcareAccess: avg(d => d.healthcareAccess),
        vaccinationCoverage: avg(d => d.vaccinationCoverage),
        smoking: avg(d => d.smoking),
        malnutrition: avg(d => d.malnutrition),
        urbanization: avg(d => d.urbanization),
        riskIndex: avg(d => d.riskIndex),
        preventionIndex: avg(d => d.preventionIndex),
        complicatedCases: Math.round(avg(d => d.complicatedCases)),
      };
    });
  }, [filteredData]);

  const table1 = useMemo(() => aggregate.map(a => ({
    country: a.country, region: a.region, incomeLevel: a.incomeLevel,
    gdpPerCapita: a.gdpPerCapita, healthExpenditure: a.healthExpenditure, economicIndex: a.economicIndex,
    population: a.population,
    status: '', _statusVal: a.economicIndex, _thresholds: [2000, 8000] as [number, number],
  })), [aggregate]);

  const table2 = useMemo(() => aggregate.map(a => ({
    country: a.country, region: a.region, cases: a.cases, deaths: a.deaths,
    incidencePer100k: a.incidencePer100k, mortalityPer100k: a.mortalityPer100k,
    caseFatalityPct: a.caseFatalityPct, complicatedCases: a.complicatedCases,
    status: '', _statusVal: 100 - a.mortalityPer100k, _thresholds: [95, 99] as [number, number],
  })), [aggregate]);

  const table3 = useMemo(() => aggregate.map(a => ({
    country: a.country, treatmentSuccess: a.treatmentSuccess, doctorsPer100k: a.doctorsPer100k,
    facilitiesPerMln: a.facilitiesPerMln, healthcareAccess: a.healthcareAccess,
    vaccinationCoverage: a.vaccinationCoverage,
    status: '', _statusVal: a.treatmentSuccess, _thresholds: [70, 85] as [number, number],
  })), [aggregate]);

  const table4 = useMemo(() => aggregate.map(a => ({
    country: a.country, smoking: a.smoking, malnutrition: a.malnutrition,
    urbanization: a.urbanization, riskIndex: a.riskIndex, preventionIndex: a.preventionIndex,
    status: '', _statusVal: a.preventionIndex, _thresholds: [75, 90] as [number, number],
  })), [aggregate]);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title">Аналитические таблицы</h1>
      <FilterBar />
      <Tabs defaultValue="economic" className="chart-container">
        <TabsList className="mb-4">
          <TabsTrigger value="economic">Экономический потенциал</TabsTrigger>
          <TabsTrigger value="epidemiology">Эпидемиология</TabsTrigger>
          <TabsTrigger value="healthcare">Медсистема</TabsTrigger>
          <TabsTrigger value="risk">Соц. риски</TabsTrigger>
        </TabsList>
        <TabsContent value="economic">
          <SortableTable title="Страны — экономический потенциал" defaultSortCol="economicIndex" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' }, { label: 'Регион', key: 'region' },
            { label: 'Уровень дохода', key: 'incomeLevel' }, { label: 'Население', key: 'population' },
            { label: 'ВВП/душу ($)', key: 'gdpPerCapita' }, { label: 'Расх. здрав. ($)', key: 'healthExpenditure' },
            { label: 'Эконом. индекс', key: 'economicIndex' },
          ]} rows={table1} />
        </TabsContent>
        <TabsContent value="epidemiology">
          <SortableTable title="Гепатит B — эпидемиологическая ситуация" defaultSortCol="mortalityPer100k" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' }, { label: 'Случаи', key: 'cases' },
            { label: 'Смерти', key: 'deaths' }, { label: 'Заболев./100тыс', key: 'incidencePer100k' },
            { label: 'Смерт./100тыс', key: 'mortalityPer100k' }, { label: 'Летальность %', key: 'caseFatalityPct' },
            { label: 'Осложнения', key: 'complicatedCases' },
          ]} rows={table2} />
        </TabsContent>
        <TabsContent value="healthcare">
          <SortableTable title="Медсистема — готовность к Гепатиту B" defaultSortCol="treatmentSuccess" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' },
            { label: 'Успешность лечения %', key: 'treatmentSuccess' }, { label: 'Врачи/100тыс', key: 'doctorsPer100k' },
            { label: 'Учрежд./млн', key: 'facilitiesPerMln' }, { label: 'Доступ %', key: 'healthcareAccess' },
            { label: 'Вакцинация %', key: 'vaccinationCoverage' },
          ]} rows={table3} />
        </TabsContent>
        <TabsContent value="risk">
          <SortableTable title="Социально-поведенческие риски" defaultSortCol="riskIndex" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' },
            { label: 'Курение %', key: 'smoking' }, { label: 'Недоедание %', key: 'malnutrition' },
            { label: 'Урбанизация %', key: 'urbanization' }, { label: 'Инд. риска', key: 'riskIndex' },
            { label: 'Инд. профилакт.', key: 'preventionIndex' },
          ]} rows={table4} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
