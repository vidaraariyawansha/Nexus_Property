import React, { useState, useEffect } from 'react';
import { ValuationData } from '../types';
import { api } from '../api/client';
import {
  X,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Building,
  Brain,
  DollarSign,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ValuationModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ValuationModal: React.FC<ValuationModalProps> = ({
  propertyId,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && propertyId) {
      setLoading(true);
      setError(null);
      setData(null);

      api.get<ValuationData>(`/api/ai/valuation/${propertyId}`)
        .then(res => {
          setData(res);
        })
        .catch(err => {
          setError(err.message || 'Failed to generate valuation report.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, propertyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>Institutional Valuation & Risk Appraisal</span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-200/60 font-mono">
              Gemini 3.8 Flash · Instant Econometric Valuation
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            {data ? data.propertyTitle : 'Generating Valuation Appraisal...'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quantitative econometric model analyzing micro-neighborhood comps, cap rate liquidity, and replacement cost benchmarks.
          </p>
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-900 mb-2">
              Synthesizing Real Estate Econometrics
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Our AI engine is currently executing high-level reasoning across neighborhood comps, yield curves, zoning permissions, and historic price trends...
            </p>
          </div>
        )}

        {error && (
          <div className="my-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Valuation Computation Error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Estimated Fair Market
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                  LKR {data.estimatedMid.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Band: LKR {data.estimatedLow.toLocaleString()} - LKR {data.estimatedHigh.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Price / Sq Ft
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                  LKR {data.pricePerSqFt.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
                  Competitive Index
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  5-Yr Appreciation
                </span>
                <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums">
                  {data.fiveYearAppreciationPct}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Projected Capital Gain
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Confidence Score
                </span>
                <div className="text-xl font-bold text-indigo-700 font-mono tabular-nums">
                  {data.confidenceScore}%
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Model Fit: Grade A
                </span>
              </div>
            </div>

            {/* Valuation Range Graph Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">Valuation Spread Assessment</span>
                <span className="text-slate-500 font-mono text-[11px]">As of {data.valuationDate}</span>
              </div>
              <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="w-1/4 bg-slate-300"></div>
                <div className="w-2/4 bg-indigo-600"></div>
                <div className="w-1/4 bg-slate-300"></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono tabular-nums">
                <span>Low: LKR {data.estimatedLow.toLocaleString()}</span>
                <span className="font-semibold text-indigo-700">Mid: LKR {data.estimatedMid.toLocaleString()}</span>
                <span>High: LKR {data.estimatedHigh.toLocaleString()}</span>
              </div>
            </div>

            {/* Narrative Analysis */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/90">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Comprehensive Market & Appraisal Thesis
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {data.valuationNarrative}
              </p>
            </div>

            {/* Comparables Table */}
            {data.comparables && data.comparables.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5">
                  Submarket Benchmark Comps
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {data.comparables.map((comp, idx) => (
                    <div key={idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900 block">{comp.title}</span>
                        <span className="text-slate-500 text-[11px]">{comp.location} · {comp.comparisonNotes}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 shrink-0">
                        LKR {comp.price.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
