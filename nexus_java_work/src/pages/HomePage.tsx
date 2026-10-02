import React, { useState, useEffect } from 'react';
import { Property, SearchFilters } from '../types';
import { api } from '../api/client';
import { PropertyCard } from '../components/PropertyCard';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  MapPin,
  Building2,
  Sparkles,
  ShieldCheck,
  Award,
  ArrowRight,
  TrendingUp,
  Compass,
  CalendarCheck,
  Check,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, param?: any) => void;
  onOpenValuation: (propertyId: string) => void;
  onOpenAdvisor: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenValuation,
  onOpenAdvisor,
}) => {
  const { t, language } = useLanguage();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickKeyword, setQuickKeyword] = useState('');
  const [quickLocation, setQuickLocation] = useState('');
  const [quickType, setQuickType] = useState('ALL');

  useEffect(() => {
    api.get<{ content: Property[] }>('/api/properties?size=6&status=ACTIVE')
      .then(res => {
        setFeaturedProperties(res.content || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('properties', {
      keyword: quickKeyword,
      location: quickLocation,
      propertyType: quickType,
    });
  };

  return (
    <div className="space-y-16 lg:space-y-24">
      {/* Hero Section */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4 sm:px-6 lg:px-8 py-20">
        {/* Background architectural image with dark overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85"
            alt="Luxury Architecture"
            className="w-full h-full object-cover opacity-35 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('hero.badge')}</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight max-w-4xl mx-auto text-balance">
            {t('hero.title')}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {t('hero.subtitle')}
          </p>

          {/* Quick Multi-Criteria Search Widget */}
          <div className="pt-4 max-w-4xl mx-auto">
            <form
              onSubmit={handleHeroSearch}
              className="bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-2xl border border-white/20 text-slate-900 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-left"
            >
              <div className="sm:col-span-4 relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">
                  {t('search.keywordLabel')}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t('search.keywordPlaceholder')}
                    value={quickKeyword}
                    onChange={e => setQuickKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="sm:col-span-4 relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">
                  {t('search.locationLabel')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t('search.locationPlaceholder')}
                    value={quickLocation}
                    onChange={e => setQuickLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">
                  {t('search.propertyType')}
                </label>
                <select
                  value={quickType}
                  onChange={e => setQuickType(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 cursor-pointer"
                >
                  <option value="ALL">{t('type.ALL')}</option>
                  <option value="HOUSE">{t('type.HOUSE')}</option>
                  <option value="APARTMENT">{t('type.APARTMENT')}</option>
                  <option value="LAND">{t('type.LAND')}</option>
                  <option value="VILLA">{t('type.VILLA')}</option>
                  <option value="CONDO">{t('type.CONDO')}</option>
                  <option value="COMMERCIAL">{t('type.COMMERCIAL')}</option>
                </select>
              </div>

              <div className="sm:col-span-2 pt-5 sm:pt-4">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>{t('hero.searchBtn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Popular Sri Lankan Location Chips */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-300">
              <span className="text-[11px] text-slate-400 mr-1">Popular in Sri Lanka:</span>
              {[
                { name: 'Colombo 03', loc: 'Colombo 03' },
                { name: 'Nugegoda', loc: 'Nugegoda' },
                { name: 'Battaramulla', loc: 'Battaramulla' },
                { name: 'Kandy', loc: 'Kandy' },
                { name: 'Galle Fort', loc: 'Galle Fort' },
                { name: 'Negombo', loc: 'Negombo' },
                { name: 'Jaffna', loc: 'Jaffna' },
              ].map(chip => (
                <button
                  key={chip.name}
                  onClick={() => onNavigate('properties', { location: chip.loc })}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-amber-300 hover:text-white text-[11px] transition-colors"
                >
                  {chip.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-slate-300 text-xs">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">LKR 45B+</div>
              <span className="text-slate-400 text-[11px]">Active Marketplace Volume</span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">25 Districts</div>
              <span className="text-slate-400 text-[11px]">Island-Wide Coverage</span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">100% Verified</div>
              <span className="text-slate-400 text-[11px]">Title & Survey Inspection</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
              Curated Architectural Portfolio
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Featured Exclusive Residences
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Prime residential villas, contemporary urban condominiums, and trophy waterfront estates currently available for immediate acquisition.
            </p>
          </div>

          <button
            onClick={() => onNavigate('properties')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <span>View All Properties ({featuredProperties.length > 0 ? '12+' : '...'})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-96 rounded-2xl bg-slate-100 animate-pulse border border-slate-200"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredProperties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => onNavigate('detail', property.id)}
                onOpenValuation={onOpenValuation}
              />
            ))}
          </div>
        )}
      </section>

      {/* Platform Value Pillars Section */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
              The Nexus Standard
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for Modern Property Transactions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Every participant—buyer, property owner, licensed broker, and administrator—operates within dedicated, verified workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Multi-Criteria Search & Filtering
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter across price boundaries, architectural classifications, square footage, and specific amenities with indexed database query speeds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Direct Viewing Scheduling
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated conflict detection prevents double booking. Book private showings directly into authorized agent calendars with real-time confirmations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                AI Institutional Valuation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Powered by Gemini 3.1 Pro Preview with High Thinking Level, calculate submarket fair value, cap rates, replacement costs, and 5-year capital appreciation bands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Advisory Callout Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-left">
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Strategic Real Estate Intelligence
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Have Questions Regarding Market Dynamics or Valuation?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Consult the Nexus AI Strategic Advisor. Ask complex queries regarding cap rate spreads, 1031 tax deferred exchanges, structural appraisals, and neighborhood appreciation trends.
            </p>
          </div>

          <button
            onClick={onOpenAdvisor}
            className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold rounded-xl shadow-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Consult AI Advisor</span>
          </button>
        </div>
      </section>
    </div>
  );
};
