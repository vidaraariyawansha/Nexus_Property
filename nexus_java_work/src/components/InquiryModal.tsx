import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import { X, Send, CheckCircle, AlertCircle, HelpCircle, Phone, Mail, MessageSquare } from 'lucide-react';

interface InquiryModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [preferredMethod, setPreferredMethod] = useState<'PHONE' | 'EMAIL' | 'WHATSAPP'>('PHONE');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please provide a subject.');
      return;
    }

    if (!message.trim() || message.trim().length < 5) {
      setError('Message must be at least 5 characters.');
      return;
    }

    setLoading(true);
    try {
      // Append contact preferences to message metadata for agent clarity
      const detailedMessage = `${message.trim()}\n\n---\nPreferred Contact: ${preferredMethod} | Phone: ${phone || 'Not provided'} | Email: ${email}`;

      const res = await api.post<{ ticketId: string }>('/api/feedback/inquiries', {
        propertyId: property.id,
        subject: subject.trim(),
        message: detailedMessage,
      });
      setTicketId(res.ticketId);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit inquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {ticketId ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-slate-900 mb-2">
              Inquiry Dispatched
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto mb-4">
              Your inquiry has been assigned ticket reference <strong className="text-slate-900 font-mono">{ticketId}</strong>. A dedicated brokerage specialist will reply to your account dashboard and contact you via {preferredMethod.toLowerCase()}.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Direct Brokerage Channel
              </span>
              <h2 className="font-serif text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Contact Agent & Submit Inquiry
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Regarding: <strong>{property.title}</strong> ({formatCurrency(property.price, property.location)})
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Customer Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                    placeholder="Full Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 font-mono"
                    placeholder="+94 77 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Contact Method
                  </label>
                  <select
                    value={preferredMethod}
                    onChange={e => setPreferredMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  >
                    <option value="PHONE">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g., Land deed inquiry, pricing terms, viewing confirmation..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Your Detailed Question
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail your question or requested documentation..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Transmitting...' : 'Send Inquiry'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
