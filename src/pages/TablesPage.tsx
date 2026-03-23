import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { FilterBar } from '@/components/FilterBar';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, ArrowUpDown } from 'lucide-react';
import { exportCSV, exportPDF } from '@/lib/exportUtils';

type SortDir = 'asc' | 'desc';

function StatusBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const color = value >= thresholds[1] ? 'bg-accent' : value >= thresholds[0] ? 'bg-warning' : 'bg-destructive';
  return <span className={`inline-block w-3 h-3 rounded-full ${color}`} />;
}

interface RowData {
  [key: string]: string | number;
  _statusVal: number;
  _thresholdLow: number;
  _thresholdHigh: number;
}

function SortableTable({ headers, rows, defaultSortCol, title }: {
  headers: { label: string; key: string }[];
  rows: RowData[];
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
                    {h.key === 'status' ? <StatusBadge value={row._statusVal} thresholds={[row._thresholdLow, row._thresholdHigh]} /> : (typeof row[h.key] === 'number' ? (row[h.key] as number).toLocaleString() : row[h.key])}
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

  const table1 = useMemo(() => {
    const map = new Map<string, typeof filteredData>();
    filteredData.forEach(d => {
      if (!map.has(d.country)) map.set(d.country, []);
      map.get(d.country)!.push(d);
    });
    return Array.from(map.entries()).map(([country, recs]) => {
      const n = recs.length;
      const avg = (fn: (d: typeof recs[0]) => number) => +(recs.reduce((s, d) => s + fn(d), 0) / n).toFixed(2);
      return {
        country, region: recs[0].region, incomeLevel: recs[0].incomeLevel,
        economicIndex: avg(d => d.economicIndex), healthExpenditure: avg(d => d.healthExpenditure),
        populationMln: +(avg(d => d.population) / 1000000).toFixed(1),
        status: '', _statusVal: avg(d => d.economicIndex), _thresholdLow: 2000, _thresholdHigh: 8000,
      } as RowData;
    });
  }, [filteredData]);

  const table2 = useMemo(() => {
    return filteredData.map(d => ({
      country: d.country, year: d.year, incidencePer100k: d.incidencePer100k,
      mortalityPer100k: d.mortalityPer100k, caseFatalityPct: d.caseFatalityPct,
      chronicPct: +((d.complicatedCases / d.cases) * 100).toFixed(2),
      status: '', _statusVal: 100 - d.mortalityPer100k, _thresholdLow: 95, _thresholdHigh: 99,
    } as RowData));
  }, [filteredData]);

  const table3 = useMemo(() => {
    return filteredData.map(d => {
      const infraIndex = +(d.doctorsPer100k * 10 + d.facilitiesPerMln * 50).toFixed(2);
      const accessIndex = +(d.healthcareAccess * 0.5 + d.treatmentSuccess * 0.5).toFixed(2);
      return {
        country: d.country, year: d.year, infraIndex, accessIndex,
        vaccinationCoverage: d.vaccinationCoverage, treatmentSuccess: d.treatmentSuccess,
        status: '', _statusVal: d.treatmentSuccess, _thresholdLow: 70, _thresholdHigh: 85,
      } as RowData;
    });
  }, [filteredData]);

  const table4 = useMemo(() => {
    return filteredData.map(d => ({
      country: d.country, year: d.year, riskIndex: d.riskIndex, preventionIndex: d.preventionIndex,
      smoking: d.smoking, malnutrition: d.malnutrition,
      status: '', _statusVal: d.preventionIndex, _thresholdLow: 75, _thresholdHigh: 90,
    } as RowData));
  }, [filteredData]);

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
            { label: 'Уровень дохода', key: 'incomeLevel' }, { label: 'Экономический индекс', key: 'economicIndex' },
            { label: 'Расходы на здрав. ($)', key: 'healthExpenditure' }, { label: 'Население (млн)', key: 'populationMln' },
          ]} rows={table1} />
        </TabsContent>
        <TabsContent value="epidemiology">
          <SortableTable title="Гепатит B — эпидемиологическая ситуация" defaultSortCol="mortalityPer100k" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' }, { label: 'Год', key: 'year' },
            { label: 'Заболев./100тыс', key: 'incidencePer100k' }, { label: 'Смертн./100тыс', key: 'mortalityPer100k' },
            { label: 'Летальность (%)', key: 'caseFatalityPct' }, { label: 'Доля хронич. форм (%)', key: 'chronicPct' },
          ]} rows={table2} />
        </TabsContent>
        <TabsContent value="healthcare">
          <SortableTable title="Медсистема — готовность к Гепатиту B" defaultSortCol="accessIndex" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' }, { label: 'Год', key: 'year' },
            { label: 'Инд. инфраструктуры', key: 'infraIndex' }, { label: 'Инд. доступности', key: 'accessIndex' },
            { label: 'Вакцинация (%)', key: 'vaccinationCoverage' }, { label: 'Успешность лечения (%)', key: 'treatmentSuccess' },
          ]} rows={table3} />
        </TabsContent>
        <TabsContent value="risk">
          <SortableTable title="Социально-поведенческие риски" defaultSortCol="riskIndex" headers={[
            { label: 'Статус', key: 'status' }, { label: 'Страна', key: 'country' }, { label: 'Год', key: 'year' },
            { label: 'Индекс риска', key: 'riskIndex' }, { label: 'Инд. профилактики', key: 'preventionIndex' },
            { label: 'Курение (%)', key: 'smoking' }, { label: 'Недоедание (%)', key: 'malnutrition' },
          ]} rows={table4} />
        </TabsContent>
      </Tabs>
      <Footer />
    </div>
  );
}
