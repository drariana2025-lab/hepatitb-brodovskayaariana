import { useFilters } from '@/contexts/FilterContext';
import { countries, regions, incomeLevels, years } from '@/data/hepatitisData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

export function FilterBar() {
  const { selectedYears, setSelectedYears, selectedRegion, setSelectedRegion, selectedIncome, setSelectedIncome, selectedCountry, setSelectedCountry } = useFilters();

  const toggleYear = (y: number) => {
    if (selectedYears.includes(y)) {
      if (selectedYears.length > 1) setSelectedYears(selectedYears.filter(yr => yr !== y));
    } else {
      setSelectedYears([...selectedYears, y]);
    }
  };

  return (
    <div className="filter-bar">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1.5">
        {years.map(y => (
          <Badge
            key={y}
            variant={selectedYears.includes(y) ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${selectedYears.includes(y) ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => toggleYear(y)}
          >
            {y}
          </Badge>
        ))}
      </div>
      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
        <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Регион" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все регионы</SelectItem>
          {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={selectedIncome} onValueChange={setSelectedIncome}>
        <SelectTrigger className="w-[170px] h-8"><SelectValue placeholder="Доход" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все уровни</SelectItem>
          {incomeLevels.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
        <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Страна" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все страны</SelectItem>
          {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      {(selectedRegion !== 'all' || selectedIncome !== 'all' || selectedCountry !== 'all' || selectedYears.length < years.length) && (
        <button onClick={() => { setSelectedRegion('all'); setSelectedIncome('all'); setSelectedCountry('all'); setSelectedYears([...years]); }} className="text-muted-foreground hover:text-foreground ml-auto">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
