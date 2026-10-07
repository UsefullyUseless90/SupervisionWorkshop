import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Package, Loader2, AlertCircle, ArrowLeft, Mail } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMatricule, setForgotMatricule] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await signIn(matricule, password);
    if (err) setError(err);

    setLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(false);

    const trimmed = forgotMatricule.trim();
    if (!trimmed) {
      setForgotError('Veuillez saisir votre matricule.');
      return;
    }

    setForgotLoading(true);

    try {
      // Look up the user's email by matricule via the edge function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule: trimmed }),
      });

      const result = await response.json();

      if (!response.ok) {
        setForgotError(result.error || 'Erreur lors de la demande.');
        setForgotLoading(false);
        return;
      }

      // If reset was done by admin (temp password returned), show it
      if (result.temporaryPassword) {
        setForgotSuccess(true);
        setForgotLoading(false);
        return;
      }

      // Otherwise, a recovery email was sent
      setForgotSuccess(true);
      setForgotLoading(false);
    } catch {
      setForgotError('Erreur réseau. Réessayez.');
      setForgotLoading(false);
    }
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
              <Mail size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Mot de passe oublié</h1>
            <p className="text-slate-400 text-sm mt-1">
              Saisissez votre matricule pour réinitialiser votre mot de passe
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {forgotSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Mail size={32} className="text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Demande envoyée</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Un email de réinitialisation a été envoyé si le matricule
                    existe. Contactez un administrateur si vous ne recevez rien.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setForgotMode(false);
                    setForgotMatricule('');
                    setForgotSuccess(false);
                  }}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Matricule
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotMatricule}
                    onChange={(e) => setForgotMatricule(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Votre matricule"
                    autoComplete="username"
                  />
                </div>

                {forgotError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  Un email de réinitialisation sera envoyé à l'adresse associée
                  à votre matricule. Si vous n'avez pas accès à cet email,
                  contactez un administrateur.
                </p>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {forgotLoading && <Loader2 size={20} className="animate-spin" />}
                  Envoyer la demande
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setForgotError(null);
                  }}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Suivi OF</h1>
          <p className="text-slate-400 text-sm mt-1">
            Suivi physique des Ordres de Fabrication
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Utilisateur
              </label>
              <input
                type="text"
                required
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Utilisateur"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Mot de passe"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              Se connecter
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotMode(true);
                setError(null);
              }}
              className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          L'application ne génère jamais de numéro d'OF. Les références sont
          lues exclusivement depuis les dossiers physiques.
        </p>
      </div>
    </div>
  );
}
