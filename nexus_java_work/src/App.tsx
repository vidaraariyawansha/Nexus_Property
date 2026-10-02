import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { CustomerPortal } from './pages/CustomerPortal';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { AgentDashboard } from './pages/AgentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ErrorPage } from './pages/ErrorPage';
import { ValuationModal } from './components/ValuationModal';
import { AiAdvisorDrawer } from './components/AiAdvisorDrawer';
import { ProfileModal } from './components/ProfileModal';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParam, setViewParam] = useState<any>(null);

  // Valuation Modal state
  const [valuationPropertyId, setValuationPropertyId] = useState<string | null>(null);

  // AI Advisor Drawer state
  const [advisorOpen, setAdvisorOpen] = useState(false);

  // Profile & Security Modal state
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = (view: string, param?: any) => {
    // Role protection routing guards
    if (view === 'portal' && (!user || user.role !== 'CUSTOMER')) {
      if (!user) {
        setCurrentView('login');
        return;
      }
    }
    if (view === 'owner' && (!user || (user.role !== 'PROPERTY_OWNER' && user.role !== 'ADMIN'))) {
      setCurrentView('login');
      return;
    }
    if (view === 'agent' && (!user || (user.role !== 'AGENT' && user.role !== 'ADMIN'))) {
      setCurrentView('login');
      return;
    }
    if (view === 'admin' && (!user || user.role !== 'ADMIN')) {
      setCurrentView('login');
      return;
    }

    setCurrentView(view);
    setViewParam(param || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenValuation = (propertyId: string) => {
    setValuationPropertyId(propertyId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={navigate}
        onOpenAdvisor={() => setAdvisorOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onNavigate={navigate}
            onOpenValuation={handleOpenValuation}
            onOpenAdvisor={() => setAdvisorOpen(true)}
          />
        )}

        {currentView === 'properties' && (
          <PropertiesPage
            initialFilters={viewParam || {}}
            onNavigate={navigate}
            onOpenValuation={handleOpenValuation}
          />
        )}

        {currentView === 'detail' && (
          <PropertyDetailPage
            propertyId={viewParam}
            onBack={() => navigate('properties')}
            onNavigate={navigate}
            onOpenValuation={handleOpenValuation}
          />
        )}

        {currentView === 'login' && <LoginPage onNavigate={navigate} />}

        {currentView === 'register' && (
          <RegisterPage
            onNavigate={navigate}
            onOpenProfile={() => setProfileOpen(true)}
          />
        )}

        {currentView === 'forgot-password' && <ForgotPasswordPage onNavigate={navigate} />}

        {currentView === 'portal' && (
          <CustomerPortal
            initialTab={viewParam?.tab || 'overview'}
            onNavigate={navigate}
            onOpenValuation={handleOpenValuation}
            onOpenProfile={() => setProfileOpen(true)}
          />
        )}

        {currentView === 'owner' && (
          <OwnerDashboard
            onNavigate={navigate}
            onOpenValuation={handleOpenValuation}
          />
        )}

        {currentView === 'agent' && <AgentDashboard />}

        {currentView === 'admin' && <AdminDashboard onNavigate={navigate} />}

        {currentView === 'error' && (
          <ErrorPage
            code={viewParam?.code || 404}
            message={viewParam?.message}
            onNavigate={navigate}
          />
        )}
      </main>

      {/* Persistent Floating AI Advisor Pill for quick access */}
      <button
        onClick={() => setAdvisorOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all hover:scale-105 group"
      >
        <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
        <span>Ask AI Real Estate Advisor</span>
      </button>

      {/* Institutional Valuation Modal */}
      {valuationPropertyId && (
        <ValuationModal
          propertyId={valuationPropertyId}
          isOpen={Boolean(valuationPropertyId)}
          onClose={() => setValuationPropertyId(null)}
        />
      )}

      {/* AI Strategic Advisor Drawer */}
      <AiAdvisorDrawer
        isOpen={advisorOpen}
        onClose={() => setAdvisorOpen(false)}
        onNavigate={navigate}
      />

      {/* User Profile & Security Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Global Footer */}
      <Footer onNavigate={navigate} />
    </div>
  );
}

import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
