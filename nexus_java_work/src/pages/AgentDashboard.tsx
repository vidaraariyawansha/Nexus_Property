import React, { useState, useEffect } from 'react';
import { Appointment, Inquiry, Complaint } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Send,
  User,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Inquiry reply modal state
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'RESOLVED' | 'IN_PROGRESS'>('RESOLVED');
  const [replyLoading, setReplyLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAgentData = async () => {
    setLoading(true);
    try {
      const apts = await api.get<Appointment[]>('/api/appointments');
      setAppointments(apts);

      const inqs = await api.get<Inquiry[]>('/api/feedback/inquiries');
      setInquiries(inqs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [user]);

  const handleAppointmentAction = async (
    aptId: string,
    action: 'CONFIRM' | 'COMPLETE' | 'CANCEL'
  ) => {
    let reason: string | undefined = undefined;
    if (action === 'CANCEL') {
      reason = 'Agent calendar slot rescheduled with customer notification.';
    }

    try {
      await api.post(`/api/appointments/${aptId}/action`, { action, reason });
      fetchAgentData();
      showToast(`Appointment status updated to ${action}.`);
    } catch (err: any) {
      showToast(err.message || 'Action failed.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim()) return;
    setReplyLoading(true);

    try {
      await api.post(`/api/feedback/inquiries/${activeInquiry.id}/respond`, {
        response: replyText.trim(),
        status: replyStatus,
      });
      setActiveInquiry(null);
      setReplyText('');
      fetchAgentData();
      showToast('Response sent to customer successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const pendingAppointments = appointments.filter(a => a.status === 'REQUESTED');
  const confirmedAppointments = appointments.filter(a => a.status === 'CONFIRMED');
  const openInquiries = inquiries.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-cyan-700 uppercase tracking-wider block mb-1">
            Broker Operations
          </span>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            Agent Operational Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assigned viewing appointments, customer inquiries, and schedule conflict resolution.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold bg-cyan-50 border border-cyan-200 text-cyan-800 px-3 py-1.5 rounded-xl">
            Certified Broker: {user?.fullName}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Pending Viewing Requests
          </span>
          <div className="text-3xl font-bold text-amber-700 font-mono">
            {pendingAppointments.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting confirmation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Confirmed Tours
          </span>
          <div className="text-3xl font-bold text-emerald-700 font-mono">
            {confirmedAppointments.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Scheduled on your calendar</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Open Customer Inquiries
          </span>
          <div className="text-3xl font-bold text-indigo-700 font-mono">
            {openInquiries.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Questions requiring response</span>
        </div>
      </div>

      {/* Viewing Appointments Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Assigned Viewing Appointments
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{appointments.length} Total</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-slate-900 mx-auto mb-2" />
            <span>Loading appointments...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No appointments currently assigned to your desk.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map(apt => (
              <div key={apt.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                      <span className="text-slate-500 text-xs font-mono font-medium">
                        {new Date(apt.appointmentTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(apt.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({apt.durationMinutes} min)
                      </span>
                    </div>

                    <h4 className="font-serif text-sm font-bold text-slate-900">
                      {apt.propertyTitle}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Client: <strong className="text-slate-800">{apt.customerName}</strong> ({apt.customerEmail} {apt.customerPhone && `· ${apt.customerPhone}`})
                    </p>
                    {apt.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1.5 border border-slate-100">
                        Client note: "{apt.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Agent Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {apt.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleAppointmentAction(apt.id, 'CONFIRM')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      Confirm Booking
                    </button>
                  )}

                  {apt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleAppointmentAction(apt.id, 'COMPLETE')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      Mark Completed
                    </button>
                  )}

                  {(apt.status === 'REQUESTED' || apt.status === 'CONFIRMED') && (
                    <button
                      onClick={() => handleAppointmentAction(apt.id, 'CANCEL')}
                      className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium"
                    >
                      Cancel Tour
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Inquiries Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Customer Disclosures & Inquiries Desk
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{inquiries.length} Inquiries</span>
        </div>

        {inquiries.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No customer inquiries logged.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inquiries.map(inq => (
              <div key={inq.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {inq.ticketId}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        inq.status === 'RESOLVED' || inq.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inq.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      From: <strong className="text-slate-800">{inq.customerName}</strong> ({inq.customerEmail})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(inq.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-serif text-sm font-bold text-slate-900">
                    {inq.subject}
                  </h4>
                  <p className="text-xs text-slate-500 mb-1">
                    Listing: {inq.propertyTitle}
                  </p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{inq.message}"
                  </p>
                </div>

                {inq.response ? (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl text-xs space-y-1">
                    <span className="font-semibold text-emerald-900 block">Agent Dispatched Response:</span>
                    <p className="text-emerald-950">{inq.response}</p>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        setActiveInquiry(inq);
                        setReplyText('');
                        setReplyStatus('RESOLVED');
                      }}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply to Customer</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Dispatch Formal Broker Response
              </span>
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Ticket [{activeInquiry.ticketId}]: {activeInquiry.subject}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Responding to {activeInquiry.customerName} regarding "{activeInquiry.propertyTitle}"
              </p>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Your Official Response
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail disclosures, answers to zoning/tax questions, or document links..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Set Ticket Status
                </label>
                <select
                  value={replyStatus}
                  onChange={e => setReplyStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="RESOLVED">RESOLVED (Complete)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Ongoing Inquiry)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveInquiry(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replyLoading || !replyText.trim()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {replyLoading ? 'Sending...' : 'Transmit Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
