import React, { useState } from 'react';
import { SearchFilters, PropertyType } from '../types';
import { Search, MapPin, SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getAllDistrictNames, SRI_LANKA_PRICE_PRESETS } from '../utils/sriLankaGeo';

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (updated: Partial<SearchFilters>) => void;
  onReset: () => void;
  onSearch: () => void;
  totalResults?: number;
}

const COMMON_AMENITIES = [
  'Swimming Pool',
  'Ocean View',
  'Solar Panels',
  'CCTV',
  'Backup Generator',
  'Covered Parking',
  'Landscaped Garden',
  'Boundary Wall',
  'Wine Cellar',
  'Smart Home',
  'Private Terrace',
  'Fitness Center',
  'Waterfront',
  'Fireplace',
];

const PROPERTY_TYPES: { label: string; value: PropertyType | 'ALL' }[] = [
  { label: 'All Property Types', value: 'ALL' },
  { label: 'Single Family House', value: 'HOUSE' },
  { label: 'Luxury Villa', value: 'VILLA' },
  { label: 'Condominium', value: 'CONDO' },
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Commercial HQ', value: 'COMMERCIAL' },
  { label: 'Land & Acreage', value: 'LAND' },
];

export const SearchFiltersBar: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  onReset,
  onSearch,
  totalResults,
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const handleAmenityToggle = (amenity: string) => {
    const current = filters.amenities || [];
    const exists = current.includes(amenity);
    const updated = exists ? current.filter(a => a !== amenity) : [...current, amenity];
    onChange({ amenities: updated, page: 1 });
  };

  const handlePriceChange = (minStr: string, maxStr: string) => {
    const min = minStr ? Math.max(0, Number(minStr)) : undefined;
    const max = maxStr ? Math.max(0, Number(maxStr)) : undefined;
    onChange({ minPrice: min, maxPrice: max, page: 1 });
  };

  const handlePresetChange = (presetLabel: string) => {
    const found = SRI_LANKA_PRICE_PRESETS.find(p => p.label === presetLabel);
    if (found) {
      onChange({ minPrice: found.min, maxPrice: found.max, page: 1 });
    }
  };

  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const POPULAR_LOCATIONS = [
    'Colombo 03',
    'Cinnamon Gardens',
    'Nugegoda',
    'Galle Fort',
    'Kandy',
    'Negombo',
    'Dehiwala',
    'Mirissa',
    'Nuwara Eliya',
    'Kurunegala',
    'Battaramulla',
    'Rajagiriya',
    'Mount Lavinia',
    'Jaffna',
    'Matara',
  ];

  const filteredSuggestions = POPULAR_LOCATIONS.filter(loc =>
    !filters.location || loc.toLowerCase().includes(filters.location.toLowerCase())
  );

  const hasActiveFilters = Boolean(
    filters.keyword ||
    filters.location ||
    (filters.propertyType && filters.propertyType !== 'ALL') ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.bedrooms !== undefined ||
    (filters.amenities && filters.amenities.length > 0)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-8">
      {/* Primary Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Keyword input */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search.keywordPlaceholder')}
            value={filters.keyword || ''}
            onChange={e => onChange({ keyword: e.target.value, page: 1 })}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-900"
          />
        </div>

        {/* Location input with smart suggestions */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search.locationPlaceholder')}
            value={filters.location || ''}
            onChange={e => {
              onChange({ location: e.target.value, page: 1 });
              setShowLocationSuggestions(true);
            }}
            onFocus={() => setShowLocationSuggestions(true)}
            onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-900"
          />

          {/* Autocomplete Suggestions Dropdown */}
          {showLocationSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">
                Popular Sri Lankan Locations
              </div>
              {filteredSuggestions.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onMouseDown={() => {
                    onChange({ location: loc, page: 1 });
                    setShowLocationSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 flex items-center justify-between transition-colors"
                >
                  <span className="font-medium">{loc}</span>
                  <span className="text-[10px] text-slate-400">Sri Lanka</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property Type Dropdown */}
        <div className="md:col-span-3 relative">
          <select
            value={filters.propertyType || 'ALL'}
            onChange={e => onChange({ propertyType: e.target.value as any, page: 1 })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-900 appearance-none cursor-pointer"
          >
            <option value="ALL">{t('type.ALL')}</option>
            <option value="HOUSE">{t('type.HOUSE')}</option>
            <option value="APARTMENT">{t('type.APARTMENT')}</option>
            <option value="LAND">{t('type.LAND')}</option>
            <option value="VILLA">{t('type.VILLA')}</option>
            <option value="CONDO">{t('type.CONDO')}</option>
            <option value="COMMERCIAL">{t('type.COMMERCIAL')}</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Search & Filter toggle buttons */}
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 transition-colors flex-1 ${
              expanded
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="More filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{expanded ? 'Hide' : 'Filters'}</span>
          </button>

          <button
            onClick={onSearch}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            {t('hero.searchBtn')}
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Active Filters:
          </span>

          {filters.keyword && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium">
              <span>Keyword: "{filters.keyword}"</span>
              <button
                type="button"
                onClick={() => onChange({ keyword: '', page: 1 })}
                className="hover:text-indigo-600 ml-0.5"
                title="Remove keyword filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.location && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium">
              <span>Location: "{filters.location}"</span>
              <button
                type="button"
                onClick={() => onChange({ location: '', page: 1 })}
                className="hover:text-indigo-600 ml-0.5"
                title="Remove location filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.propertyType && filters.propertyType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium">
              <span>Type: {filters.propertyType}</span>
              <button
                type="button"
                onClick={() => onChange({ propertyType: 'ALL', page: 1 })}
                className="hover:text-indigo-600 ml-0.5"
                title="Remove property type filter"
              >
                ×
              </button>
            </span>
          )}

          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium font-mono">
              <span>
                LKR {filters.minPrice !== undefined ? `${(filters.minPrice / 1e6).toFixed(1)}M` : '0'} – {filters.maxPrice !== undefined ? `${(filters.maxPrice / 1e6).toFixed(1)}M` : 'Any'}
              </span>
              <button
                type="button"
                onClick={() => onChange({ minPrice: undefined, maxPrice: undefined, page: 1 })}
                className="hover:text-indigo-600 ml-0.5 font-sans"
                title="Remove price range"
              >
                ×
              </button>
            </span>
          )}

          {filters.bedrooms !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium">
              <span>{filters.bedrooms}+ Bedrooms</span>
              <button
                type="button"
                onClick={() => onChange({ bedrooms: undefined, page: 1 })}
                className="hover:text-indigo-600 ml-0.5"
                title="Remove bedrooms filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.amenities && filters.amenities.map(amenity => (
            <span key={amenity} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
              <span>{amenity}</span>
              <button
                type="button"
                onClick={() => handleAmenityToggle(amenity)}
                className="hover:text-rose-600 ml-0.5 font-bold"
                title={`Remove ${amenity}`}
              >
                ×
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-medium ml-auto"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Expanded Multi-criteria Drawer */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-200">
          {/* Sri Lankan District Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {t('search.districtLabel')} (Sri Lanka)
            </label>
            <select
              value={filters.location && getAllDistrictNames().includes(filters.location) ? filters.location : ''}
              onChange={e => onChange({ location: e.target.value, page: 1 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">{t('search.allDistricts')}</option>
              {getAllDistrictNames().map(dist => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Sri Lankan Price Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {t('search.priceRange')}
            </label>
            <div className="space-y-1.5">
              <select
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 cursor-pointer mb-1"
                defaultValue=""
              >
                <option value="" disabled>-- Quick LKR Tier --</option>
                {SRI_LANKA_PRICE_PRESETS.map(preset => (
                  <option key={preset.label} value={preset.label}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder={t('search.minPrice')}
                  min="0"
                  value={filters.minPrice !== undefined ? filters.minPrice : ''}
                  onChange={e => handlePriceChange(e.target.value, String(filters.maxPrice || ''))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono tabular-nums"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="number"
                  placeholder={t('search.maxPrice')}
                  min="0"
                  value={filters.maxPrice !== undefined ? filters.maxPrice : ''}
                  onChange={e => handlePriceChange(String(filters.minPrice || ''), e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono tabular-nums"
                />
              </div>
            </div>
            {filters.minPrice !== undefined && filters.maxPrice !== undefined && Number(filters.minPrice) > Number(filters.maxPrice) && (
              <p className="text-rose-600 text-[11px] mt-1">Min price cannot exceed max price.</p>
            )}
          </div>

          {/* Minimum Bedrooms */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {t('search.bedrooms')}
            </label>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onChange({ bedrooms: b === 0 ? undefined : b, page: 1 })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    (b === 0 && !filters.bedrooms) || filters.bedrooms === b
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b === 0 ? t('search.anyBeds') : `${b}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By Whitelist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {t('search.sortBy')}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filters.sortBy || 'createdAt'}
                onChange={e => onChange({ sortBy: e.target.value as any, page: 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                <option value="createdAt">Date Listed (Newest)</option>
                <option value="price">Price (LKR)</option>
                <option value="bedrooms">Bedrooms</option>
                <option value="area">Area</option>
                <option value="location">Location</option>
              </select>
              <select
                value={filters.sortOrder || 'DESC'}
                onChange={e => onChange({ sortOrder: e.target.value as any, page: 1 })}
                className="w-24 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                <option value="DESC">Desc</option>
                <option value="ASC">Asc</option>
              </select>
            </div>

            <button
              onClick={onReset}
              className="w-full mt-2 px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('search.reset')}</span>
            </button>
          </div>

          {/* Amenities Multi-Selection Chips */}
          <div className="md:col-span-4 pt-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {t('search.amenities')}
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map(amenity => {
                const isSelected = (filters.amenities || []).includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => handleAmenityToggle(amenity)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Result Status Bar */}
      {totalResults !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {t('search.showing')} <strong className="text-slate-800 font-semibold">{totalResults}</strong> {t('search.propertiesFound')}
          </span>
          {(filters.keyword || filters.location || (filters.propertyType && filters.propertyType !== 'ALL') || filters.minPrice || filters.maxPrice || filters.bedrooms || (filters.amenities && filters.amenities.length > 0)) && (
            <button
              onClick={onReset}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {t('search.reset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
