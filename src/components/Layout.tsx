import { type ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ScanLine,
  Search,
  FileText,
  Package,
  MapPin,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/supabase';

export type PageKey =
  | 'dashboard'
  | 'scan'
  | 'track'
  | 'history'
  | 'locations'
  | 'users'
  | 'settings'
  | 'reports';

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
  { key: 'scan', label: 'Scanner un OF', icon: ScanLine, roles: ['operator', 'supervisor', 'admin'] },
  { key: 'track', label: 'Rechercher un OF', icon: Search, roles: ['operator', 'supervisor', 'admin'] },
  { key: 'history', label: 'Historique', icon: FileText, roles: ['operator', 'supervisor', 'admin'] },
  { key: 'locations', label: 'Emplacements', icon: MapPin, roles: ['supervisor', 'admin'] },
  { key: 'users', label: 'Utilisateurs', icon: Users, roles: ['admin'] },
  { key: 'reports', label: 'Rapports', icon: FileText, roles: ['supervisor', 'admin'] },
  { key: 'settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Opérateur',
  supervisor: 'Superviseur',
  admin: 'Administrateur',
};

interface LayoutProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!profile) return null;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  function handleNav(key: PageKey) {
    onNavigate(key);
    setMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 text-white fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Package size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base">OF Tracker</h1>
            <p className="text-xs text-slate-400">Traçabilité atelier</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">
              {profile.full_name || profile.matricule || 'Utilisateur'}
            </p>
            <p className="text-xs text-slate-400">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package size={18} className="text-white" />
            </div>
            <span className="font-bold text-sm">OF Tracker</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileNavOpen && (
          <nav className="px-3 pb-4 space-y-1 border-t border-slate-700/50">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
            <div className="pt-2 mt-2 border-t border-slate-700/50">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white truncate">
                  {profile.full_name || profile.matricule || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-400">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
