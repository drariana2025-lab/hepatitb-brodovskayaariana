import React, { createContext, useContext, useState, useMemo } from 'react';
import { rawData, years, HepRecord } from '@/data/hepatitisData';

interface FilterState {
  selectedYears: number[];
  selectedRegion: string;
  selectedIncome: string;
  selectedCountry: string;
  detailCountry: string | null;
}

interface FilterContextType extends FilterState {
  setSelectedYears: (y: number[]) => void;
  setSelectedRegion: (r: string) => void;
  setSelectedIncome: (i: string) => void;
  setSelectedCountry: (c: string) => void;
  setDetailCountry: (c: string | null) => void;
  filteredData: HepRecord[];
}

const FilterContext = createContext<FilterContextType | null>(null);

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be inside FilterProvider');
  return ctx;
};

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedYears, setSelectedYears] = useState<number[]>(years);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedIncome, setSelectedIncome] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [detailCountry, setDetailCountry] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return rawData.filter(d => {
      if (!selectedYears.includes(d.year)) return false;
      if (selectedRegion !== 'all' && d.region !== selectedRegion) return false;
      if (selectedIncome !== 'all' && d.incomeLevel !== selectedIncome) return false;
      if (selectedCountry !== 'all' && d.country !== selectedCountry) return false;
      return true;
    });
  }, [selectedYears, selectedRegion, selectedIncome, selectedCountry]);

  return (
    <FilterContext.Provider value={{
      selectedYears, setSelectedYears,
      selectedRegion, setSelectedRegion,
      selectedIncome, setSelectedIncome,
      selectedCountry, setSelectedCountry,
      detailCountry, setDetailCountry,
      filteredData
    }}>
      {children}
    </FilterContext.Provider>
  );
};
