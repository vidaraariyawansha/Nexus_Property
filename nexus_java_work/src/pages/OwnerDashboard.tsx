import React, { useState, useEffect } from 'react';
import { Property, PropertyType, PropertyStatus, PropertyImage } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PropertyMediaManager } from '../components/PropertyMediaManager';
import { formatCurrency } from '../utils/currency';
import {
  Building2,
  Plus,
  Image as ImageIcon,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface OwnerDashboardProps {
  onNavigate: (view: string, param?: any) => void;
  onOpenValuation: (propertyId: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigate, onOpenValuation }) => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Listing Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Image Management Modal
  const [imageModalProperty, setImageModalProperty] = useState<Property | null>(null);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showActionToast = (message: string, type: 'error' | 'success' = 'error') => {
    setActionToast({ message, type });
    setTimeout(() => setActionToast(null), 4000);
  };

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<PropertyType>('VILLA');
  const [formLocation, setFormLocation] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formBedrooms, setFormBedrooms] = useState<number | ''>(3);
  const [formBathrooms, setFormBathrooms] = useState<number | ''>(2);
  const [formArea, setFormArea] = useState<number | ''>(2400);
  const [formAmenities, setFormAmenities] = useState<string>('Swimming Pool, Ocean View, Smart Home');
  const [createFormImages, setCreateFormImages] = useState<Array<{ url: string; isPrimary: boolean; displayOrder: number }>>([
    {
      url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80',
      isPrimary: true,
      displayOrder: 0,
    },
  ]);
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchOwnerProperties = async () => {
    setLoading(true);
    try {
      const res = await api.get<Property[]>('/api/properties/owner/my-listings');
      setProperties(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerProperties();
  }, [user]);

  const handleOpenCreate = () => {
    setEditingProperty(null);
    setFormTitle('');
    setFormDesc('');
    setFormType('VILLA');
    setFormLocation('');
    setFormPrice('');
    setFormBedrooms(3);
    setFormBathrooms(2);
    setFormArea(2500);
    setFormAmenities('Swimming Pool, Garage, Smart Home, Security System');
    setCreateFormImages([
      {
        url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80',
        isPrimary: true,
        displayOrder: 0,
      },
    ]);
    setSubmitForApproval(true);
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = async (prop: Property) => {
    try {
      const full = await api.get<Property>(`/api/properties/${prop.id}`);
      setEditingProperty(full);
      setFormTitle(full.title);
      setFormDesc(full.description);
      setFormType(full.propertyType);
      setFormLocation(full.location);
      setFormPrice(full.price);
      setFormBedrooms(full.bedrooms);
      setFormBathrooms(full.bathrooms);
      setFormArea(full.area);
      setFormAmenities(full.amenities ? full.amenities.join(', ') : '');
      setSubmitForApproval(false);
      setFormError(null);
      setCreateModalOpen(true);
    } catch (err: any) {
      showActionToast(err.message || 'Failed to load property details.', 'error');
    }
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    const parsedAmenities = formAmenities
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      if (editingProperty) {
        await api.put(`/api/properties/${editingProperty.id}`, {
          title: formTitle,
          description: formDesc,
          propertyType: formType,
          location: formLocation,
          price: Number(formPrice),
          bedrooms: Number(formBedrooms),
          bathrooms: Number(formBathrooms),
          area: Number(formArea),
          amenities: parsedAmenities,
        });
        showActionToast('Property updated successfully.', 'success');
      } else {
        await api.post('/api/properties', {
          title: formTitle,
          description: formDesc,
          propertyType: formType,
          location: formLocation,
          price: Number(formPrice),
          bedrooms: Number(formBedrooms),
          bathrooms: Number(formBathrooms),
          area: Number(formArea),
          amenities: parsedAmenities,
          submitForApproval,
          images: createFormImages.length > 0 ? createFormImages : undefined,
        });
        showActionToast('Property listing created successfully.', 'success');
      }

      setCreateModalOpen(false);
      fetchOwnerProperties();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save property listing.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusTransition = async (propertyId: string, targetStatus: PropertyStatus) => {
    try {
      await api.put(`/api/properties/${propertyId}`, { status: targetStatus });
      fetchOwnerProperties();
      showActionToast('Property status updated successfully.', 'success');
    } catch (err: any) {
      showActionToast(err.message || 'Status transition failed.', 'error');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await api.delete(`/api/properties/${propertyId}`);
      fetchOwnerProperties();
      showActionToast('Property listing removed.', 'success');
    } catch (err: any) {
      showActionToast(err.message || 'Failed to delete property.', 'error');
    }
  };

  // Image Management Handlers
  const handleOpenImageManager = async (prop: Property) => {
    try {
      const full = await api.get<Property>(`/api/properties/${prop.id}`);
      setImageModalProperty(full);
    } catch (err: any) {
      showActionToast(err.message || 'Failed to load gallery.', 'error');
    }
  };

  // Metrics
  const totalCount = properties.length;
  const activeCount = properties.filter(p => p.status === 'ACTIVE').length;
  const pendingCount = properties.filter(p => p.status === 'PENDING_APPROVAL').length;
  const underContractCount = properties.filter(p => p.status === 'UNDER_CONTRACT' || p.status === 'SOLD').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative">
      {/* Toast Notification */}
      {actionToast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          actionToast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-emerald-900 text-white border-emerald-700'
        }`}>
          <span>{actionToast.message}</span>
          <button onClick={() => setActionToast(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
            Owner Listing Operations
          </span>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            Property Owner Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your real estate listings, high-resolution media galleries, and approval workflows.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Listing</span>
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Properties
          </span>
          <div className="text-3xl font-bold text-slate-900 font-mono">{totalCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">In your owner portfolio</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Active on Marketplace
          </span>
          <div className="text-3xl font-bold text-emerald-700 font-mono">{activeCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Publicly searchable</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Pending Admin Review
          </span>
          <div className="text-3xl font-bold text-amber-700 font-mono">{pendingCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">In verification queue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Under Contract / Sold
          </span>
          <div className="text-3xl font-bold text-indigo-700 font-mono">{underContractCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">In escrow or closed</span>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-slate-900">
            My Property Listings
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {properties.length} Listings Total
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-slate-900 mx-auto mb-2" />
            <span>Loading properties...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 max-w-sm mx-auto">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm mb-1">No Listings Found</p>
            <p className="mb-4">You have not created any properties yet. Click "Create New Listing" to publish your first property.</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              Create Listing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200/80 uppercase tracking-wider text-[10px] text-slate-500 font-semibold">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Specs</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.map(prop => (
                  <tr key={prop.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prop.primaryImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80'}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <span className="font-serif font-bold text-slate-900 text-sm block truncate max-w-xs sm:max-w-md">
                            {prop.title}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {prop.location} · {prop.propertyType}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(prop.price, prop.location)}
                    </td>

                    <td className="px-4 py-4 text-[11px] text-slate-600 font-mono">
                      {prop.bedrooms}b · {prop.bathrooms}ba · {prop.area.toLocaleString()} sqft
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          prop.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : prop.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : prop.status === 'UNDER_CONTRACT'
                            ? 'bg-indigo-100 text-indigo-800'
                            : prop.status === 'SOLD'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {prop.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Media Manager */}
                      <button
                        onClick={() => handleOpenImageManager(prop)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                        title="Manage Images & Media"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      {/* Edit Specs */}
                      <button
                        onClick={() => handleOpenEdit(prop)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* AI Valuation */}
                      <button
                        onClick={() => onOpenValuation(prop.id)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="AI Institutional Valuation"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      {/* Status Workflow Action Button */}
                      {prop.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusTransition(prop.id, 'PENDING_APPROVAL')}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-medium text-[11px] border border-amber-200"
                          title="Submit to Admin for public review"
                        >
                          Submit Approval
                        </button>
                      )}

                      {prop.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleStatusTransition(prop.id, 'UNDER_CONTRACT')}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg font-medium text-[11px] border border-indigo-200"
                        >
                          Mark Contract
                        </button>
                      )}

                      {prop.status === 'UNDER_CONTRACT' && (
                        <button
                          onClick={() => handleStatusTransition(prop.id, 'SOLD')}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-[11px]"
                        >
                          Mark Sold
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteProperty(prop.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE / EDIT PROPERTY MODAL --- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                {editingProperty ? 'Modify Listing' : 'New Marketplace Listing'}
              </span>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                {editingProperty ? 'Edit Property Information' : 'Publish Property Listing'}
              </h2>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveListing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Listing Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Luxury Cinnamon Gardens Contemporary Residence"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Property Classification
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as PropertyType)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 cursor-pointer"
                  >
                    <option value="VILLA">Luxury Villa</option>
                    <option value="CONDO">Condominium / Penthouse</option>
                    <option value="HOUSE">Single Family House</option>
                    <option value="APARTMENT">Modern Apartment</option>
                    <option value="COMMERCIAL">Commercial HQ</option>
                    <option value="LAND">Land / Acreage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Location (Sri Lanka District / City)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Cinnamon Gardens, Colombo 07, Western Province"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Price (LKR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="38500000"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formBedrooms}
                    onChange={e => setFormBedrooms(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formBathrooms}
                    onChange={e => setFormBathrooms(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Area (Sq Ft)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="4500"
                    value={formArea}
                    onChange={e => setFormArea(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Media Management Area */}
              <div className="pt-2">
                {!editingProperty ? (
                  <PropertyMediaManager
                    mode="create"
                    initialImages={createFormImages.map((img, idx) => ({
                      id: `img_${idx}`,
                      propertyId: '',
                      url: img.url,
                      isPrimary: img.isPrimary,
                      displayOrder: img.displayOrder,
                      createdAt: Date.now(),
                    }))}
                    onChange={setCreateFormImages}
                    showToast={showActionToast}
                  />
                ) : (
                  <PropertyMediaManager
                    mode="edit"
                    propertyId={editingProperty.id}
                    initialImages={editingProperty.images || []}
                    onImagesUpdated={updatedImages => {
                      setEditingProperty(prev => (prev ? { ...prev, images: updatedImages } : null));
                      fetchOwnerProperties();
                    }}
                    showToast={showActionToast}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Amenities (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Swimming Pool, Wine Cellar, Ocean View, Smart Home..."
                  value={formAmenities}
                  onChange={e => setFormAmenities(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Architectural Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed architectural specifications, finishes, lighting, views, and materials..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  required
                />
              </div>

              {!editingProperty && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="submitApproval"
                    checked={submitForApproval}
                    onChange={e => setSubmitForApproval(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="submitApproval" className="text-xs text-slate-700 font-medium">
                    Submit immediately for Admin review & marketplace publication
                  </label>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
                >
                  {formSubmitting ? 'Saving...' : editingProperty ? 'Save Changes' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DEDICATED MEDIA & GALLERY MANAGER MODAL --- */}
      {imageModalProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setImageModalProperty(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Media & Gallery Manager
              </span>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                {imageModalProperty.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage high-resolution photography for this listing. Upload up to 15 images with drag-and-drop, set your primary showcase cover photo, reorder with drag handles, or replace imagery.
              </p>
            </div>

            <PropertyMediaManager
              mode="edit"
              propertyId={imageModalProperty.id}
              initialImages={imageModalProperty.images || []}
              onImagesUpdated={updatedImages => {
                setImageModalProperty(prev => (prev ? { ...prev, images: updatedImages } : null));
                fetchOwnerProperties();
              }}
              showToast={showActionToast}
            />

            <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setImageModalProperty(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
              >
                Done / Close Media Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
