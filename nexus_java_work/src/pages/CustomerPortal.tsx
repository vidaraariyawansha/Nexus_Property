import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Property, Appointment, Inquiry, Complaint, PropertyComparison, ComparisonResponse } from '../types';
import { formatCurrency, formatPerSqFt } from '../utils/currency';
import { PropertyCard } from '../components/PropertyCard';
import { AppointmentModal } from '../components/AppointmentModal';
import { InquiryModal } from '../components/InquiryModal';
import {
  Heart,
  Calendar,
  HelpCircle,
  AlertTriangle,
  User,
  Lock,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  Trash2,
  AlertCircle,
  Building2,
  Scale,
  Plus,
  Pencil,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Sparkles,
  Check,
  ArrowRight,
  Eye,
  Mail,
  X,
} from 'lucide-react';

interface CustomerPortalProps {
  initialTab?: string;
  onNavigate: (view: string, param?: any) => void;
  onOpenValuation: (propertyId: string) => void;
  onOpenProfile?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  initialTab = 'overview',
  onNavigate,
  onOpenValuation,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  // Data states
  const [dashboardData, setDashboardData] = useState<{
    savedPropertiesCount: number;
    comparisonsCount?: number;
    upcomingAppointmentsCount: number;
    openInquiriesCount: number;
    openComplaintsCount: number;
    recentAppointments: any[];
    savedProperties: Property[];
    recentActivities?: any[];
  } | null>(null);

  const [wishlistProperties, setWishlistProperties] = useState<Property[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Comparisons state
  const [comparisons, setComparisons] = useState<PropertyComparison[]>([]);
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);
  const [comparisonDetails, setComparisonDetails] = useState<ComparisonResponse | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editCompName, setEditCompName] = useState('');
  const [compActionLoading, setCompActionLoading] = useState(false);
  const [compFeedback, setCompFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  // Modal triggers from comparison table
  const [appointmentProp, setAppointmentProp] = useState<Property | null>(null);
  const [inquiryProp, setInquiryProp] = useState<Property | null>(null);

  useEffect(() => {
    if (initialTab === 'comparisons') {
      setActiveTab('comparisons');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadComparisonDetails = async (compId: string) => {
    setLoadingComparison(true);
    try {
      const res = await api.get<ComparisonResponse>(`/api/comparisons/${compId}`);
      setComparisonDetails(res);
    } catch (err: any) {
      console.error('Failed to load comparison details:', err);
    } finally {
      setLoadingComparison(false);
    }
  };

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // 1. Dashboard summary
      const summary = await api.get<any>('/api/wishlist/dashboard');
      setDashboardData(summary);

      // 2. Wishlist
      const wsh = await api.get<{ items: { property?: Property }[] }>('/api/wishlist');
      const props = (wsh.items || []).map(i => i.property).filter(Boolean) as Property[];
      setWishlistProperties(props);

      // 3. Appointments
      const apts = await api.get<Appointment[]>('/api/appointments');
      setAppointments(apts);

      // 4. Inquiries
      const inqs = await api.get<Inquiry[]>('/api/feedback/inquiries');
      setInquiries(inqs);

      // 5. Complaints
      const cmps = await api.get<Complaint[]>('/api/feedback/complaints');
      setComplaints(cmps);

      // 6. Comparisons
      const comps = await api.get<PropertyComparison[]>('/api/comparisons');
      setComparisons(comps);

      const targetCompId = selectedComparisonId && comps.some(c => c.id === selectedComparisonId)
        ? selectedComparisonId
        : comps[0]?.id || null;

      setSelectedComparisonId(targetCompId);
      if (targetCompId) {
        await loadComparisonDetails(targetCompId);
      } else {
        setComparisonDetails(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [user]);

  const handleSelectComparison = async (compId: string) => {
    setSelectedComparisonId(compId);
    await loadComparisonDetails(compId);
  };

  const handleCreateComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCompName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      setCompFeedback({ text: 'Comparison name must be between 2 and 100 characters.', error: true });
      return;
    }

    setCompActionLoading(true);
    setCompFeedback(null);
    try {
      const created = await api.post<PropertyComparison>('/api/comparisons', { name: trimmed });
      setNewCompName('');
      setShowCreateModal(false);
      setCompFeedback({ text: `Comparison "${created.name}" created successfully!` });
      setTimeout(() => setCompFeedback(null), 3000);

      // Refresh list and select new comparison
      const comps = await api.get<PropertyComparison[]>('/api/comparisons');
      setComparisons(comps);
      setSelectedComparisonId(created.id);
      await loadComparisonDetails(created.id);
    } catch (err: any) {
      setCompFeedback({ text: err.message || 'Failed to create comparison.', error: true });
    } finally {
      setCompActionLoading(false);
    }
  };

  const handleRenameComparison = async (compId: string) => {
    const trimmed = editCompName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      setCompFeedback({ text: 'Comparison name must be between 2 and 100 characters.', error: true });
      return;
    }

    setCompActionLoading(true);
    try {
      const updated = await api.put<PropertyComparison>(`/api/comparisons/${compId}`, { name: trimmed });
      setEditingCompId(null);
      setEditCompName('');
      setCompFeedback({ text: `Renamed to "${updated.name}".` });
      setTimeout(() => setCompFeedback(null), 3000);

      // Update in state
      setComparisons(prev => prev.map(c => c.id === compId ? { ...c, name: updated.name } : c));
      if (comparisonDetails && comparisonDetails.comparison.id === compId) {
        setComparisonDetails({
          ...comparisonDetails,
          comparison: { ...comparisonDetails.comparison, name: updated.name },
        });
      }
    } catch (err: any) {
      setCompFeedback({ text: err.message || 'Failed to rename comparison.', error: true });
    } finally {
      setCompActionLoading(false);
    }
  };

  const handleDeleteComparison = async (compId: string) => {
    if (!window.confirm('Are you sure you want to delete this comparison list?')) {
      return;
    }

    setCompActionLoading(true);
    try {
      await api.delete(`/api/comparisons/${compId}`);
      setCompFeedback({ text: 'Comparison list deleted.' });
      setTimeout(() => setCompFeedback(null), 3000);

      const comps = await api.get<PropertyComparison[]>('/api/comparisons');
      setComparisons(comps);
      const nextId = comps[0]?.id || null;
      setSelectedComparisonId(nextId);
      if (nextId) {
        await loadComparisonDetails(nextId);
      } else {
        setComparisonDetails(null);
      }
    } catch (err: any) {
      setCompFeedback({ text: err.message || 'Failed to delete comparison.', error: true });
    } finally {
      setCompActionLoading(false);
    }
  };

  const handleRemovePropertyFromComp = async (propId: string) => {
    if (!selectedComparisonId) return;
    try {
      const updated = await api.delete<ComparisonResponse>(
        `/api/comparisons/${selectedComparisonId}/properties/${propId}`
      );
      setComparisonDetails(updated);
      setComparisons(prev =>
        prev.map(c => c.id === selectedComparisonId ? { ...c, itemCount: (c.itemCount || 1) - 1 } : c)
      );
      setCompFeedback({ text: 'Property removed from comparison.' });
      setTimeout(() => setCompFeedback(null), 2500);
    } catch (err: any) {
      setCompFeedback({ text: err.message || 'Failed to remove property.', error: true });
    }
  };

  const handleToggleWishlistFromComp = async (propId: string) => {
    try {
      const res = await api.post<{ saved: boolean }>('/api/wishlist/toggle', { propertyId: propId });
      // Refresh wishlist
      const wsh = await api.get<{ items: { property?: Property }[] }>('/api/wishlist');
      const props = (wsh.items || []).map(i => i.property).filter(Boolean) as Property[];
      setWishlistProperties(props);
      setCompFeedback({ text: res.saved ? 'Saved to your favorites wishlist!' : 'Removed from favorites wishlist.' });
      setTimeout(() => setCompFeedback(null), 2500);
    } catch (err: any) {
      setCompFeedback({ text: err.message || 'Failed to update wishlist.', error: true });
    }
  };

  const handleCancelAppointment = async (aptId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;
    try {
      await api.post(`/api/appointments/${aptId}/action`, {
        action: 'CANCEL',
        reason,
      });
      fetchPortalData();
    } catch (err: any) {
      setCompFeedback({ text: err.message || 'Failed to cancel appointment.', error: true });
    }
  };

  const handleRemoveFromWishlist = async (propId: string) => {
    try {
      await api.post('/api/wishlist/toggle', { propertyId: propId });
      setWishlistProperties(prev => prev.filter(p => p.id !== propId));
      fetchPortalData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900 mb-3" />
        <p className="text-xs text-slate-500">Synchronizing your personal customer portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-bold font-serif text-2xl flex items-center justify-center shrink-0">
            {user?.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome, {user?.fullName}
              </h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                Verified Buyer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Personalized customer hub for saved residences, scheduled viewing tours, and direct brokerage tickets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <button
            onClick={() => onNavigate('properties')}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            Browse Marketplace
          </button>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 mb-8 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'saved'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Saved Wishlist ({dashboardData?.savedPropertiesCount || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('comparisons')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'comparisons'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>My Comparisons ({comparisons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'appointments'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>My Viewings ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'inquiries'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Inquiries ({inquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'complaints'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Complaints & Issues ({complaints.length})</span>
        </button>
      </div>

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* 5 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div
              onClick={() => setActiveTab('saved')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Saved Properties
              </span>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {dashboardData?.savedPropertiesCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">In your favorites wishlist</span>
            </div>

            <div
              onClick={() => setActiveTab('comparisons')}
              className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs cursor-pointer hover:border-indigo-300 transition-colors bg-gradient-to-br from-white to-indigo-50/30"
            >
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Comparisons
              </span>
              <div className="text-3xl font-bold text-indigo-950 font-mono">
                {dashboardData?.comparisonsCount !== undefined ? dashboardData.comparisonsCount : comparisons.length}
              </div>
              <span className="text-[11px] text-indigo-600/80 mt-1 block">Side-by-side shortlists</span>
            </div>

            <div
              onClick={() => setActiveTab('appointments')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Upcoming Viewings
              </span>
              <div className="text-3xl font-bold text-indigo-700 font-mono">
                {dashboardData?.upcomingAppointmentsCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Scheduled walkthroughs</span>
            </div>

            <div
              onClick={() => setActiveTab('inquiries')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Open Inquiries
              </span>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {dashboardData?.openInquiriesCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Awaiting broker response</span>
            </div>

            <div
              onClick={() => setActiveTab('complaints')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Open Issues
              </span>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {dashboardData?.openComplaintsCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Under operations review</span>
            </div>
          </div>

          {/* Upcoming Viewings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Next Upcoming Property Viewings
              </h2>
              <button
                onClick={() => setActiveTab('appointments')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View all viewings →
              </button>
            </div>

            {(!dashboardData?.recentAppointments || dashboardData.recentAppointments.length === 0) ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                You have no upcoming viewing appointments. Explore properties and click "Schedule Viewing" to book a private tour.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.recentAppointments.map((apt: any) => (
                  <div key={apt.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 items-center">
                    <img
                      src={apt.propertyImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {apt.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(apt.appointmentTime).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-serif text-sm font-bold text-slate-900 truncate">
                        {apt.propertyTitle}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        Agent: {apt.agentName} · Time: {new Date(apt.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Saved Properties Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Recently Saved to Wishlist
              </h2>
              <button
                onClick={() => setActiveTab('saved')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View all saved ({dashboardData?.savedPropertiesCount || 0}) →
              </button>
            </div>

            {(!dashboardData?.savedProperties || dashboardData.savedProperties.length === 0) ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                You haven't saved any properties yet. Click the heart icon on any listing to add it to your portfolio.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardData.savedProperties.slice(0, 3).map(p => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    onClick={() => onNavigate('detail', p.id)}
                    isSaved={true}
                    onOpenValuation={onOpenValuation}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-0.5">
                  Verified Audit Trail
                </span>
                <h2 className="font-serif text-xl font-bold text-slate-900">
                  Recent Account Activity
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Real-time event logging
              </span>
            </div>

            {(!dashboardData?.recentActivities || dashboardData.recentActivities.length === 0) ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                No recent activity recorded yet. As you browse, compare properties, and schedule viewing walkthroughs, your verified activity trail will appear here.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                {dashboardData.recentActivities.map((act: any) => (
                  <div key={act.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block truncate">
                          {act.details || act.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Event: {act.action} · Scope: {act.entityType}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(act.createdAt).toLocaleDateString()} {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: SAVED WISHLIST --- */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                My Saved Properties Portfolio
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Curated residences you have bookmarked for comparative evaluation.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
              {wishlistProperties.length} Saved
            </span>
          </div>

          {wishlistProperties.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-6">
              <Heart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1">
                Your Wishlist is Empty
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Explore our current architectural marketplace and save residences you love.
              </p>
              <button
                onClick={() => onNavigate('properties')}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
              >
                Explore Properties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistProperties.map(p => (
                <div key={p.id} className="relative group">
                  <PropertyCard
                    property={p}
                    onClick={() => onNavigate('detail', p.id)}
                    isSaved={true}
                    onToggleSave={() => handleRemoveFromWishlist(p.id)}
                    onOpenValuation={onOpenValuation}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: VIEWING APPOINTMENTS --- */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                My Viewing Appointments
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage walkthrough times, assigned broker schedules, and tour states.
              </p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-6">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1">
                No Appointments Booked
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Schedule your first private viewing on any active property detail page.
              </p>
              <button
                onClick={() => onNavigate('properties')}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
              >
                Browse Listings
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 text-xs">
              {appointments.map(apt => (
                <div key={apt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={apt.propertyImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'REQUESTED'
                              ? 'bg-amber-100 text-amber-800'
                              : apt.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {apt.status}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {new Date(apt.appointmentTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(apt.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4
                        onClick={() => onNavigate('detail', apt.propertyId)}
                        className="font-serif text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                      >
                        {apt.propertyTitle}
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Location: {apt.propertyLocation} · Broker: <strong>{apt.agentName}</strong> ({apt.agentPhone || apt.agentEmail})
                      </p>
                      {apt.notes && (
                        <p className="text-slate-600 text-[11px] mt-1 bg-slate-50 p-1.5 rounded">
                          Notes: "{apt.notes}"
                        </p>
                      )}
                      {apt.cancellationReason && (
                        <p className="text-rose-600 text-[11px] mt-1">
                          Cancellation Reason: {apt.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onNavigate('detail', apt.propertyId)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      View Property
                    </button>
                    {(apt.status === 'REQUESTED' || apt.status === 'CONFIRMED') && (
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: MY INQUIRIES --- */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                Property Inquiries & Disclosures
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track formal question tickets and responses dispatched by certified brokers.
              </p>
            </div>
          </div>

          {inquiries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-6 text-xs text-slate-500">
              You haven't submitted any inquiries yet. Click "Submit Property Inquiry" on any listing to ask questions.
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map(inq => (
                <div key={inq.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {inq.ticketId}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          inq.status === 'RESOLVED' || inq.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inq.status === 'IN_PROGRESS'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Logged {new Date(inq.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-sm font-bold text-slate-900 mb-1">
                      {inq.subject}
                    </h4>
                    <p className="text-xs text-slate-500 mb-2">
                      Regarding: <strong className="text-slate-800">{inq.propertyTitle}</strong>
                    </p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      "{inq.message}"
                    </p>
                  </div>

                  {inq.response && (
                    <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Broker Response ({inq.assignedAgentName || 'Agent Desk'})</span>
                      </div>
                      <p className="text-xs text-indigo-950 leading-relaxed pt-1">
                        {inq.response}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 5: MY COMPLAINTS --- */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                Formal Issues & Complaints Tracking
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every grievance is assigned a tracked resolution ticket audited by executive administration.
              </p>
            </div>
          </div>

          {complaints.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-6 text-xs text-slate-500">
              You have no active or historical complaint tickets registered.
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map(cmp => (
                <div key={cmp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {cmp.ticketId}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          cmp.status === 'RESOLVED' || cmp.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cmp.status === 'IN_PROGRESS'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cmp.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Filed on {new Date(cmp.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-sm font-bold text-slate-900 mb-1">
                      {cmp.subject}
                    </h4>
                    {cmp.propertyTitle && (
                      <p className="text-xs text-slate-500 mb-2">
                        Referenced Listing: {cmp.propertyTitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {cmp.description}
                    </p>
                  </div>

                  {cmp.resolution && (
                    <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Administrative Resolution Statement</span>
                      </div>
                      <p className="text-xs text-emerald-950 leading-relaxed pt-1">
                        {cmp.resolution}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB: MY COMPARISONS --- */}
      {activeTab === 'comparisons' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>My Property Comparisons</span>
                <span className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {comparisons.length} Lists
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Evaluate residences side-by-side across price, floor area, bedrooms, and status. Maximum 4 properties per comparison.
              </p>
            </div>

            <button
              onClick={() => {
                setNewCompName('');
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Create Comparison</span>
            </button>
          </div>

          {/* Feedback banner */}
          {compFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between animate-in fade-in ${
                compFeedback.error
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {compFeedback.error ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{compFeedback.text}</span>
              </div>
              <button
                onClick={() => setCompFeedback(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {comparisons.length === 0 ? (
            /* Empty State: Zero Comparisons */
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-6 space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Scale className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-slate-900">No Comparisons Yet</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
                  Create a comparison list to analyze multiple residences side-by-side before booking private walkthroughs.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewCompName('My Property Comparison');
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Create First Comparison</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comparison Tabs / Pills Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
                {comparisons.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectComparison(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
                      selectedComparisonId === c.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        selectedComparisonId === c.id
                          ? 'bg-slate-800 text-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.itemCount || 0}/4
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected Comparison Details & Toolbar */}
              {loadingComparison ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-xs text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-900 mb-2" />
                  <span>Loading comparative metrics...</span>
                </div>
              ) : comparisonDetails ? (
                <div className="space-y-6">
                  {/* Toolbar */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    {/* Title or Inline Edit */}
                    <div className="flex-1">
                      {editingCompId === comparisonDetails.comparison.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCompName}
                            onChange={e => setEditCompName(e.target.value)}
                            placeholder="Comparison Name"
                            maxLength={100}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-full max-w-sm"
                          />
                          <button
                            onClick={() => handleRenameComparison(comparisonDetails.comparison.id)}
                            disabled={compActionLoading}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCompId(null)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-xl font-bold text-slate-900">
                            {comparisonDetails.comparison.name}
                          </h3>
                          <button
                            onClick={() => {
                              setEditingCompId(comparisonDetails.comparison.id);
                              setEditCompName(comparisonDetails.comparison.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Rename comparison list"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteComparison(comparisonDetails.comparison.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete this comparison list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        Updated {new Date(comparisonDetails.comparison.updatedAt).toLocaleDateString()} · Limit 4 properties per shortlist
                      </p>
                    </div>

                    {/* Capacity Badge and Add shortcut */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-600">
                        <span className="font-medium text-slate-800">
                          {comparisonDetails.properties.length} of 4
                        </span>
                        <span>slots filled</span>
                      </div>
                      <button
                        onClick={() => onNavigate('properties')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add from Search</span>
                      </button>
                    </div>
                  </div>

                  {comparisonDetails.properties.length === 0 ? (
                    /* Empty comparison list */
                    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto my-6 space-y-4">
                      <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-serif text-lg font-bold text-slate-900">No properties in this comparison</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Add properties from the search listings or property details page to compare them side-by-side.
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigate('properties')}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
                      >
                        <span>Browse Properties</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Factual Highlights Box (when 2+ properties) */}
                      {comparisonDetails.properties.length > 1 && (
                        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm border border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                                Lowest Price
                              </span>
                              <span className="font-mono text-sm font-bold text-emerald-300 block">
                                {(() => {
                                  const lp = comparisonDetails.properties.find(p => p.id === comparisonDetails.highlights?.lowestPricePropertyId);
                                  return lp ? formatCurrency(lp.price, lp.location) : '—';
                                })()}
                              </span>
                              <span className="text-[11px] text-slate-300 truncate block">
                                {comparisonDetails.properties.find(p => p.id === comparisonDetails.highlights?.lowestPricePropertyId)?.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                                Largest Living Area
                              </span>
                              <span className="font-mono text-sm font-bold text-indigo-300 block">
                                {comparisonDetails.properties.find(p => p.id === comparisonDetails.highlights?.largestAreaPropertyId)?.area.toLocaleString() || '—'} sq ft
                              </span>
                              <span className="text-[11px] text-slate-300 truncate block">
                                {comparisonDetails.properties.find(p => p.id === comparisonDetails.highlights?.largestAreaPropertyId)?.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                              <Bed className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                                Most Bedrooms
                              </span>
                              <span className="font-mono text-sm font-bold text-amber-300 block">
                                {comparisonDetails.properties.find(p => p.id === comparisonDetails.highlights?.mostBedroomsPropertyId)?.bedrooms || 0} Beds
                              </span>
                              <span className="text-[11px] text-slate-300 truncate block">
                                {comparisonDetails.properties.find(p => p.id === comparisonDetails.highlights?.mostBedroomsPropertyId)?.title}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Side-by-Side Comparison Matrix */}
                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/70">
                                <th className="p-4 w-44 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  Property Attribute
                                </th>
                                {comparisonDetails.properties.map(p => (
                                  <th key={p.id} className="p-4 min-w-[240px] max-w-[280px]">
                                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 mb-3 border border-slate-200/80">
                                      <img
                                        src={p.primaryImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'}
                                        alt={p.title}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute top-2 left-2 flex items-center gap-1">
                                        <span
                                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded shadow-xs ${
                                            p.status === 'ACTIVE'
                                              ? 'bg-slate-900/90 text-white'
                                              : p.status === 'SOLD'
                                              ? 'bg-rose-700/90 text-white'
                                              : 'bg-amber-600/90 text-white'
                                          }`}
                                        >
                                          {p.status.replace('_', ' ')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="font-serif font-bold text-sm text-slate-900 truncate">
                                      {p.title}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{p.location}</span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {/* Price Row */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Listing Price
                                </td>
                                {comparisonDetails.properties.map(p => {
                                  const isLowest = p.id === comparisonDetails.highlights?.lowestPricePropertyId && comparisonDetails.properties.length > 1;
                                  return (
                                    <td key={p.id} className="p-4 font-mono">
                                      <div className="text-lg font-bold text-slate-900">
                                        {formatCurrency(p.price, p.location)}
                                      </div>
                                      {p.area > 0 && (
                                        <span className="text-[11px] text-slate-400">
                                          {formatPerSqFt(p.price, p.area, p.location)}
                                        </span>
                                      )}
                                      {isLowest && (
                                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Lowest Price
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Property Type */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Property Type
                                </td>
                                {comparisonDetails.properties.map(p => (
                                  <td key={p.id} className="p-4">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-medium text-[11px]">
                                      {p.propertyType}
                                    </span>
                                  </td>
                                ))}
                              </tr>

                              {/* Bedrooms */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Bedrooms
                                </td>
                                {comparisonDetails.properties.map(p => {
                                  const isMost = p.id === comparisonDetails.highlights?.mostBedroomsPropertyId && comparisonDetails.properties.length > 1;
                                  return (
                                    <td key={p.id} className="p-4 font-medium">
                                      <div className="flex items-center gap-1.5">
                                        <Bed className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-900">{p.bedrooms}</span>
                                        <span className="text-slate-500">Beds</span>
                                        {isMost && (
                                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ml-1">
                                            Most
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Bathrooms */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Bathrooms
                                </td>
                                {comparisonDetails.properties.map(p => (
                                  <td key={p.id} className="p-4 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <Bath className="w-4 h-4 text-slate-400" />
                                      <span className="text-sm font-bold text-slate-900">{p.bathrooms}</span>
                                      <span className="text-slate-500">Baths</span>
                                    </div>
                                  </td>
                                ))}
                              </tr>

                              {/* Floor Area */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Living Area
                                </td>
                                {comparisonDetails.properties.map(p => {
                                  const isLargest = p.id === comparisonDetails.highlights?.largestAreaPropertyId && comparisonDetails.properties.length > 1;
                                  return (
                                    <td key={p.id} className="p-4 font-medium">
                                      <div className="flex items-center gap-1.5">
                                        <Maximize2 className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-900 font-mono">
                                          {p.area.toLocaleString()}
                                        </span>
                                        <span className="text-slate-500">sq ft</span>
                                        {isLargest && (
                                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ml-1">
                                            Largest
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Status Notification */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Listing Status
                                </td>
                                {comparisonDetails.properties.map(p => (
                                  <td key={p.id} className="p-4">
                                    {p.status === 'ACTIVE' ? (
                                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Active & Available</span>
                                      </span>
                                    ) : p.status === 'SOLD' ? (
                                      <span className="text-rose-700 font-medium flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>⚠ Property Sold</span>
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Property {p.status.replace('_', ' ')}</span>
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </tr>

                              {/* Key Amenities */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Amenities
                                </td>
                                {comparisonDetails.properties.map(p => (
                                  <td key={p.id} className="p-4">
                                    <div className="flex flex-wrap gap-1 max-w-[260px]">
                                      {p.amenities && p.amenities.length > 0 ? (
                                        p.amenities.slice(0, 4).map((a, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium"
                                          >
                                            {a}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">—</span>
                                      )}
                                      {p.amenities && p.amenities.length > 4 && (
                                        <span className="text-[10px] text-slate-400 self-center">
                                          +{p.amenities.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                ))}
                              </tr>

                              {/* Listing Representation */}
                              <tr className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/30">
                                  Representation
                                </td>
                                {comparisonDetails.properties.map(p => (
                                  <td key={p.id} className="p-4 text-xs text-slate-700">
                                    <div className="font-serif font-bold text-slate-900 truncate">
                                      {p.ownerName || 'Verified Principal'}
                                    </div>
                                    <span className="text-[11px] text-slate-500">Nexus Licensed Brokerage</span>
                                  </td>
                                ))}
                              </tr>

                              {/* Action Buttons Row */}
                              <tr className="bg-slate-50/40">
                                <td className="p-4 font-semibold text-slate-600 bg-slate-50/60">
                                  Decision Actions
                                </td>
                                {comparisonDetails.properties.map(p => {
                                  const inWishlist = wishlistProperties.some(wp => wp.id === p.id);
                                  return (
                                    <td key={p.id} className="p-4 space-y-2">
                                      <button
                                        onClick={() => onNavigate('detail', p.id)}
                                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View Property</span>
                                      </button>

                                      <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                          onClick={() => handleToggleWishlistFromComp(p.id)}
                                          className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                                            inWishlist
                                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                          }`}
                                          title={inWishlist ? 'In your wishlist' : 'Save to wishlist'}
                                        >
                                          <Heart className={`w-3.5 h-3.5 ${inWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
                                          <span className="text-[11px]">{inWishlist ? 'Saved' : 'Wishlist'}</span>
                                        </button>

                                        <button
                                          onClick={() => setInquiryProp(p)}
                                          className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center justify-center gap-1"
                                          title="Contact broker"
                                        >
                                          <Mail className="w-3.5 h-3.5 text-slate-600" />
                                          <span className="text-[11px]">Inquire</span>
                                        </button>
                                      </div>

                                      <button
                                        onClick={() => setAppointmentProp(p)}
                                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                      >
                                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Book Viewing</span>
                                      </button>

                                      <button
                                        onClick={() => handleRemovePropertyFromComp(p.id)}
                                        className="w-full py-1 text-slate-400 hover:text-rose-600 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Remove from list</span>
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Create Comparison Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Scale className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    Create Comparison List
                  </h3>
                  <p className="text-xs text-slate-500">Side-by-side property shortlist</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComparison} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Comparison List Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  minLength={2}
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  placeholder="e.g., Colombo Family Properties"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be between 2 and 100 characters.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={compActionLoading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {compActionLoading ? 'Creating...' : 'Create Comparison'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal mounted for comparison table action */}
      {appointmentProp && (
        <AppointmentModal
          property={appointmentProp}
          isOpen={Boolean(appointmentProp)}
          onClose={() => setAppointmentProp(null)}
          onSuccess={() => {
            setCompFeedback({ text: 'Viewing tour requested successfully!' });
            setTimeout(() => setCompFeedback(null), 3000);
            fetchPortalData();
          }}
        />
      )}

      {/* Inquiry Modal mounted for comparison table action */}
      {inquiryProp && (
        <InquiryModal
          property={inquiryProp}
          isOpen={Boolean(inquiryProp)}
          onClose={() => setInquiryProp(null)}
          onSuccess={() => {
            setCompFeedback({ text: 'Inquiry submitted to listing representation.' });
            setTimeout(() => setCompFeedback(null), 3000);
            fetchPortalData();
          }}
        />
      )}
    </div>
  );
};

