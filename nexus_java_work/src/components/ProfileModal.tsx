import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  UserProfile,
  ProfileCompleteness,
  FullUserProfileResponse,
  ContactVisibility,
  ContactMethod,
  ContactTime,
} from '../types';
import { getInitials } from '../utils/initials';
import { PhotoCropModal } from './PhotoCropModal';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  KeyRound,
  LogOut,
  Camera,
  Pencil,
  Trash2,
  Eye,
  Upload,
  Briefcase,
  Building,
  MapPin,
  Globe2,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveSection = 'personal' | 'professional' | 'security';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserProfile, logout } = useAuth();

  // Full profile state from backend
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<ActiveSection>('personal');

  // Contact form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsApp, setEditWhatsApp] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [phoneVisibility, setPhoneVisibility] = useState<ContactVisibility>('REGISTERED');
  const [emailVisibility, setEmailVisibility] = useState<ContactVisibility>('REGISTERED');
  const [whatsappVisibility, setWhatsappVisibility] = useState<ContactVisibility>('REGISTERED');
  const [preferredMethod, setPreferredMethod] = useState<ContactMethod>('PHONE');
  const [preferredTime, setPreferredTime] = useState<ContactTime>('ANY_TIME');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMsg, setContactMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Professional form state
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');
  const [areasServed, setAreasServed] = useState('');
  const [languages, setLanguages] = useState('');
  const [bio, setBio] = useState('');
  const [profLoading, setProfLoading] = useState(false);
  const [profMsg, setProfMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Photo management state
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);
  const [viewPhotoOpen, setViewPhotoOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const data = await api.get<FullUserProfileResponse>('/api/profile/me');
      setProfile(data.profile);
      setCompleteness(data.completeness);

      setEditName(data.user.fullName || '');
      setEditPhone(data.user.phone || '');
      setEditWhatsApp(data.profile.whatsapp || '');
      setSameAsPhone(Boolean(data.user.phone && data.user.phone === data.profile.whatsapp));
      setEditAddress(data.profile.address || '');
      setEditCity(data.profile.city || '');
      setEditCountry(data.profile.country || '');
      setPhoneVisibility(data.profile.phoneVisibility || 'REGISTERED');
      setEmailVisibility(data.profile.emailVisibility || 'REGISTERED');
      setWhatsappVisibility(data.profile.whatsappVisibility || 'REGISTERED');
      setPreferredMethod(data.profile.preferredContactMethod || 'PHONE');
      setPreferredTime(data.profile.preferredContactTime || 'ANY_TIME');

      setJobTitle(data.profile.jobTitle || '');
      setCompany(data.profile.company || '');
      setYearsExperience(data.profile.yearsOfExperience !== null && data.profile.yearsOfExperience !== undefined ? data.profile.yearsOfExperience : '');
      setAreasServed(data.profile.areasServed || '');
      setLanguages(data.profile.languages || '');
      setBio(data.profile.bio || '');
    } catch (err: any) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchProfileData();
      setContactMsg(null);
      setProfMsg(null);
      setPasswordMsg(null);
      setPhotoMsg(null);
      setCurrentPassword('');
      setNewPassword('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isProfessionalRole = user.role === 'AGENT' || user.role === 'PROPERTY_OWNER' || user.role === 'ADMIN';

  // Photo handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoMsg({ text: 'Unsupported image format. Please select a JPEG, PNG, or WebP file.', error: true });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg({ text: 'File exceeds 5MB limit. Please select a smaller photo.', error: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setPhotoOptionsOpen(false);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handleSaveCroppedPhoto = async (croppedDataUrl: string) => {
    setPhotoLoading(true);
    setPhotoMsg(null);
    try {
      const res = await api.post<{ profileImageUrl: string; completeness: ProfileCompleteness }>('/api/profile/photo', {
        dataUrl: croppedDataUrl,
      });

      if (profile) {
        setProfile(prev => (prev ? { ...prev, profileImageUrl: res.profileImageUrl } : prev));
      }
      setCompleteness(res.completeness);
      setPhotoMsg({ text: 'Profile photo updated successfully.' });
    } catch (err: any) {
      setPhotoMsg({ text: err.message || 'Unable to upload profile photo.', error: true });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    setPhotoLoading(true);
    setPhotoMsg(null);
    setPhotoOptionsOpen(false);

    try {
      const res = await api.delete<{ completeness: ProfileCompleteness }>('/api/profile/photo');
      if (profile) {
        setProfile(prev => (prev ? { ...prev, profileImageUrl: null } : prev));
      }
      setCompleteness(res.completeness);
      setPhotoMsg({ text: 'Profile photo removed. Reverted to initials.' });
    } catch (err: any) {
      setPhotoMsg({ text: err.message || 'Failed to remove profile photo.', error: true });
    } finally {
      setPhotoLoading(false);
    }
  };

  // Personal Contact update
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactMsg(null);
    setContactLoading(true);

    try {
      const res = await api.put<FullUserProfileResponse>('/api/profile/personal', {
        fullName: editName,
        phone: editPhone,
        whatsapp: sameAsPhone ? editPhone : editWhatsApp,
        address: editAddress,
        city: editCity,
        country: editCountry,
        phoneVisibility,
        emailVisibility,
        whatsappVisibility,
        preferredContactMethod: preferredMethod,
        preferredContactTime: preferredTime,
      });

      setProfile(res.profile);
      setCompleteness(res.completeness);
      await updateUserProfile({ fullName: res.user.fullName, phone: res.user.phone || undefined });
      setContactMsg({ text: 'Personal contact details and preferences saved.' });
    } catch (err: any) {
      setContactMsg({ text: err.message || 'Failed to update contact details.', error: true });
    } finally {
      setContactLoading(false);
    }
  };

  // Professional profile update
  const handleUpdateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfMsg(null);
    setProfLoading(true);

    try {
      const res = await api.put<FullUserProfileResponse>('/api/profile/professional', {
        jobTitle,
        company,
        yearsOfExperience: yearsExperience === '' ? null : Number(yearsExperience),
        areasServed,
        languages,
        bio,
      });

      setProfile(res.profile);
      setCompleteness(res.completeness);
      setProfMsg({ text: 'Professional credentials and bio updated successfully.' });
    } catch (err: any) {
      setProfMsg({ text: err.message || 'Failed to update professional profile.', error: true });
    } finally {
      setProfLoading(false);
    }
  };

  // Password update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ text: 'New password must be at least 8 characters long.', error: true });
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMsg({ text: 'Password successfully updated.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to change password.', error: true });
    } finally {
      setPasswordLoading(false);
    }
  };

  const completenessPercent = completeness?.percentage || 0;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
        <div className="relative bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200/90 max-h-[94vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Close Profile"
            aria-label="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Hidden File Input for Avatar Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {/* --- UPGRADED PROFILE HEADER --- */}
          <div className="pb-6 mb-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Interactive Profile Photo Component */}
              <div className="relative group shrink-0">
                <div
                  onClick={() => setPhotoOptionsOpen(true)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 text-white font-bold font-serif text-2xl sm:text-3xl flex items-center justify-center shadow-md overflow-hidden border-2 border-white ring-2 ring-slate-100 cursor-pointer relative group-hover:ring-indigo-300 transition-all"
                  title="Click to change profile photo"
                >
                  {profile?.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(user.fullName)}</span>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>

                {/* Edit Button at lower right corner */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setPhotoOptionsOpen(true);
                  }}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-full shadow-md border-2 border-white transition-colors"
                  title="Change profile photo"
                  aria-label="Change profile photo"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Identity & Completeness Header Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-serif text-2xl font-bold text-slate-900 truncate">
                    {user.fullName}
                  </h2>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {user.role}
                  </span>

                  {profile?.isVerified ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{user.role === 'AGENT' ? 'Verified Agent' : 'Verified'}</span>
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5">
                  <span>
                    Account ID: <strong className="font-mono text-slate-700">{user.id}</strong>
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {user.email}
                  </span>
                </p>

                {/* Profile Completeness Bar */}
                <div className="mt-3.5 max-w-md bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Profile Completeness</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowChecklist(!showChecklist)}
                      className="text-[11px] font-mono font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <span>{completenessPercent}%</span>
                      {showChecklist ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        completenessPercent >= 80
                          ? 'bg-emerald-500'
                          : completenessPercent >= 50
                          ? 'bg-indigo-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${completenessPercent}%` }}
                    />
                  </div>

                  {/* Expandable Checklist Details */}
                  {showChecklist && completeness && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                      <div className="font-semibold text-slate-700 mb-1">Checklist:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {completeness.completedItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                        {completeness.pendingItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo Notification Message */}
            {photoMsg && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  photoMsg.error
                    ? 'bg-rose-50 border border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                {photoMsg.error ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{photoMsg.text}</span>
              </div>
            )}
          </div>

          {/* --- SECTION NAVIGATION TABS --- */}
          <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2 text-xs font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'personal'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Contacts & Privacy</span>
            </button>

            {isProfessionalRole && (
              <button
                type="button"
                onClick={() => setActiveTab('professional')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'professional'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Professional Profile</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'security'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Security & Password</span>
            </button>
          </div>

          {/* --- TAB CONTENT 1: PERSONAL CONTACTS & PRIVACY --- */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              {contactMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    contactMsg.error
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {contactMsg.error ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{contactMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateContact} className="space-y-6">
                {/* Personal Information Card */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                    <div>
                      <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        Personal Contact Details
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Manage your verified legal contact details used across listings and agreements.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Full Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Victoria Vance"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Verified Email Address
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Email changes require administrative security verification.
                      </span>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Primary Phone
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        placeholder="+94 77 123 4567 or 0771234567"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                          WhatsApp Number
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAsPhone}
                            onChange={e => {
                              setSameAsPhone(e.target.checked);
                              if (e.target.checked) {
                                setEditWhatsApp(editPhone);
                              }
                            }}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span>Same as phone</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        value={sameAsPhone ? editPhone : editWhatsApp}
                        onChange={e => {
                          setEditWhatsApp(e.target.value);
                          if (sameAsPhone) setSameAsPhone(false);
                        }}
                        disabled={sameAsPhone}
                        placeholder="+94 77 123 4567"
                        className="w-full px-3.5 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                      />
                    </div>

                    {/* Street Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Street Address / Premises
                      </label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={e => setEditAddress(e.target.value)}
                        placeholder="No. 25, Flower Road, Colombo 07"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={200}
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        City / Suburb / Town
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={e => setEditCity(e.target.value)}
                        placeholder="Colombo 07"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={100}
                      />
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={editCountry}
                        onChange={e => setEditCountry(e.target.value)}
                        placeholder="Sri Lanka"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Privacy Card */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                  <div className="border-b border-slate-200/70 pb-2.5">
                    <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Contact Information Privacy & Visibility
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure who is permitted to view your direct phone, email, and WhatsApp numbers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Phone Visibility */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-semibold text-xs text-slate-900 block flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        Phone Visibility
                      </span>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {(['PUBLIC', 'REGISTERED', 'PRIVATE'] as ContactVisibility[]).map(val => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="phoneVisibility"
                              value={val}
                              checked={phoneVisibility === val}
                              onChange={() => setPhoneVisibility(val)}
                              className="text-slate-900 focus:ring-slate-900"
                            />
                            <span>{val === 'PUBLIC' ? 'Public' : val === 'REGISTERED' ? 'Registered Users' : 'Private'}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Email Visibility */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-semibold text-xs text-slate-900 block flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        Email Visibility
                      </span>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {(['PUBLIC', 'REGISTERED', 'PRIVATE'] as ContactVisibility[]).map(val => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="emailVisibility"
                              value={val}
                              checked={emailVisibility === val}
                              onChange={() => setEmailVisibility(val)}
                              className="text-slate-900 focus:ring-slate-900"
                            />
                            <span>{val === 'PUBLIC' ? 'Public' : val === 'REGISTERED' ? 'Registered Users' : 'Private'}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp Visibility */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-semibold text-xs text-slate-900 block flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        WhatsApp Visibility
                      </span>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {(['PUBLIC', 'REGISTERED', 'PRIVATE'] as ContactVisibility[]).map(val => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="whatsappVisibility"
                              value={val}
                              checked={whatsappVisibility === val}
                              onChange={() => setWhatsappVisibility(val)}
                              className="text-slate-900 focus:ring-slate-900"
                            />
                            <span>{val === 'PUBLIC' ? 'Public' : val === 'REGISTERED' ? 'Registered Users' : 'Private'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Communication Preferences Card */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                  <div className="border-b border-slate-200/70 pb-2.5">
                    <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Communication Preferences
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose your preferred communication channels and optimal availability windows.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Preferred Contact Method
                      </label>
                      <select
                        value={preferredMethod}
                        onChange={e => setPreferredMethod(e.target.value as ContactMethod)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                      >
                        <option value="PHONE">Phone Call</option>
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="SYSTEM_MESSAGE">System In-App Message</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Preferred Contact Time
                      </label>
                      <select
                        value={preferredTime}
                        onChange={e => setPreferredTime(e.target.value as ContactTime)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                      >
                        <option value="ANY_TIME">Any Time</option>
                        <option value="MORNING">Morning (8am - 12pm)</option>
                        <option value="AFTERNOON">Afternoon (12pm - 5pm)</option>
                        <option value="EVENING">Evening (5pm - 8pm)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {contactLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Contacts...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Contact Information</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- TAB CONTENT 2: PROFESSIONAL PROFILE (AGENT / OWNER / ADMIN) --- */}
          {activeTab === 'professional' && isProfessionalRole && (
            <div className="space-y-6">
              {profMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    profMsg.error
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {profMsg.error ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{profMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfessional} className="space-y-6">
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                  <div className="border-b border-slate-200/70 pb-2.5">
                    <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Professional Credentials & Brokerage Profile
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      This information appears on your listed properties and public advisor profile.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Job Title */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Professional Job Title
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={e => setJobTitle(e.target.value)}
                        placeholder="Senior Property Consultant"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={100}
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Brokerage / Firm
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Nexus Premier Realty"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={100}
                      />
                    </div>

                    {/* Years of Experience */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="70"
                        value={yearsExperience}
                        onChange={e => setYearsExperience(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        placeholder="8"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                      />
                    </div>

                    {/* Areas Served */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Areas Served
                      </label>
                      <input
                        type="text"
                        value={areasServed}
                        onChange={e => setAreasServed(e.target.value)}
                        placeholder="Colombo 07, Cinnamon Gardens, Kollupitiya, Kandy, Galle Fort"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={300}
                      />
                    </div>

                    {/* Languages */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Languages Spoken
                      </label>
                      <input
                        type="text"
                        value={languages}
                        onChange={e => setLanguages(e.target.value)}
                        placeholder="English, Spanish, French"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                        maxLength={200}
                      />
                    </div>

                    {/* Biography */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                          Professional Biography
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {bio.length} / 2000 chars
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Brief summary of your architectural expertise, transaction record, and client advisory philosophy..."
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 leading-relaxed"
                        maxLength={2000}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profLoading}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {profLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Professional Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- TAB CONTENT 3: SECURITY & PASSWORD --- */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {passwordMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    passwordMsg.error
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {passwordMsg.error ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                  <div className="border-b border-slate-200/70 pb-2.5">
                    <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      Security & Password Management
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Update your account authentication credentials with current password validation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        New Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Passwords are encrypted server-side with bcrypt hashing and never stored in plaintext.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading || !currentPassword || !newPassword}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- FOOTER: SIGN OUT & DONE --- */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="px-4 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* --- PHOTO MANAGEMENT OPTIONS MODAL --- */}
      {photoOptionsOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-serif text-base font-bold text-slate-900">Change Profile Photo</h3>
              <button
                onClick={() => setPhotoOptionsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              {profile?.profileImageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoOptionsOpen(false);
                    setViewPhotoOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Current Photo</span>
                </button>
              )}

              {profile?.profileImageUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoLoading}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Remove Photo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPhotoOptionsOpen(false)}
                className="w-full py-2 px-4 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FULL PHOTO PREVIEW MODAL --- */}
      {viewPhotoOpen && profile?.profileImageUrl && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl p-4 max-w-md w-full shadow-2xl border border-slate-700">
            <button
              onClick={() => setViewPhotoOpen(false)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors z-10"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
              <img
                src={profile.profileImageUrl}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="mt-4 text-center">
              <span className="font-serif font-bold text-slate-900 text-sm block">{user.fullName}</span>
              <span className="text-[11px] text-slate-500">{user.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- INTERACTIVE CROP MODAL --- */}
      <PhotoCropModal
        imageSrc={rawImageSrc}
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setRawImageSrc('');
        }}
        onSave={handleSaveCroppedPhoto}
      />
    </>
  );
};
