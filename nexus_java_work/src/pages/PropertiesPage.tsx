import React, { useState, useEffect } from 'react';
import { Property, SearchFilters, PaginatedResult } from '../types';
import { api } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { SearchFiltersBar } from '../components/SearchFilters';
import { PropertyCard } from '../components/PropertyCard';
import { LayoutGrid, List, Map as MapIcon, MapPin, ChevronLeft, ChevronRight, Loader2, Home } from 'lucide-react';

interface PropertiesPageProps {
  initialFilters?: Partial<SearchFilters>;
  onNavigate: (view: string, param?: any) => void;
  onOpenValuation: (propertyId: string) => void;
}

export const PropertiesPage: React.FC<PropertiesPageProps> = ({
  initialFilters = {},
  onNavigate,
  onOpenValuation,
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: initialFilters.keyword || '',
    location: initialFilters.location || '',
    propertyType: initialFilters.propertyType || 'ALL',
    minPrice: initialFilters.minPrice,
    maxPrice: initialFilters.maxPrice,
    bedrooms: initialFilters.bedrooms,
    amenities: initialFilters.amenities || [],
    page: 1,
    size: 12,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    ...initialFilters,
  });

  const [data, setData] = useState<PaginatedResult<Property>>({
    content: [],
    page: 1,
    size: 12,
    totalElements: 0,
    totalPages: 0,
    hasMore: false,
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [selectedMapDistrict, setSelectedMapDistrict] = useState<string | null>(null);

  const fetchProperties = async (currentFilters: SearchFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.keyword) params.set('keyword', currentFilters.keyword);
      if (currentFilters.location) params.set('location', currentFilters.location);
      if (currentFilters.propertyType && currentFilters.propertyType !== 'ALL') params.set('propertyType', currentFilters.propertyType);
      if (currentFilters.minPrice !== undefined) params.set('minPrice', String(currentFilters.minPrice));
      if (currentFilters.maxPrice !== undefined) params.set('maxPrice', String(currentFilters.maxPrice));
      if (currentFilters.bedrooms !== undefined) params.set('bedrooms', String(currentFilters.bedrooms));
      if (currentFilters.amenities && currentFilters.amenities.length > 0) {
        params.set('amenities', currentFilters.amenities.join(','));
      }
      params.set('page', String(currentFilters.page || 1));
      params.set('size', String(currentFilters.size || 12));
      params.set('sortBy', currentFilters.sortBy || 'createdAt');
      params.set('sortOrder', currentFilters.sortOrder || 'DESC');

      const result = await api.get<PaginatedResult<Property>>(`/api/properties?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(filters);
  }, [filters.page, filters.sortBy, filters.sortOrder]);

  const handleFilterChange = (updated: Partial<SearchFilters>) => {
    const next = { ...filters, ...updated, page: updated.page || 1 };
    setFilters(next);
  };

  const handleSearchSubmit = () => {
    fetchProperties(filters);
  };

  const handleResetFilters = () => {
    const defaultFilters: SearchFilters = {
      keyword: '',
      location: '',
      propertyType: 'ALL',
      minPrice: undefined,
      maxPrice: undefined,
      bedrooms: undefined,
      amenities: [],
      page: 1,
      size: 12,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };
    setFilters(defaultFilters);
    fetchProperties(defaultFilters);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= data.totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
            Curated Sri Lankan Property Marketplace
          </span>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            {t('properties.title', 'Explore Properties in Sri Lanka')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('properties.subtitle', 'Browse verified residential houses, luxury sea-view apartments, coconut estates, and commercial suites across Sri Lanka')}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Interactive Map View"
          >
            <MapIcon className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Multi-Criteria Search Filters Bar */}
      <SearchFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onSearch={handleSearchSubmit}
        totalResults={data.totalElements}
      />

      {/* Loading state */}
      {loading && (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-900 mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving matching property records...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.content.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Home className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900 mb-1">
            No Properties Match Your Search
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Try adjusting your price boundaries, removing selected amenities, or broadening your location query.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Results View: Grid, List, or Map */}
      {!loading && data.content.length > 0 && (
        <>
          {viewMode === 'map' ? (
            <div className="space-y-6">
              {/* Interactive Sri Lanka Geographic District Explorer */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                      Geographic Region Navigator
                    </span>
                    <h2 className="font-serif text-2xl font-bold tracking-tight">
                      Sri Lanka Real Estate Map Directory
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Click any province or key district to isolate verified listings across Sri Lanka's prime commercial, residential, and coastal corridors.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedMapDistrict && (
                      <button
                        onClick={() => {
                          setSelectedMapDistrict(null);
                          handleFilterChange({ location: '' });
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium border border-slate-700 transition-colors"
                      >
                        Reset Region Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* District Pin Hotspots */}
                <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {[
                    { name: 'Colombo', province: 'Western' },
                    { name: 'Galle', province: 'Southern' },
                    { name: 'Kandy', province: 'Central' },
                    { name: 'Matara', province: 'Southern' },
                    { name: 'Negombo', province: 'Western' },
                    { name: 'Kurunegala', province: 'North Western' },
                    { name: 'Nuwara Eliya', province: 'Central' },
                    { name: 'Jaffna', province: 'Northern' },
                  ].map(dist => {
                    const matchCount = data.content.filter(p =>
                      p.location.toLowerCase().includes(dist.name.toLowerCase())
                    ).length;
                    const isSelected = selectedMapDistrict === dist.name || filters.location?.toLowerCase().includes(dist.name.toLowerCase());

                    return (
                      <button
                        key={dist.name}
                        onClick={() => {
                          setSelectedMapDistrict(dist.name);
                          handleFilterChange({ location: dist.name });
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg scale-105 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-slate-900 text-slate-400'}`}>
                            {matchCount}
                          </span>
                        </div>
                        <span className="text-xs block font-semibold truncate">{dist.name}</span>
                        <span className={`text-[10px] block truncate ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                          {dist.province} Prov.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtered Properties Grid for Map View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {data.content.map(property => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => onNavigate('detail', property.id)}
                    onOpenValuation={onOpenValuation}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'
                  : 'grid grid-cols-1 gap-4'
              }
            >
              {data.content.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => onNavigate('detail', property.id)}
                  onOpenValuation={onOpenValuation}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {data.totalPages > 1 && (
            <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono tabular-nums">
                Page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong> ({data.totalElements} items)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition-colors ${
                        data.page === p
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
