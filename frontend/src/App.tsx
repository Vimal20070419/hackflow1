import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegistrationDeskPage } from './pages/RegistrationDeskPage.js';
import { ParticipantPortalPage } from './pages/ParticipantPortalPage.js';
import { PrePrintedQRPoolPage } from './pages/PrePrintedQRPoolPage.js';
import { ExcelImportModal } from './components/ExcelImportModal.js';

const MainLayout: React.FC = () => {
  const { user, deskNumber } = useAuth();

  // Initial view detection from path or query
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (path.includes('/portal') || urlParams.get('qr') || urlParams.get('barcode')) {
      return 'portal';
    }
    if (path.includes('/pool')) {
      return 'pool';
    }
    if (path.includes('/login')) {
      return 'login';
    }
    const token = localStorage.getItem('hackflow_token');
    if (!token) {
      return 'login';
    }
    return deskNumber === 2 ? 'desk2' : 'desk1';
  };

  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [showExcelImport, setShowExcelImport] = useState<boolean>(false);

  // Synchronize navigation with browser history
  const navigateTo = (view: string) => {
    setCurrentView(view);
    const search = window.location.search;
    const path = view === 'desk1' ? `/${search}` : `/${view}${search}`;
    window.history.pushState({ view }, '', path);
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
      } else {
        setCurrentView(getInitialView());
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync with user's desk if authenticated
  useEffect(() => {
    if (user && currentView === 'login') {
      navigateTo(deskNumber === 2 ? 'desk2' : 'desk1');
    }
  }, [user, deskNumber]);

  // Robust view rendering with fallback so the page can NEVER be blank
  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return <LoginPage onSelectView={navigateTo} defaultDesk={deskNumber || 1} />;

      case 'desk2':
        return (
          <RegistrationDeskPage
            deskNumber={2}
            onSelectView={navigateTo}
          />
        );

      case 'portal':
        return <ParticipantPortalPage onSelectView={navigateTo} />;

      case 'pool':
      case 'qr-inventory':
        return (
          <PrePrintedQRPoolPage
            onSelectView={navigateTo}
            defaultDesk={deskNumber || 1}
          />
        );

      case 'desk1':
      case 'desk':
      case 'overview-dashboard':
      case 'register-team':
      case 'registered-teams':
      default:
        // Default to Desk 1
        return (
          <RegistrationDeskPage
            deskNumber={deskNumber || 1}
            onSelectView={navigateTo}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Main Viewport */}
      <main className="w-full">
        {renderCurrentView()}
      </main>

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImportModal
          onClose={() => setShowExcelImport(false)}
          onSuccess={() => {
            // Success callback
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainLayout />
      </SocketProvider>
    </AuthProvider>
  );
};
