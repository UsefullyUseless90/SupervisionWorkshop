import { useState, useCallback, useEffect } from 'react';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';
import {
  Users as UsersIcon,
  Search,
  AlertCircle,
  Shield,
  User as UserIcon,
  Plus,
  Loader2,
  Trash2,
} from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  production: 'Production',
  quality: 'Qualité',
  dpx: 'DPX',
  activity_manager: "Responsable d'activité",
  admin: 'Administrateur',
};

const ROLE_ORDER: UserRole[] = ['admin', 'activity_manager', 'dpx', 'quality', 'production'];

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  admin: Shield,
  activity_manager: Shield,
  dpx: Shield,
  quality: Shield,
  production: UserIcon,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  activity_manager: 'bg-blue-100 text-blue-700',
  dpx: 'bg-cyan-100 text-cyan-700',
  quality: 'bg-teal-100 text-teal-700',
  production: 'bg-slate-100 text-slate-600',
};

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    matricule: '',
    password: '',
    fullName: '',
    role: 'production' as UserRole,
  });

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

  async function handleCreateUser() {
    if (!createForm.matricule.trim() || !createForm.password.trim() || !createForm.fullName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          matricule: createForm.matricule.trim(),
          password: createForm.password,
          fullName: createForm.fullName.trim(),
          role: createForm.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la création');
        setCreating(false);
        return;
      }

      setCreateForm({ matricule: '', password: '', fullName: '', role: 'production' });
      setShowAdd(false);
      load();
    } catch {
      setError('Erreur réseau lors de la création');
    }
    setCreating(false);
  }

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
      (u.matricule || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestion des agents et de leurs rôles
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={18} />
          Nouvel agent
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-900 mb-4">Créer un nouvel agent</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Matricule
              </label>
              <input
                type="text"
                value={createForm.matricule}
                onChange={(e) => setCreateForm({ ...createForm, matricule: e.target.value })}
                placeholder="Ex: AC_TICP_002"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom complet
              </label>
              <input
                type="text"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                placeholder="Ex: Jean Dupont"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <input
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Mot de passe de l'agent"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Rôle
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="production">Production</option>
                <option value="quality">Qualité</option>
                <option value="dpx">DPX</option>
                <option value="activity_manager">Responsable d'activité</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 size={16} className="animate-spin" />}
              Créer l'agent
            </button>
          </div>
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
          placeholder="Rechercher par nom ou matricule..."
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
                    {(u.full_name || u.matricule || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {u.full_name || u.matricule}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {u.matricule || '—'}
                    </p>
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
    </div>
  );
}
