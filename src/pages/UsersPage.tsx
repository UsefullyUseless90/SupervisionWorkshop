import { useState, useCallback, useEffect } from 'react';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';
import {
  Users as UsersIcon,
  Search,
  AlertCircle,
  Shield,
  User as UserIcon,
  Eye,
} from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Opérateur',
  supervisor: 'Superviseur',
  admin: 'Administrateur',
};

const ROLE_ORDER: UserRole[] = ['admin', 'supervisor', 'operator'];

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  admin: Shield,
  supervisor: Shield,
  operator: UserIcon,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-blue-100 text-blue-700',
  operator: 'bg-slate-100 text-slate-600',
};

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers((data || []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRoleChange(id: string, newRole: UserRole) {
    setUpdatingId(id);
    setError(null);
    const { error: err } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);
    if (err) {
      setError(
        'Impossible de modifier le rôle. Note: le changement de rôle dans auth.users nécessite une intervention serveur.'
      );
    }
    load();
    setUpdatingId(null);
  }

  const filtered = users.filter(
    (u) =>
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestion des comptes et des rôles
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative mb-4">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <UsersIcon size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const RoleIcon = ROLE_ICONS[u.role];
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm shrink-0">
                    {(u.full_name || u.email).charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {u.full_name || u.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}
                    >
                      <RoleIcon size={12} />
                      {ROLE_LABELS[u.role]}
                    </span>
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as UserRole)
                      }
                      className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-2 text-sm text-blue-800">
          <Eye size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Nouveaux comptes</p>
            <p>
              Les utilisateurs se créent un compte via l'écran de connexion.
              Le rôle est choisi à l'inscription. L'administrateur peut ensuite
              ajuster les rôles ci-dessus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
