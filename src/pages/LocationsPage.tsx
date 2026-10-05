import { useState, useCallback, useEffect } from 'react';
import { supabase, type Location } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  Pencil,
  Check,
  X,
} from 'lucide-react';

export function LocationsPage() {
  const { profile } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', zone: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name', { ascending: true });
    setLocations((data || []) as Location[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = profile?.role === 'supervisor' || profile?.role === 'admin';

  async function handleAdd() {
    if (!form.code.trim() || !form.name.trim()) return;
    setError(null);
    const { error: err } = await supabase.from('locations').insert({
      code: form.code.trim(),
      name: form.name.trim(),
      zone: form.zone.trim() || null,
      created_by: profile?.id,
    });
    if (err) {
      setError(err.code === '23505' ? 'Ce code existe déjà.' : err.message);
      return;
    }
    setForm({ code: '', name: '', zone: '' });
    setShowAdd(false);
    load();
  }

  async function handleUpdate(id: string) {
    if (!form.code.trim() || !form.name.trim()) return;
    setError(null);
    const { error: err } = await supabase
      .from('locations')
      .update({
        code: form.code.trim(),
        name: form.name.trim(),
        zone: form.zone.trim() || null,
      })
      .eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    setEditId(null);
    setForm({ code: '', name: '', zone: '' });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet emplacement ?')) return;
    await supabase.from('locations').delete().eq('id', id);
    load();
  }

  function startEdit(loc: Location) {
    setEditId(loc.id);
    setForm({ code: loc.code, name: loc.name, zone: loc.zone || '' });
  }

  const filtered = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      (l.zone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emplacements</h1>
          <p className="text-slate-500 text-sm mt-1">
            Zones, postes et emplacements de l'atelier
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setShowAdd(!showAdd);
              setEditId(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={18} />
            Ajouter
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Code (QR/code-barres)
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex: ZONE-A-01"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Poste de soudage A"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Zone (optionnel)
              </label>
              <input
                type="text"
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                placeholder="Ex: Atelier Nord"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
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
              onClick={handleAdd}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Ajouter
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
          placeholder="Rechercher..."
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
            <MapPin size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {locations.length === 0
                ? 'Aucun emplacement défini'
                : 'Aucun résultat'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filtered.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 transition-colors"
              >
                {editId === loc.id ? (
                  <div className="flex-1 grid sm:grid-cols-3 gap-2 mr-3">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={form.zone}
                      onChange={(e) => setForm({ ...form, zone: e.target.value })}
                      className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{loc.name}</p>
                    <p className="text-xs text-slate-500">
                      Code: {loc.code}
                      {loc.zone && ` · Zone: ${loc.zone}`}
                    </p>
                  </div>
                )}

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {editId === loc.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(loc.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(loc)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
