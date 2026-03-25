import { useFilters } from '@/contexts/FilterContext';
import { countries, regions, incomeLevels, years } from '@/data/hepatitisData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function FilterBar() {
  const { selectedYears, setSelectedYears, selectedRegion, setSelectedRegion, selectedIncome, setSelectedIncome, selectedCountry, setSelectedCountry, isFiltering } = useFilters();

  const toggleYear = (y: number) => {
    if (selectedYears.includes(y)) {
      if (selectedYears.length > 1) setSelectedYears(selectedYears.filter(yr => yr !== y));
    } else {
      setSelectedYears([...selectedYears, y]);
    }
  };

  return (
    <div className="filter-bar relative">
      {isFiltering && (
        <div className="absolute inset-0 bg-card/60 rounded-xl flex items-center justify-center z-10">
          <div className="loading-spinner" />
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <div><Filter className="h-4 w-4 text-muted-foreground" /></div>
        </TooltipTrigger>
        <TooltipContent>Фильтры данных</TooltipContent>
      </Tooltip>
      <div className="flex gap-1.5 flex-wrap">
        {years.map(y => (
          <Tooltip key={y}>
            <TooltipTrigger asChild>
              <div>
                <Badge
                  variant={selectedYears.includes(y) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${selectedYears.includes(y) ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => toggleYear(y)}
                >
                  {y}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>Выбрать {y} год</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
        <SelectTrigger className="w-[130px] sm:w-[150px] h-8"><SelectValue placeholder="Регион" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все регионы</SelectItem>
          {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={selectedIncome} onValueChange={setSelectedIncome}>
        <SelectTrigger className="w-[140px] sm:w-[170px] h-8"><SelectValue placeholder="Доход" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все уровни</SelectItem>
          {incomeLevels.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
        <SelectTrigger className="w-[130px] sm:w-[150px] h-8"><SelectValue placeholder="Страна" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все страны</SelectItem>
          {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      {(selectedRegion !== 'all' || selectedIncome !== 'all' || selectedCountry !== 'all' || selectedYears.length < years.length) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => { setSelectedRegion('all'); setSelectedIncome('all'); setSelectedCountry('all'); setSelectedYears([...years]); }} className="text-muted-foreground hover:text-foreground ml-auto">
              <X className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Сбросить фильтры</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
