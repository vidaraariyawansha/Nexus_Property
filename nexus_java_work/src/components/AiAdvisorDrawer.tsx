import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  ExternalLink,
  Heart,
  Scale,
  Calendar,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface AIPropertyCardData {
  id: string;
  title: string;
  price: number;
  formattedPrice: string;
  shortPrice: string;
  location: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  primaryImage?: string;
  status: string;
  relevanceReason?: string;
}

interface AIAdvisorActionData {
  type: string;
  targetId?: string;
  label: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  properties?: AIPropertyCardData[];
  suggestedFollowUps?: string[];
  action?: AIAdvisorActionData;
  intent?: string;
  metrics?: {
    totalTimeMs: number;
    path: string;
  };
}

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextPropertyId?: string;
  contextPropertyTitle?: string;
  onNavigate?: (view: string, param?: any) => void;
  onOpenAppointmentModal?: (propertyId: string) => void;
}

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  contextPropertyId,
  contextPropertyTitle,
  onNavigate,
  onOpenAppointmentModal,
}) => {
  const { user } = useAuth();
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  const initialAssistantMessage: Message = {
    id: 'welcome_msg',
    role: 'assistant',
    content: contextPropertyTitle
      ? `Hello! I am your Nexus Property AI Advisor. I am currently focused on **${contextPropertyTitle}**. You can ask about its specifications, neighborhood comps, financing, or ask to book a viewing.`
      : `Hello! I am your **Nexus Property AI Advisor**. Connected directly to Sri Lanka's real estate database, I can help you search properties, compare listings, schedule viewings, and manage your wishlist with zero hallucination.`,
    suggestedFollowUps: contextPropertyTitle
      ? [
          'Does this property have parking?',
          'What is the asking price in LKR?',
          'Book a viewing for this property',
          'Add this property to my wishlist',
        ]
      : [
          'Find houses in Colombo under 40M',
          'Show apartments in Colombo 03',
          'Properties with at least 3 bedrooms',
          'Show my wishlist',
          'My upcoming viewings',
        ],
  };

  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const userQuery = (textToSend || input).trim();
    if (!userQuery || loading) return;

    setInput('');
    const userMsgId = `msg_user_${Date.now()}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const res = await api.post<{
        answer: string;
        intent: string;
        properties?: AIPropertyCardData[];
        suggestedFollowUps?: string[];
        action?: AIAdvisorActionData;
        metrics?: { totalTimeMs: number; path: string };
      }>('/api/ai/advisor', {
        message: userQuery,
        conversationId,
        contextPropertyId,
        contextPropertyTitle,
      });

      setMessages(prev => [
        ...prev,
        {
          id: `msg_asst_${Date.now()}`,
          role: 'assistant',
          content: res.answer,
          properties: res.properties,
          suggestedFollowUps: res.suggestedFollowUps,
          action: res.action,
          intent: res.intent,
          metrics: res.metrics,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `I encountered an issue processing your request: ${
            err.message || 'Please verify your search query or try again in a moment.'
          }`,
          suggestedFollowUps: ['Find houses in Colombo', 'Show apartments under 30M'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.post('/api/ai/clear-context', { conversationId });
    } catch {
      // Non-critical
    }
    setMessages([initialAssistantMessage]);
  };

  const handleToggleWishlist = async (propertyId: string) => {
    if (!user) {
      if (onNavigate) {
        onClose();
        onNavigate('login');
      }
      return;
    }

    try {
      const res = await api.post<{ saved: boolean }>('/api/wishlist/toggle', { propertyId });
      setSavedPropertyIds(prev => {
        const next = new Set(prev);
        if (res.saved) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
    } catch {
      // Handled silently
    }
  };

  const handleActionClick = (action: AIAdvisorActionData) => {
    if (!onNavigate) return;

    if (action.type === 'VIEW_PROPERTY' && action.targetId) {
      onClose();
      onNavigate('detail', action.targetId);
    } else if (action.type === 'LOGIN_REQUIRED') {
      onClose();
      onNavigate('login');
    } else if (action.type === 'OPEN_WISHLIST' || action.type === 'OPEN_COMPARISON' || action.targetId === '/customer-portal') {
      onClose();
      onNavigate('portal');
    } else if (action.type === 'NAVIGATE' && action.targetId) {
      onClose();
      onNavigate(action.targetId.replace('/', ''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-bold text-white">Nexus AI Advisor</h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  DATABASE GROUNDED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {contextPropertyTitle ? `Context: ${contextPropertyTitle}` : 'Sri Lanka Real Estate Intelligence'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close advisor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[90%] space-y-3`}>
                <div
                  className={`rounded-2xl p-3.5 ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/90 whitespace-pre-line shadow-xs'
                  }`}
                >
                  {m.content}

                  {/* Primary Action Button if response includes one */}
                  {m.action && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleActionClick(m.action!)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{m.action.label}</span>
                      </button>
                    </div>
                  )}

                  {/* Latency & Grounding Badge */}
                  {m.metrics && (
                    <div className="mt-2 pt-1 border-t border-slate-200/70 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                      <span>Verified via Real System Database</span>
                      <span>{m.metrics.totalTimeMs}ms</span>
                    </div>
                  )}
                </div>

                {/* Structured Property Result Cards */}
                {m.properties && m.properties.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    {m.properties.map(p => {
                      const isSaved = savedPropertyIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all flex flex-col sm:flex-row group"
                        >
                          {/* Image Thumbnail */}
                          <div className="sm:w-32 h-28 sm:h-auto bg-slate-100 relative shrink-0 overflow-hidden">
                            <img
                              src={p.primaryImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={e => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900/90 text-white shadow-xs uppercase">
                              {p.propertyType}
                            </span>
                          </div>

                          {/* Card Content */}
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="font-semibold text-slate-900 text-xs line-clamp-1 group-hover:text-indigo-900">
                                  {p.title}
                                </h4>
                                <span className="font-bold text-slate-900 text-xs shrink-0 font-mono text-emerald-800">
                                  {p.shortPrice}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {p.location}
                              </p>

                              <div className="flex items-center gap-2.5 text-[11px] text-slate-600 mt-2">
                                {p.bedrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="w-3 h-3 text-slate-400" />
                                    {p.bedrooms} Beds
                                  </span>
                                )}
                                {p.bathrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bath className="w-3 h-3 text-slate-400" />
                                    {p.bathrooms} Baths
                                  </span>
                                )}
                                {p.area > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Maximize2 className="w-3 h-3 text-slate-400" />
                                    {p.area.toLocaleString()} sq ft
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Quick Action Bar */}
                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  if (onNavigate) {
                                    onClose();
                                    onNavigate('detail', p.id);
                                  }
                                }}
                                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-950 flex items-center gap-1"
                              >
                                View Listing
                                <ExternalLink className="w-3 h-3" />
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleWishlist(p.id)}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isSaved
                                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                                      : 'text-slate-500 hover:bg-slate-100 border-slate-200'
                                  }`}
                                  title="Save to Wishlist"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                                </button>
                                {onOpenAppointmentModal && (
                                  <button
                                    onClick={() => {
                                      onClose();
                                      onOpenAppointmentModal(p.id);
                                    }}
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    title="Book Viewing Tour"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Follow-up suggestions */}
                {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.suggestedFollowUps.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(chip)}
                        className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-full px-2.5 py-1 transition-colors text-left shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-700 bg-slate-100 p-3 rounded-xl border border-slate-200 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              <span>Querying verified property records & database criteria...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box & Quick action footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="E.g., 3-bedroom house in Nugegoda under 40M..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
            <span>Powered by Nexus Deterministic Grounding Engine</span>
            <span>·</span>
            <span>Sri Lankan LKR Pricing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
