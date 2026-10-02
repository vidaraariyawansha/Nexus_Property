import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { api } from '../api/client';
import { Calendar, Clock, User, X, CheckCircle, AlertCircle } from 'lucide-react';
import { formatSLDate, formatSLTime, formatSLDateTime, normalizeSriLankanPhone } from '../utils/sriLankaUtils';

interface AppointmentModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AgentOption {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get<AgentOption[]>('/api/appointments/meta/agents')
        .then(data => {
          setAgents(data);
          if (data.length > 0 && !selectedAgentId) {
            setSelectedAgentId(data[0].id);
          }
        })
        .catch(console.error);

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setError(null);
      setConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !time) {
      setError('Please select appointment date and time.');
      return;
    }

    if (!selectedAgentId) {
      setError('Please select an agent to conduct the viewing.');
      return;
    }

    const appointmentTimestamp = new Date(`${date}T${time}`).getTime();
    if (appointmentTimestamp < Date.now() + 15 * 60 * 1000) {
      setError('Appointment must be scheduled at least 15 minutes in advance.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/appointments', {
        propertyId: property.id,
        agentId: selectedAgentId,
        appointmentTime: appointmentTimestamp,
        durationMinutes,
        notes: notes ? notes.trim() : undefined,
      });
      setConfirmed(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule appointment.');
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

        {confirmed ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-slate-900 mb-2">
              Viewing Requested
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto mb-6">
              Your private walkthrough request for <strong>{property.title}</strong> has been submitted. The assigned agent will confirm your appointment shortly.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-left mb-6 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatSLDate(new Date(`${date}T${time}`).getTime())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Time:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatSLTime(new Date(`${date}T${time}`).getTime())} (Sri Lanka Time / Asia:Colombo)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-slate-800">{durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Agent:</span>
                <span className="font-semibold text-slate-800">
                  {agents.find(a => a.id === selectedAgentId)?.fullName}
                  {agents.find(a => a.id === selectedAgentId)?.phone && (
                    <span className="text-slate-500 font-mono font-normal ml-1">
                      ({normalizeSriLankanPhone(agents.find(a => a.id === selectedAgentId)?.phone || '')})
                    </span>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              Done & Return to Property
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                  Private Viewing Tour
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  Asia/Colombo (SLST)
                </span>
              </div>
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Book Viewing Appointment
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {property.title} · {property.location}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Agent Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Certified Agent
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 cursor-pointer"
                    required
                  >
                    {agents.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.fullName} ({ag.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Walkthrough Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 90].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        durationMinutes === mins
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Requests / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Special Notes or Requirements (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Financial pre-approval ready, interested in structural inspection or rooftop access..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  maxLength={300}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {loading ? 'Verifying schedule...' : 'Confirm Viewing Request'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
