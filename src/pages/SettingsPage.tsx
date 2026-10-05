import { useState, useCallback, useEffect } from 'react';
import { supabase, type AppSettings, type ReportRecipient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  Mail,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

export function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('report_recipients').select('*').order('email'),
    ]);
    if (s.data) setSettings(s.data as AppSettings);
    setRecipients((r.data || []) as ReportRecipient[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!settings || !profile) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('app_settings')
      .update({
        inactivity_threshold_days: settings.inactivity_threshold_days,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handleAddRecipient() {
    if (!newEmail.trim() || !profile) return;
    setError(null);
    const { error: err } = await supabase
      .from('report_recipients')
      .insert({ email: newEmail.trim(), created_by: profile.id });
    if (err) {
      setError(err.message);
      return;
    }
    setNewEmail('');
    load();
  }

  async function handleDeleteRecipient(id: string) {
    await supabase.from('report_recipients').delete().eq('id', id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configuration de l'application
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Scan mode settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Mode de scan</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Seuil d'inactivité (jours)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Les OF sans mouvement depuis plus de ce nombre de jours sont
              signalés comme inactifs sur le tableau de bord.
            </p>
            <input
              type="number"
              min={1}
              max={365}
              value={settings?.inactivity_threshold_days || 3}
              onChange={(e) =>
                setSettings({
                  ...settings!,
                  inactivity_threshold_days: parseInt(e.target.value) || 3,
                })
              }
              className="w-24 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Enregistrement...
              </>
            ) : saved ? (
              <>
                <Check size={20} />
                Enregistré
              </>
            ) : (
              <>
                <Save size={20} />
                Enregistrer les paramètres
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report recipients */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={20} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">
            Destinataires du rapport quotidien
          </h2>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Le rapport quotidien est envoyé automatiquement par email à ces
          adresses. Il contient un résumé des mouvements de la journée et un
          export Excel en pièce jointe.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@atelier.fr"
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleAddRecipient}
            disabled={!newEmail.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus size={20} />
          </button>
        </div>

        {recipients.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            Aucun destinataire configuré
          </p>
        ) : (
          <div className="space-y-2">
            {recipients.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50"
              >
                <span className="text-sm text-slate-700">{r.email}</span>
                <button
                  onClick={() => handleDeleteRecipient(r.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
