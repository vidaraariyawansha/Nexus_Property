import React from 'react';
import { Building2, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-serif text-lg font-bold tracking-tight">Nexus Property</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutional-grade property sales, listings, and customer self-service platform. Grounded in transparent market analytics, verified ownership, and end-to-end scheduling workflows.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Brokerage Network</span>
            </div>
          </div>

          {/* Properties Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Marketplace</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('properties')} className="hover:text-white transition-colors">
                  All Active Listings
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('properties')} className="hover:text-white transition-colors">
                  Contemporary Villas
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('properties')} className="hover:text-white transition-colors">
                  Urban Penthouses & Lofts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('properties')} className="hover:text-white transition-colors">
                  Waterfront Estates
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('properties')} className="hover:text-white transition-colors">
                  Commercial HQ & Offices
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Workflows */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Operations & Portals</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('portal')} className="hover:text-white transition-colors">
                  Customer Self-Service Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('owner')} className="hover:text-white transition-colors">
                  Owner Listing Workspace
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('agent')} className="hover:text-white transition-colors">
                  Agent Appointment Desk
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors">
                  Executive Admin Console
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('portal')} className="hover:text-white transition-colors">
                  Inquiries & Complaints Tracking
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Corporate Headquarters</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Level 34, World Trade Center, Echelon Square, Colombo 01, Sri Lanka</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>+94 11 234 5678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>advisory@nexusproperty.lk</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Nexus Property Sales System. All rights reserved. Equal Housing Opportunity.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer">Fair Housing Disclosures</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
