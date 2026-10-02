import React, { useState, useEffect } from 'react';
import { Property, Rating, PublicUserProfileResponse } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/initials';
import { formatCurrency, formatPerSqFt } from '../utils/currency';
import { AppointmentModal } from '../components/AppointmentModal';
import { InquiryModal } from '../components/InquiryModal';
import { ComplaintModal } from '../components/ComplaintModal';
import { RatingModal } from '../components/RatingModal';
import { getAllDistrictNames, getProvinceForDistrict } from '../utils/sriLankaGeo';
import { sqFtToPerches, formatPropertyArea } from '../utils/areaUnits';
import { PropertyCard } from '../components/PropertyCard';
import {
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  Heart,
  HelpCircle,
  AlertTriangle,
  Star,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  Building,
  User,
  Phone,
  Mail,
  Loader2,
  MessageSquare,
  Award,
  Globe2,
  Briefcase,
  X,
  Scale,
  Info,
  Camera,
  Play,
  Pause,
  RefreshCw,
  Layers,
  Compass,
} from 'lucide-react';

interface PropertyDetailPageProps {
  propertyId: string;
  onBack: () => void;
  onOpenValuation: (propertyId: string) => void;
  onNavigate?: (view: string, param?: any) => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  propertyId,
  onBack,
  onOpenValuation,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [agentProfile, setAgentProfile] = useState<PublicUserProfileResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareFeedback, setCompareFeedback] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewAgentModal, setViewAgentModal] = useState<boolean>(false);

  // Fullscreen Lightbox gallery state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Advanced Media Gallery & Virtual Walkthrough states
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState<string>('ALL');
  const [isWalkthroughActive, setIsWalkthroughActive] = useState<boolean>(false);
  const [aiStudioModalOpen, setAiStudioModalOpen] = useState<boolean>(false);
  const [photoBlueprint, setPhotoBlueprint] = useState<any>(null);
  const [loadingBlueprint, setLoadingBlueprint] = useState<boolean>(false);
  const [regeneratingPhotos, setRegeneratingPhotos] = useState<boolean>(false);

  // Recently Viewed properties
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals state
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  const fetchPropertyData = async () => {
    try {
      const propData = await api.get<Property>(`/api/properties/${propertyId}`);
      setProperty(propData);
      setSelectedImage(propData.primaryImage || propData.images?.[0]?.url || '');

      const ratingsData = await api.get<Rating[]>(`/api/feedback/ratings/property/${propertyId}`);
      setRatings(ratingsData);

      // Fetch verified public profile of the listing owner/agent
      try {
        const agentData = await api.get<PublicUserProfileResponse>(`/api/profile/public/${propData.ownerId}`);
        setAgentProfile(agentData);
      } catch (agentErr) {
        // Fallback to basic owner info from property
        setAgentProfile({
          userId: propData.ownerId,
          fullName: propData.ownerName || 'Verified Property Owner',
          role: 'PROPERTY_OWNER',
          isVerified: true,
          phoneVisibility: 'REGISTERED',
          emailVisibility: 'REGISTERED',
          whatsappVisibility: 'REGISTERED',
        });
      }

      if (user && (user.role === 'CUSTOMER' || user.role === 'ADMIN')) {
        const wishlist = await api.get<{ items: { propertyId: string }[] }>('/api/wishlist');
        const hasSaved = wishlist.items?.some(i => i.propertyId === propertyId);
        setIsSaved(Boolean(hasSaved));

        try {
          const compIds = await api.get<string[]>('/api/comparisons/property-ids');
          setInCompare(compIds.includes(propertyId));
        } catch {
          // ignore if comparisons not available
        }
      }

      // Update client-side local cache of recently viewed properties
      try {
        const stored = JSON.parse(localStorage.getItem('nexus_recently_viewed') || '[]') as Property[];
        const filtered = [propData, ...stored.filter(p => p.id !== propData.id)].slice(0, 10);
        localStorage.setItem('nexus_recently_viewed', JSON.stringify(filtered));
      } catch {}

      // Fetch recently viewed residences
      try {
        if (user) {
          const res = await api.get<any>('/api/properties/user/recently-viewed');
          const list = Array.isArray(res) ? res : res.data || [];
          setRecentlyViewed(list.filter((p: Property) => p.id !== propertyId).slice(0, 3));
        } else {
          const stored = JSON.parse(localStorage.getItem('nexus_recently_viewed') || '[]') as Property[];
          setRecentlyViewed(stored.filter(p => p.id !== propertyId).slice(0, 3));
        }
      } catch {
        // Ignore
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId, user]);

  // Automated Virtual Walkthrough Timer Effect
  useEffect(() => {
    let timer: any = null;
    if (isWalkthroughActive && property?.images && property.images.length > 1) {
      timer = setInterval(() => {
        setSelectedImage((curr) => {
          const imgs = property.images || [];
          const idx = imgs.findIndex(i => i.url === curr);
          const nextIdx = (idx + 1) % imgs.length;
          return imgs[nextIdx]?.url || curr;
        });
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWalkthroughActive, property]);

  const handleOpenAiStudio = async () => {
    setAiStudioModalOpen(true);
    if (!photoBlueprint) {
      setLoadingBlueprint(true);
      try {
        const res = await api.get<any>(`/api/properties/${propertyId}/photo-specs`);
        setPhotoBlueprint(res.data);
      } catch (err: any) {
        showToast(err.message || 'Failed to load photo specifications');
      } finally {
        setLoadingBlueprint(false);
      }
    }
  };

  const handleRegeneratePhotos = async () => {
    setRegeneratingPhotos(true);
    try {
      await api.post(`/api/properties/${propertyId}/generate-images`, {});
      showToast('✦ Professional AI Real-Estate Photography Suite refreshed!');
      await fetchPropertyData();
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate photography set');
    } finally {
      setRegeneratingPhotos(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      setCompareFeedback('Please sign in to save properties to your wishlist.');
      setTimeout(() => setCompareFeedback(null), 3000);
      return;
    }
    try {
      const res = await api.post<{ saved: boolean }>('/api/wishlist/toggle', { propertyId });
      setIsSaved(res.saved);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCompare = async () => {
    if (!user) {
      setCompareFeedback('Please sign in to add to My Comparisons');
      setTimeout(() => setCompareFeedback(null), 3000);
      return;
    }
    setComparing(true);
    try {
      const res = await api.post<{ added: boolean; message: string }>('/api/comparisons/quick-add', { propertyId });
      setInCompare(true);
      setCompareFeedback(res.added ? 'Added to My Comparisons' : 'Already in your comparisons');
      setTimeout(() => setCompareFeedback(null), 3000);
    } catch (err: any) {
      setCompareFeedback(err.message || 'Failed to add to comparison');
      setTimeout(() => setCompareFeedback(null), 3000);
    } finally {
      setComparing(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation for fullscreen lightbox viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') setLightboxOpen(false);
      const total = property?.images && property.images.length > 0 ? property.images.length : 1;
      if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev + 1) % total);
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev - 1 + total) % total);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, property]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900 mb-3" />
        <p className="text-xs text-slate-500">Loading verified property dossier...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold text-slate-900 mb-2">Property Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">The requested listing may have been archived or removed from the marketplace.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
        >
          Return to Properties
        </button>
      </div>
    );
  }

  const galleryImages = property.images && property.images.length > 0
    ? property.images.map(img => img.url)
    : [property.primaryImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80'];

  const currentImageObj = property.images?.find(img => img.url === (selectedImage || galleryImages[0])) || property.images?.[0];

  const filteredImages = property.images && property.images.length > 0
    ? property.images.filter(img => {
        if (photoCategoryFilter === 'ALL') return true;
        const cat = (img.category || '').toUpperCase();
        if (photoCategoryFilter === 'EXTERIOR') return cat.includes('EXTERIOR') || cat.includes('HERO') || cat.includes('FACADE');
        if (photoCategoryFilter === 'LIVING') return cat.includes('LIVING') || cat.includes('FOYER') || cat.includes('DINING') || cat.includes('DRAWING') || cat.includes('SHOWROOM');
        if (photoCategoryFilter === 'KITCHEN') return cat.includes('KITCHEN') || cat.includes('PANTRY');
        if (photoCategoryFilter === 'BEDROOM') return cat.includes('BEDROOM') || cat.includes('SUITE') || cat.includes('ALCOVE') || cat.includes('OFFICE');
        if (photoCategoryFilter === 'BATHROOM') return cat.includes('BATHROOM');
        if (photoCategoryFilter === 'OUTDOOR') return cat.includes('GARDEN') || cat.includes('POOL') || cat.includes('TERRACE') || cat.includes('VERANDAH') || cat.includes('BALCONY') || cat.includes('VIEW') || cat.includes('HOT_TUB') || cat.includes('ROAD') || cat.includes('GROVE') || cat.includes('PARKING');
        return true;
      })
    : [];

  const displayThumbnails = filteredImages.length > 0 ? filteredImages : (property.images || []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* In-app Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top back breadcrumb & quick actions */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All Listings</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1 transition-colors"
            title="Copy share link"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share'}</span>
          </button>

          <button
            onClick={handleToggleWishlist}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{isSaved ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
          </button>
        </div>
      </div>

      {/* Main Image Gallery & Architectural Photography Section */}
      <div className="space-y-3 mb-10">
        {/* Category Filter Pills & Photography Walkthrough Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setPhotoCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              All Photos ({property.images?.length || galleryImages.length})
            </button>
            <button
              onClick={() => setPhotoCategoryFilter('EXTERIOR')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'EXTERIOR'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              Exterior & Facade
            </button>
            <button
              onClick={() => setPhotoCategoryFilter('LIVING')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'LIVING'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              Living & Dining
            </button>
            <button
              onClick={() => setPhotoCategoryFilter('KITCHEN')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'KITCHEN'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              Kitchen & Pantry
            </button>
            <button
              onClick={() => setPhotoCategoryFilter('BEDROOM')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'BEDROOM'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              Bedrooms & Suites
            </button>
            <button
              onClick={() => setPhotoCategoryFilter('BATHROOM')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'BATHROOM'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              Bathrooms
            </button>
            <button
              onClick={() => setPhotoCategoryFilter('OUTDOOR')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                photoCategoryFilter === 'OUTDOOR'
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              Outdoor & Grounds
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWalkthroughActive(!isWalkthroughActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${
                isWalkthroughActive
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
              title="Auto-play walkthrough room by room"
            >
              {isWalkthroughActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isWalkthroughActive ? 'Pause Walkthrough' : 'Virtual Walkthrough'}</span>
            </button>

            <button
              onClick={handleOpenAiStudio}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition-all"
              title="Inspect AI Photography Studio Blueprint"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>✦ AI Photo Studio</span>
            </button>
          </div>
        </div>

        {/* Hero Photo Stage */}
        <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-slate-950 shadow-md group">
          <img
            src={selectedImage || galleryImages[0]}
            alt={currentImageObj?.caption || property.title}
            onClick={() => {
              const currentIdx = galleryImages.indexOf(selectedImage || galleryImages[0]);
              setLightboxIndex(currentIdx >= 0 ? currentIdx : 0);
              setLightboxOpen(true);
            }}
            className="w-full h-full object-cover transition-all duration-500 cursor-zoom-in group-hover:scale-[1.01]"
          />

          {/* Top Left Badges: Status & Type */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-md shadow-md backdrop-blur-md ${
                property.status === 'ACTIVE'
                  ? 'bg-slate-900/90 text-white'
                  : 'bg-amber-600/90 text-white'
              }`}
            >
              {property.status.replace('_', ' ')}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/90 text-slate-900 backdrop-blur-md">
              {property.propertyType}
            </span>
          </div>

          {/* Bottom Left: Architectural Photo Caption & Room Tag */}
          <div className="absolute bottom-4 left-4 max-w-xl pointer-events-none">
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-white p-3 rounded-xl shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                  {currentImageObj?.category?.replace(/_/g, ' ') || 'ARCHITECTURAL PHOTOGRAPHY'}
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  Photo {(galleryImages.indexOf(selectedImage || galleryImages[0]) + 1) || 1} of {galleryImages.length}
                </span>
              </div>
              <p className="text-xs text-slate-100 font-medium line-clamp-2">
                {currentImageObj?.caption || property.title}
              </p>
            </div>
          </div>

          {/* Bottom Right Actions */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              onClick={() => {
                const currentIdx = galleryImages.indexOf(selectedImage || galleryImages[0]);
                setLightboxIndex(currentIdx >= 0 ? currentIdx : 0);
                setLightboxOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg backdrop-blur-md transition-colors flex items-center gap-1.5"
              title="Open full-screen image viewer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Fullscreen ({galleryImages.length})</span>
            </button>

            <button
              onClick={() => onOpenValuation(property.id)}
              className="px-4 py-2 bg-indigo-900/90 hover:bg-indigo-900 text-white text-xs font-semibold rounded-xl shadow-lg backdrop-blur-md transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span>AI Valuation</span>
            </button>
          </div>
        </div>

        {/* Thumbnails Strip with Category Tags */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1">
          {displayThumbnails.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedImage(img.url)}
              className={`relative w-28 h-18 rounded-xl overflow-hidden shrink-0 border-2 transition-all flex flex-col justify-end group ${
                selectedImage === img.url
                  ? 'border-amber-400 ring-2 ring-amber-400/30 scale-95'
                  : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={img.caption || ''} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-1.5 text-left">
                <span className="text-[9px] font-semibold text-white truncate block">
                  {img.category ? img.category.replace(/_/g, ' ') : `Photo ${idx + 1}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Details Left, Action Sidebar Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column (8 cols): Specifications, Description, Amenities, Ratings */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header Info */}
          <div>
            {(() => {
              const matchedDistrict = getAllDistrictNames().find(d =>
                property.location.toLowerCase().includes(d.toLowerCase())
              ) || 'Colombo';
              const matchedProvince = getProvinceForDistrict(matchedDistrict) || 'Western';
              return (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                    {property.location}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    {matchedDistrict} District
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-500">
                    {matchedProvince} Province, Sri Lanka
                  </span>
                </div>
              );
            })()}

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              {property.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(property.price, property.location)}
              </span>
              {property.area > 0 && (
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  ({formatPerSqFt(property.price, property.area, property.location)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Listed on {property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Verified Listing'}
              </span>
            </div>
          </div>

          {/* Key Specs Card (Clean unboxed metadata with separators) */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-lg font-mono">
                <Bed className="w-5 h-5 text-slate-400" />
                <span>{property.bedrooms}</span>
              </div>
              <span className="text-xs text-slate-500">Bedrooms</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-lg font-mono">
                <Bath className="w-5 h-5 text-slate-400" />
                <span>{property.bathrooms}</span>
              </div>
              <span className="text-xs text-slate-500">Bathrooms</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-lg font-mono">
                <Maximize2 className="w-5 h-5 text-slate-400" />
                <span>{property.area.toLocaleString()}</span>
              </div>
              <span className="text-xs text-slate-500">Living Sq Ft</span>
            </div>
            {sqFtToPerches(property.area) > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <div>
                  <div className="flex items-center justify-center gap-1 text-slate-900 font-bold text-lg font-mono">
                    <span>{sqFtToPerches(property.area)}</span>
                    <span className="text-xs font-sans text-slate-500 font-normal">Perches</span>
                  </div>
                  <span className="text-xs text-slate-500">Land Extent</span>
                </div>
              </>
            )}
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-lg font-mono">
                <Building className="w-5 h-5 text-slate-400" />
                <span>{property.propertyType}</span>
              </div>
              <span className="text-xs text-slate-500">Type</span>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl font-bold text-slate-900">
              Architectural Overview & Specifications
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities Section */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Premium Amenities & Features
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {property.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-800"
                  >
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Ratings & Reviews */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  Verified Customer Reviews
                </h3>
                <p className="text-xs text-slate-500">
                  Reviews submitted by registered buyers and verified walkthrough attendees.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!user) {
                    showToast('Please sign in to rate this property.');
                    return;
                  }
                  setRatingOpen(true);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 transition-colors flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Write Review</span>
              </button>
            </div>

            {ratings.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                No reviews yet for this listing. Be the first to submit a verified rating!
              </div>
            ) : (
              <div className="space-y-3">
                {ratings.map(r => (
                  <div key={r.id} className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{r.customerName || 'Verified Buyer'}</span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < r.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Booking & Brokerage Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-5 sticky top-24">
            <div>
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Immediate Booking
              </span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(property.price, property.location)}
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Available for private verified tour
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  if (!user) {
                    showToast('Please sign in to schedule a viewing appointment.');
                    return;
                  }
                  setAppointmentOpen(true);
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Schedule Private Viewing</span>
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    showToast('Please sign in to submit a property inquiry.');
                    return;
                  }
                  setInquiryOpen(true);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <span>Submit Property Inquiry</span>
              </button>

              <button
                onClick={handleToggleCompare}
                disabled={comparing}
                className={`w-full py-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                  inCompare
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
                }`}
              >
                {inCompare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>✓ In My Comparisons</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <span>＋ Add to My Comparisons</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenValuation(property.id)}
                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Valuation Analysis</span>
              </button>

              {compareFeedback && (
                <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs text-center font-medium shadow-md animate-in fade-in">
                  {compareFeedback}
                </div>
              )}
            </div>

            {/* Listed By Section with Real Profile Data */}
            <div className="pt-5 border-t border-slate-100 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Listed By
                </span>
                {agentProfile?.isVerified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{agentProfile.role === 'AGENT' ? 'Verified Agent' : 'Verified'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-xs border border-slate-200">
                  {agentProfile?.profileImageUrl ? (
                    <img
                      src={agentProfile.profileImageUrl}
                      alt={agentProfile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-serif">{getInitials(agentProfile?.fullName || property.ownerName)}</span>
                  )}
                </div>
                <div className="text-xs min-w-0 flex-1">
                  <span className="font-serif font-bold text-slate-900 text-sm block truncate">
                    {agentProfile?.fullName || property.ownerName || 'Verified Property Owner'}
                  </span>
                  <span className="text-slate-600 text-xs block truncate">
                    {agentProfile?.jobTitle || (agentProfile?.role === 'AGENT' ? 'Property Consultant' : 'Exclusive Listing Principal')}
                  </span>
                  <span className="text-slate-400 text-[11px] block truncate">
                    {agentProfile?.company || 'Nexus Properties'}
                  </span>
                </div>
              </div>

              {/* Direct Quick Contact Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                {agentProfile?.phone ? (
                  <a
                    href={`tel:${agentProfile.phone}`}
                    className="py-2 px-1 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 font-medium transition-colors"
                    title={`Call ${agentProfile.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Call</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) showToast('Please sign in to view direct phone details.');
                      else showToast('Phone number is kept private by listing representation.');
                    }}
                    className="py-2 px-1 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 flex items-center justify-center gap-1.5 text-[11px]"
                    title="Phone Private"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-300" />
                    <span>Call</span>
                  </button>
                )}

                {agentProfile?.whatsapp ? (
                  <a
                    href={`https://wa.me/${agentProfile.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 font-medium transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) showToast('Please sign in to view WhatsApp details.');
                      else showToast('WhatsApp number is kept private by listing representation.');
                    }}
                    className="py-2 px-1 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 flex items-center justify-center gap-1.5 text-[11px]"
                    title="WhatsApp Private"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-300" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      showToast('Please sign in to message listing representation.');
                      return;
                    }
                    setInquiryOpen(true);
                  }}
                  className="py-2 px-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1.5 font-medium transition-colors"
                  title="Send Direct Inquiry"
                >
                  <Mail className="w-3.5 h-3.5 text-white" />
                  <span>Message</span>
                </button>
              </div>

              {/* View Full Profile link */}
              <button
                type="button"
                onClick={() => setViewAgentModal(true)}
                className="w-full py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/60 rounded-lg transition-colors text-center block"
              >
                View Profile & Credentials →
              </button>

              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Title & Escrow Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Licensed Agent Representation</span>
                </div>
              </div>
            </div>

            {/* Quality Grievance / Complaint link */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  if (!user) {
                    showToast('Please sign in to file an issue.');
                    return;
                  }
                  setComplaintOpen(true);
                }}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Report issue or file formal complaint</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed Residences Section */}
      {recentlyViewed.length > 0 && (
        <div className="mt-16 pt-10 border-t border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Your Browsing History
              </span>
              <h3 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
                Recently Viewed Properties
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Personalized private cache
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentlyViewed.map(rv => (
              <PropertyCard
                key={rv.id}
                property={rv}
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('detail', rv.id);
                  }
                }}
                onOpenValuation={onOpenValuation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AppointmentModal
        property={property}
        isOpen={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        onSuccess={fetchPropertyData}
      />

      <InquiryModal
        property={property}
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        onSuccess={fetchPropertyData}
      />

      <ComplaintModal
        propertyId={property.id}
        propertyTitle={property.title}
        isOpen={complaintOpen}
        onClose={() => setComplaintOpen(false)}
      />

      <RatingModal
        property={property}
        isOpen={ratingOpen}
        onClose={() => setRatingOpen(false)}
        onSuccess={fetchPropertyData}
      />

      {/* Fullscreen Lightbox Image Gallery Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white pb-4 border-b border-slate-800">
            <div>
              <h4 className="font-serif text-base font-bold truncate max-w-md sm:max-w-xl">
                {property.title}
              </h4>
              <div className="flex items-center gap-2">
                {property.images?.[lightboxIndex]?.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                    {property.images[lightboxIndex].category?.replace(/_/g, ' ')}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  Photo {lightboxIndex + 1} of {galleryImages.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Close fullscreen viewer (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image Stage with Next/Prev Arrows */}
          <div className="relative flex-1 flex flex-col items-center justify-center min-h-0 py-2">
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={galleryImages[lightboxIndex]}
                alt={`Fullscreen photo ${lightboxIndex + 1}`}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all"
              />

              {/* Caption Overlay */}
              {property.images?.[lightboxIndex]?.caption && (
                <div className="absolute bottom-4 inset-x-4 mx-auto max-w-2xl bg-slate-950/85 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl text-center">
                  <p className="text-xs font-medium text-slate-200">
                    {property.images[lightboxIndex].caption}
                  </p>
                </div>
              )}
            </div>

            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + galleryImages.length) % galleryImages.length)}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-2xl shadow-xl backdrop-blur-md border border-slate-700 transition-all hover:scale-110"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % galleryImages.length)}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-2xl shadow-xl backdrop-blur-md border border-slate-700 transition-all hover:scale-110"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2 justify-center overflow-x-auto pt-3 border-t border-slate-800 max-w-4xl mx-auto w-full">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    lightboxIndex === idx ? 'border-amber-400 scale-105 ring-2 ring-amber-400/30' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Real-Estate Photography Studio Modal */}
      {aiStudioModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">✦ AI Real-Estate Photography Studio</h3>
                  <p className="text-xs text-slate-300">
                    Architectural visual blueprint & AI image generation engine for {property.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiStudioModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                    Authentic Sri Lankan Architectural Shoot Specification
                  </h4>
                  <p className="text-xs text-indigo-800">
                    Each property image is engineered specifically for this {property.propertyType} listing in {property.location}, matching actual square footage ({property.area} sq ft), {property.bedrooms} bedrooms, and {property.bathrooms} bathrooms.
                  </p>
                </div>
                <button
                  onClick={handleRegeneratePhotos}
                  disabled={regeneratingPhotos}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingPhotos ? 'animate-spin' : ''}`} />
                  <span>{regeneratingPhotos ? 'Regenerating...' : 'Refresh Photo Set'}</span>
                </button>
              </div>

              {/* Blueprint Specifications List */}
              {loadingBlueprint ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Analyzing architectural specifications with Gemini AI...</p>
                </div>
              ) : photoBlueprint?.specifications ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Room-by-Room Photography Specifications ({photoBlueprint.specifications.length} Views)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {photoBlueprint.specifications.map((spec: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-900">{spec.roomName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {spec.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2 leading-relaxed">{spec.visualPrompt}</p>
                        <div className="text-[11px] text-slate-500 space-y-0.5 pt-1.5 border-t border-slate-200/60">
                          <div><strong className="text-slate-700">Style:</strong> {spec.architecturalStyle}</div>
                          <div><strong className="text-slate-700">Lighting:</strong> {spec.lighting}</div>
                          <div><strong className="text-slate-700">Camera:</strong> {spec.cameraSpecs}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Click 'Refresh Photo Set' to update or inspect specifications.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setAiStudioModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
