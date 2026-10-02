import React from 'react';
import { AlertCircle, ShieldAlert, ArrowLeft, Home, RotateCcw } from 'lucide-react';

interface ErrorPageProps {
  code: 400 | 401 | 403 | 404 | 409 | 500;
  message?: string;
  onNavigate: (view: string) => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ code, message, onNavigate }) => {
  const getDetails = () => {
    switch (code) {
      case 400:
        return {
          title: 'Bad Request',
          desc: message || 'The request was malformed or failed validation constraints.',
          icon: AlertCircle,
          color: 'text-amber-600 bg-amber-50',
        };
      case 401:
        return {
          title: 'Authentication Required',
          desc: message || 'You must be signed in to an authorized account to access this resource.',
          icon: ShieldAlert,
          color: 'text-indigo-600 bg-indigo-50',
          action: () => onNavigate('login'),
          actionText: 'Go to Sign In',
        };
      case 403:
        return {
          title: 'Access Forbidden',
          desc: message || 'You do not have the required role permissions or ownership privileges for this operation.',
          icon: ShieldAlert,
          color: 'text-rose-600 bg-rose-50',
        };
      case 404:
        return {
          title: 'Resource Not Found',
          desc: message || 'The property, appointment, or portal page you requested does not exist or has been removed.',
          icon: AlertCircle,
          color: 'text-slate-600 bg-slate-100',
        };
      case 409:
        return {
          title: 'Conflict Detected',
          desc: message || 'A scheduling conflict, duplicate record, or state collision occurred.',
          icon: AlertCircle,
          color: 'text-amber-600 bg-amber-50',
        };
      case 500:
      default:
        return {
          title: 'Internal Server Error',
          desc: message || 'An unexpected server condition occurred while processing this transaction.',
          icon: AlertCircle,
          color: 'text-rose-600 bg-rose-50',
        };
    }
  };

  const details = getDetails();
  const Icon = details.icon;

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className={`w-16 h-16 rounded-2xl ${details.color} flex items-center justify-center mx-auto shadow-inner`}>
          <Icon className="w-8 h-8" />
        </div>

        <div>
          <span className="font-mono text-sm font-bold text-slate-400 block tracking-widest mb-1">
            HTTP STATUS {code}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            {details.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            {details.desc}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </button>

          {details.action ? (
            <button
              onClick={details.action}
              className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors"
            >
              {details.actionText}
            </button>
          ) : (
            <button
              onClick={() => onNavigate('properties')}
              className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Browse Properties</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
