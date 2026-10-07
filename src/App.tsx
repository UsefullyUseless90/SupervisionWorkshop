import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout, type PageKey } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ScanPage } from '@/pages/ScanPage';
import { QualityCheckPage } from '@/pages/QualityCheckPage';
import { TrackPage } from '@/pages/TrackPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AccountPage } from '@/pages/AccountPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');
  const [historyRef, setHistoryRef] = useState<string | null>(null);
  const [trackQuery, setTrackQuery] = useState<string>('');

  // Production agents land on scan page; others on dashboard
  useEffect(() => {
    if (session && profile && profile.role === 'production') {
      setPage('scan');
    }
  }, [session, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  function handleNavigate(p: PageKey) {
    setPage(p);
    if (p !== 'history') setHistoryRef(null);
    if (p !== 'track') setTrackQuery('');
  }

  function handleShowHistory(ref: string) {
    setHistoryRef(ref);
    setPage('history');
  }

  return (
    <Layout currentPage={page} onNavigate={handleNavigate}>
      {page === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {page === 'scan' && <ScanPage initialQuery={trackQuery} />}
      {page === 'quality' && <QualityCheckPage />}
      {page === 'track' && (
        <TrackPage
          onShowHistory={handleShowHistory}
          initialQuery={trackQuery}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          ofReference={historyRef}
          onClearReference={() => setHistoryRef(null)}
        />
      )}
      {page === 'locations' && <LocationsPage />}
      {page === 'users' && <UsersPage />}
      {page === 'settings' && <SettingsPage />}
      {page === 'reports' && <ReportsPage />}
      {page === 'account' && <AccountPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
