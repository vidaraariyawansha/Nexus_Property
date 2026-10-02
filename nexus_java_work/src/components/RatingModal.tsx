import React, { useState } from 'react';
import { Property } from '../types';
import { api } from '../api/client';
import { X, Star, AlertCircle, CheckCircle } from 'lucide-react';

interface RatingModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [score, setScore] = useState(5);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/api/feedback/ratings', {
        propertyId: property.id,
        score,
        comment: comment ? comment.trim() : undefined,
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-slate-900 mb-1">
              Rating Submitted
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Thank you for sharing your verified review for <strong>{property.title}</strong>.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Verified Feedback
              </span>
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Rate This Property
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {property.title}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Rating Score (1 to 5 Stars)
                </label>
                <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverScore(star)}
                      onMouseLeave={() => setHoverScore(0)}
                      onClick={() => setScore(star)}
                      className="p-1 text-slate-300 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          (hoverScore || score) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono text-sm font-bold text-slate-800">
                    {hoverScore || score} / 5
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Review & Comments (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Share details on architectural finish, lighting, neighborhood ambiance, or viewing impression..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  maxLength={500}
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
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {loading ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
