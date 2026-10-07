import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User as UserIcon,
  Shield,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  production: 'Production',
  quality: 'Qualité',
  dpx: 'DPX',
  activity_manager: "Responsable d'activité",
  admin: 'Administrateur',
};

export function AccountPage() {
  const { profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit faire au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    if (newPassword === currentPassword) {
      setError("Le nouveau mot de passe doit être différent de l'ancien.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    }

    setSaving(false);
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mon compte</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gérez vos informations et votre mot de passe
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm mb-4">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <span>Votre mot de passe a été modifié avec succès.</span>
        </div>
      )}

      {/* Profile info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon size={20} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Informations personnelles</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium shrink-0">
              {(profile.full_name || profile.matricule || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">
                {profile.full_name || '—'}
              </p>
              <p className="text-xs text-slate-500">
                Matricule: {profile.matricule || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
            <Shield size={18} className="text-slate-400 shrink-0" />
            <span className="text-sm text-slate-500">Rôle:</span>
            <span className="text-sm font-medium text-slate-900">
              {ROLE_LABELS[profile.role] || profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Changer mon mot de passe</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Votre mot de passe actuel"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Au moins 6 caractères"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ressaisissez le nouveau mot de passe"
              autoComplete="new-password"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Modification...
              </>
            ) : (
              <>
                <KeyRound size={20} />
                Modifier mon mot de passe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
