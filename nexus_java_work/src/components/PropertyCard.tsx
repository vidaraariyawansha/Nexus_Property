import React, { useState } from 'react';
import { Property } from '../types';
import { Bed, Bath, Maximize2, MapPin, Heart, Star, Sparkles, Scale, Check, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api/client';
import { formatCurrency, formatPerSqFt } from '../utils/currency';
import { formatPropertyArea, sqFtToPerches } from '../utils/areaUnits';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  isSaved?: boolean;
  onToggleSave?: (propertyId: string, newState: boolean) => void;
  onOpenValuation?: (propertyId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (propertyId: string, inCompare: boolean) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onClick,
  isSaved = false,
  onToggleSave,
  onOpenValuation,
  isInCompare = false,
  onToggleCompare,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [inCompare, setInCompare] = useState(isInCompare);
  const [comparing, setComparing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setFeedbackMsg('Sign in to save properties');
      setTimeout(() => setFeedbackMsg(null), 2500);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ saved: boolean }>('/api/wishlist/toggle', { propertyId: property.id });
      setSaved(res.saved);
      if (onToggleSave) onToggleSave(property.id, res.saved);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setFeedbackMsg('Sign in to compare properties');
      setTimeout(() => setFeedbackMsg(null), 2500);
      return;
    }
    setComparing(true);
    try {
      const res = await api.post<{ added: boolean; message: string }>('/api/comparisons/quick-add', {
        propertyId: property.id,
      });
      setInCompare(true);
      setFeedbackMsg(res.added ? 'Added to My Comparisons' : 'Already in comparisons');
      setTimeout(() => setFeedbackMsg(null), 2500);
      if (onToggleCompare) onToggleCompare(property.id, true);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Cannot add to comparison');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setComparing(false);
    }
  };

  const handleValuationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenValuation) onOpenValuation(property.id);
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
  const displayImage = property.primaryImage || fallbackImage;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Property Visual Box */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={displayImage}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Status indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm backdrop-blur-md ${
              property.status === 'ACTIVE'
                ? 'bg-slate-900/90 text-white'
                : property.status === 'PENDING_APPROVAL'
                ? 'bg-amber-600/90 text-white'
                : property.status === 'UNDER_CONTRACT'
                ? 'bg-indigo-600/90 text-white'
                : property.status === 'SOLD'
                ? 'bg-rose-700/90 text-white'
                : 'bg-slate-700/90 text-white'
            }`}
          >
            {property.status.replace('_', ' ')}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-slate-800 backdrop-blur-md">
            {property.propertyType}
          </span>
        </div>

        {/* Top Right Actions: Wishlist, Compare, and AI Valuation shortcut */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {onOpenValuation && (
            <button
              onClick={handleValuationClick}
              className="p-2 rounded-full bg-white/90 hover:bg-white text-indigo-700 shadow-md backdrop-blur-md transition-colors"
              title="AI Valuation & Investment Report"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </button>
          )}

          <button
            onClick={handleToggleCompare}
            disabled={comparing}
            className={`px-2 py-1.5 rounded-full shadow-md backdrop-blur-md transition-colors flex items-center gap-1 text-[11px] font-medium ${
              inCompare
                ? 'bg-slate-900 text-white'
                : 'bg-white/90 text-slate-700 hover:text-indigo-600 hover:bg-white'
            }`}
            title={inCompare ? 'In My Comparisons' : 'Add to Compare'}
          >
            {inCompare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Compared</span>
              </>
            ) : (
              <>
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Compare</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggle}
            disabled={saving}
            className={`p-2 rounded-full shadow-md backdrop-blur-md transition-colors ${
              saved
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white'
            }`}
            title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart className={`w-4 h-4 ${saved ? 'fill-rose-600' : ''}`} />
          </button>
        </div>

        {/* Inline Feedback Toast */}
        {feedbackMsg && (
          <div className="absolute top-14 right-3 z-20 px-3 py-1.5 bg-slate-900/95 text-white text-[11px] font-medium rounded-lg shadow-xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-top-1">
            {feedbackMsg}
          </div>
        )}

        {/* Rating overlay if available */}
        {property.averageRating !== undefined && property.averageRating > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-slate-900/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-md">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold">{property.averageRating.toFixed(1)}</span>
            <span className="text-slate-300 text-[10px]">({property.ratingCount})</span>
          </div>
        )}

        {/* Photo count indicator */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-medium flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors">
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>{property.images && property.images.length > 0 ? property.images.length : (property.primaryImage ? 11 : 10)} Photos</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price */}
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatCurrency(property.price, property.location, { lang: language })}
            </div>
            {property.area > 0 && (
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {formatPerSqFt(property.price, property.area, property.location, property.propertyType)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-900 transition-colors">
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>
        </div>

        {/* Specs Bar (Sri Lankan Perches for Land, Beds/Baths for Residences) */}
        {property.propertyType === 'LAND' ? (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span>{sqFtToPerches(property.area)} {t('spec.perches')}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-800">{property.area.toLocaleString()}</span>
              <span>{t('spec.sqft')}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 font-medium">Sri Lanka Land Plot</span>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800">{property.bedrooms}</span>
              <span>{t('spec.beds')}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800">{property.bathrooms}</span>
              <span>{t('spec.baths')}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800">{property.area.toLocaleString()}</span>
              <span>{t('spec.sqft')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
