import React, { useState } from 'react';
import { api } from '../api/client';
import { X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface ComplaintModalProps {
  propertyId?: string;
  propertyTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  propertyId,
  propertyTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || subject.trim().length < 5) {
      setError('Subject must be at least 5 characters.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ ticketId: string }>('/api/feedback/complaints', {
        propertyId: propertyId || undefined,
        subject: subject.trim(),
        description: description.trim(),
      });
      setTicketId(res.ticketId);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
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
              Complaint Registered
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto mb-4">
              Your issue has been formally logged under Ticket ID <strong className="text-slate-900 font-mono">{ticketId}</strong>. Our compliance and operations team investigates all matters with priority.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block mb-1">
                Quality & Grievance Resolution
              </span>
              <h2 className="font-serif text-xl font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Submit Formal Issue / Complaint
              </h2>
              {propertyTitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Regarding listing: {propertyTitle}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject of Issue
                </label>
                <input
                  type="text"
                  placeholder="e.g., Listing specification inaccuracy, agent tardiness, unauthorized access..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Statement & Specifics
                </label>
                <textarea
                  rows={4}
                  placeholder="Please state times, dates, and evidence regarding the issue..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
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
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {loading ? 'Submitting...' : 'File Complaint'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
