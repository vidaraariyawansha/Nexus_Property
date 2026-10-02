import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { formatDateTimeLK } from '../utils/dateTime';
import { UserRole } from '../types';
import { getInitials } from '../utils/initials';
import {
  Building2,
  Heart,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Compass,
  ShieldAlert,
  Calendar,
  Briefcase,
  KeyRound,
  FileCheck,
  Scale,
  Globe,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: any) => void;
  onOpenAdvisor?: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenProfile }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, quickDemoLogin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const handleRoleSwitch = async (role: UserRole) => {
    setDemoMenuOpen(false);
    await quickDemoLogin(role);
    if (role === 'ADMIN') onNavigate('admin');
    else if (role === 'AGENT') onNavigate('agent');
    else if (role === 'PROPERTY_OWNER') onNavigate('owner');
    else onNavigate('portal');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors">
      {/* Top micro announcement / demo switch & language selector bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-200">{t('brand.title')}</span>
          <span className="hidden sm:inline text-slate-400">· {t('brand.subtitle')}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Trilingual Language Switcher */}
          <div className="inline-flex items-center bg-slate-800/90 border border-slate-700/80 rounded-md p-0.5 text-[11px]">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                language === 'en'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="English interface"
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('si')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                language === 'si'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="සිංහල මාධ්‍යය"
            >
              සිං
            </button>
            <button
              onClick={() => setLanguage('ta')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                language === 'ta'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="தமிழ் இடைமுகம்"
            >
              தமிழ்
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setDemoMenuOpen(!demoMenuOpen)}
              className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-medium px-2 py-0.5 rounded bg-amber-950/40 border border-amber-600/40 transition-colors"
              title="Switch user role instantly for grading and testing"
            >
              <KeyRound className="w-3 h-3" />
              <span>{t('nav.roleSwitch')}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {demoMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-left">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Instant Demo Roles (Sri Lanka)
                </div>
                <button
                  onClick={() => handleRoleSwitch('CUSTOMER')}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
                >
                  <div className="text-left">
                    <span className="font-medium block">Chamari Atapattu / Elena</span>
                    <span className="text-[10px] text-slate-400 block">Buyer · Nugegoda, Colombo</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">CUSTOMER</span>
                </button>
                <button
                  onClick={() => handleRoleSwitch('PROPERTY_OWNER')}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between text-slate-200 hover:bg-slate-800 hover:text-indigo-400"
                >
                  <div className="text-left">
                    <span className="font-medium block">Priyantha Silva / David</span>
                    <span className="text-[10px] text-slate-400 block">Owner · Battaramulla</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">OWNER</span>
                </button>
                <button
                  onClick={() => handleRoleSwitch('AGENT')}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between text-slate-200 hover:bg-slate-800 hover:text-cyan-400"
                >
                  <div className="text-left">
                    <span className="font-medium block">Kasun Perera / Sarah</span>
                    <span className="text-[10px] text-slate-400 block">Consultant · Colombo 03</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">AGENT</span>
                </button>
                <button
                  onClick={() => handleRoleSwitch('ADMIN')}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between text-slate-200 hover:bg-slate-800 hover:text-amber-400"
                >
                  <div className="text-left">
                    <span className="font-medium block">Victoria Vance</span>
                    <span className="text-[10px] text-slate-400 block">System Administrator</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">ADMIN</span>
                </button>
              </div>
            )}
          </div>

          {user ? (
            <span className="hidden sm:inline-block text-slate-400 text-xs">
              Logged in as <strong className="text-white font-medium">{user.fullName}</strong> ({user.role})
            </span>
          ) : (
            <span className="hidden sm:inline text-slate-400">Guest Visitor</span>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-slate-900 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:bg-slate-800 transition-colors">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <span className="font-serif text-xl font-bold tracking-tight text-slate-900 block leading-none">
                  Nexus
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500 block mt-0.5">
                  Property System
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
                className={`text-sm font-medium transition-colors hover:text-slate-950 ${
                  currentView === 'home' ? 'text-slate-950 font-semibold border-b-2 border-slate-900 py-5' : 'text-slate-600'
                }`}
              >
                {t('nav.home')}
              </button>
              <button
                onClick={() => onNavigate('properties')}
                className={`text-sm font-medium transition-colors hover:text-slate-950 ${
                  currentView === 'properties' ? 'text-slate-950 font-semibold border-b-2 border-slate-900 py-5' : 'text-slate-600'
                }`}
              >
                {t('nav.properties')}
              </button>

              {/* Role-Specific quick links */}
              {user?.role === 'CUSTOMER' && (
                <button
                  onClick={() => onNavigate('portal')}
                  className={`text-sm font-medium transition-colors hover:text-slate-950 ${
                    currentView === 'portal' ? 'text-slate-950 font-semibold border-b-2 border-slate-900 py-5' : 'text-slate-600'
                  }`}
                >
                  {t('nav.portal')}
                </button>
              )}

              {user?.role === 'PROPERTY_OWNER' && (
                <button
                  onClick={() => onNavigate('owner')}
                  className={`text-sm font-medium transition-colors hover:text-slate-950 ${
                    currentView === 'owner' ? 'text-slate-950 font-semibold border-b-2 border-slate-900 py-5' : 'text-slate-600'
                  }`}
                >
                  {t('nav.owner')}
                </button>
              )}

              {user?.role === 'AGENT' && (
                <button
                  onClick={() => onNavigate('agent')}
                  className={`text-sm font-medium transition-colors hover:text-slate-950 ${
                    currentView === 'agent' ? 'text-slate-950 font-semibold border-b-2 border-slate-900 py-5' : 'text-slate-600'
                  }`}
                >
                  {t('nav.agent')}
                </button>
              )}

              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`text-sm font-medium transition-colors hover:text-slate-950 ${
                    currentView === 'admin' ? 'text-slate-950 font-semibold border-b-2 border-slate-900 py-5' : 'text-slate-600'
                  }`}
                >
                  {t('nav.admin')}
                </button>
              )}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Wishlist quick shortcut for customers */}
                {user.role === 'CUSTOMER' && (
                  <button
                    onClick={() => onNavigate('portal', { tab: 'saved' })}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors relative"
                    title="Saved Wishlist"
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                )}

                {/* Comparisons quick shortcut for customers */}
                {user.role === 'CUSTOMER' && (
                  <button
                    onClick={() => onNavigate('portal', { tab: 'comparisons' })}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors relative"
                    title="My Property Comparisons"
                  >
                    <Scale className="w-5 h-5" />
                  </button>
                )}

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-500">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 8).map(n => {
                            const isApt = n.type.includes('APPOINTMENT');
                            const isInq = n.type.includes('INQUIRY');
                            const isCmp = n.type.includes('COMPLAINT');
                            const isProp = n.type.includes('PROPERTY');
                            const categoryLabel = isApt ? 'Viewing' : isInq ? 'Inquiry' : isCmp ? 'Issue' : isProp ? 'Property' : 'System';
                            const categoryBadgeClass = isApt
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : isInq
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : isCmp
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isProp
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200';

                            return (
                              <div
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={`p-3.5 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                                  !n.isRead ? 'bg-slate-50/80 font-medium' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${categoryBadgeClass}`}>
                                      {categoryLabel}
                                    </span>
                                    <span className="font-semibold text-slate-900 truncate">{n.title}</span>
                                  </div>
                                  {!n.isRead && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1.5 shrink-0"></span>}
                                </div>
                                <p className="text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {formatDateTimeLK(n.createdAt)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Icon Button */}
                <button
                  onClick={onOpenProfile}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors relative group"
                  title="Profile: Personal Contact Details & Security"
                  aria-label="Profile"
                >
                  <User className="w-5 h-5 group-hover:scale-105 transition-transform" />
                </button>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center font-serif">
                      {getInitials(user.fullName)}
                    </div>
                    <span className="text-xs font-medium text-slate-700 hidden sm:inline max-w-[100px] truncate">
                      {user.fullName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-left">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full text-left px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                        title="Click to view Personal Contact Details & Security"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {user.fullName}
                          </p>
                          <span className="text-[10px] text-indigo-600 font-medium">Edit</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {user.role}
                        </span>
                      </button>

                      {/* Direct access to Personal Contact Details & Security */}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full px-4 py-2 text-xs text-left text-indigo-700 hover:bg-indigo-50/70 flex items-center gap-2 font-medium border-b border-slate-100 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Personal Contact Details & Security</span>
                      </button>

                      {user.role === 'CUSTOMER' && (
                        <>
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('portal');
                            }}
                            className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>Customer Portal</span>
                          </button>
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('portal', { tab: 'comparisons' });
                            }}
                            className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Scale className="w-3.5 h-3.5 text-indigo-600" />
                            <span>My Comparisons</span>
                          </button>
                        </>
                      )}

                      {user.role === 'PROPERTY_OWNER' && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('owner');
                          }}
                          className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Owner Listings</span>
                        </button>
                      )}

                      {user.role === 'AGENT' && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('agent');
                          }}
                          className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Agent Desk</span>
                        </button>
                      )}

                      {user.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Admin Console</span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          onNavigate('home');
                        }}
                        className="w-full px-4 py-2 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
                >
                  {t('nav.register')}
                </button>
              </div>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('home');
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Home
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('properties');
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Explore Properties
          </button>

          {user && (
            <>
              {user.role === 'CUSTOMER' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('portal');
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Customer Portal
                </button>
              )}
              {user.role === 'PROPERTY_OWNER' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('owner');
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Owner Dashboard
                </button>
              )}
              {user.role === 'AGENT' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('agent');
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Agent Desk
                </button>
              )}
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('admin');
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Admin Console
                </button>
              )}

              <div className="border-t border-slate-100 my-1 pt-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Personal Contact Details & Security</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    onNavigate('home');
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
