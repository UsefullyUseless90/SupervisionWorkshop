import { useState, useCallback, useEffect } from 'react';
import { supabase, type QualityCheck, type Location } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MapPin,
  Package,
  User,
  Clock,
  AlertCircle,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react';

type Step = 'scan_of' | 'confirm' | 'done';

export function QualityCheckPage() {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('scan_of');
  const [ofReference, setOfReference] = useState('');
  const [result, setResult] = useState<'passed' | 'failed'>('passed');
  const [defectDescription, setDefectDescription] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCheck, setSavedCheck] = useState<QualityCheck | null>(null);

  const [recentChecks, setRecentChecks] = useState<QualityCheck[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [searchRef, setSearchRef] = useState('');

  const loadRecentChecks = useCallback(async () => {
    setLoadingChecks(true);
    const { data } = await supabase
      .from('quality_checks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentChecks((data || []) as QualityCheck[]);
    setLoadingChecks(false);
  }, []);

  useEffect(() => {
    loadRecentChecks();
  }, [loadRecentChecks]);

  const reset = useCallback(() => {
    setStep('scan_of');
    setOfReference('');
    setResult('passed');
    setDefectDescription('');
    setComment('');
    setError(null);
    setSavedCheck(null);
  }, []);

  function handleOFDetected(value: string) {
    setError(null);
    setOfReference(value);
    setStep('confirm');
  }

  async function handleSave() {
    if (!profile) return;
    if (result === 'failed' && !defectDescription.trim()) {
      setError('Veuillez décrire le défaut détecté.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('quality_checks')
        .insert({
          of_reference: ofReference,
          user_id: profile.id,
          user_name: profile.full_name || profile.matricule || 'Utilisateur',
          result,
          defect_description: result === 'failed' ? defectDescription.trim() : null,
          comment: comment.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedCheck(data as QualityCheck);
      setStep('done');
      loadRecentChecks();
    } catch {
      setError("Erreur lors de l'enregistrement du contrôle. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  const filteredChecks = recentChecks.filter((c) =>
    c.of_reference.toLowerCase().includes(searchRef.toLowerCase())
  );

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contrôle qualité</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vérifiez la conformité du produit et enregistrez le résultat
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step: scan OF */}
      {step === 'scan_of' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-teal-600/20">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Scanner le dossier OF
            </h2>
            <p className="text-sm text-slate-500 text-center mt-1">
              Scannez ou saisissez la référence de l'OF à contrôler
            </p>
          </div>
          <BarcodeScanner
            onDetected={handleOFDetected}
            label="Scanner l'OF"
            placeholder="Scannez ou saisissez la référence OF..."
          />
        </div>
      )}

      {/* Step: confirm */}
      {step === 'confirm' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Référence lue</p>
            <p className="text-xl font-bold text-slate-900 break-all">
              {ofReference}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Résultat du contrôle
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setResult('passed')}
                className={`py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  result === 'passed'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 size={24} />
                Conforme
              </button>
              <button
                onClick={() => setResult('failed')}
                className={`py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  result === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <XCircle size={24} />
                Défaut
              </button>
            </div>
          </div>

          {result === 'failed' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description du défaut
              </label>
              <textarea
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                rows={3}
                required
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
                placeholder="Décrivez le défaut constaté..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="Note optionnelle..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3.5 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Recommencer
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Valider le contrôle
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && savedCheck && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              savedCheck.result === 'passed' ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            {savedCheck.result === 'passed' ? (
              <CheckCircle2 size={48} className="text-green-600" />
            ) : (
              <XCircle size={48} className="text-red-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {savedCheck.result === 'passed'
                ? 'Contrôle validé'
                : 'Défaut enregistré'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {savedCheck.result === 'passed'
                ? 'Le produit a été déclaré conforme'
                : 'Le défaut a été enregistré dans la traçabilité'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">OF</span>
              <span className="font-medium text-slate-900">
                {savedCheck.of_reference}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Résultat</span>
              <span
                className={`font-medium ${
                  savedCheck.result === 'passed'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {savedCheck.result === 'passed' ? 'Conforme' : 'Défaut'}
              </span>
            </div>
            {savedCheck.defect_description && (
              <div className="text-sm">
                <span className="text-slate-500">Défaut: </span>
                <span className="text-slate-700">
                  {savedCheck.defect_description}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} />
            Contrôler un autre OF
          </button>
        </div>
      )}

      {/* Recent checks */}
      {step === 'scan_of' && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              Contrôles récents
            </h2>
          </div>
          <div className="relative mb-4">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="Filtrer par référence..."
              className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loadingChecks ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredChecks.length === 0 ? (
              <div className="py-12 text-center">
                <ShieldCheck size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  Aucun contrôle qualité enregistré
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {filteredChecks.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        c.result === 'passed'
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}
                    >
                      {c.result === 'passed' ? (
                        <CheckCircle2 size={18} className="text-green-600" />
                      ) : (
                        <XCircle size={18} className="text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.of_reference}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {c.result === 'passed'
                          ? 'Conforme'
                          : `Défaut: ${c.defect_description || '—'}`}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
