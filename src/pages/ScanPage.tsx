import { useState, useCallback } from 'react';
import { supabase, type Movement, type Location, type ScanMethod } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Loader2,
  Package,
  Check,
  RotateCcw,
  PlayCircle,
  StopCircle,
  Clock,
  Timer,
} from 'lucide-react';

type Step = 'scan_of' | 'confirm_of' | 'scan_location' | 'confirm' | 'done';

interface PendingScan {
  scanType: 'start' | 'end';
  ofReference: string;
  location: Location;
  previousLocation: string | null;
  previousLocationId: string | null;
  comment: string;
  startScan: Movement | null;
}

interface ScanPageProps {
  initialQuery?: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "moins d'1 min";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

export function ScanPage({ initialQuery }: ScanPageProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('scan_of');
  const [ofReference, setOfReference] = useState('');
  const [previousLocation, setPreviousLocation] = useState<string | null>(null);
  const [previousLocationId, setPreviousLocationId] = useState<string | null>(null);
  const [activeStartScan, setActiveStartScan] = useState<Movement | null>(null);
  const [scannedLocation, setScannedLocation] = useState<Location | null>(null);
  const [comment, setComment] = useState('');
  const [scanMethod, setScanMethod] = useState<ScanMethod>('camera');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMovement, setSavedMovement] = useState<Movement | null>(null);
  const [savedScanType, setSavedScanType] = useState<'start' | 'end'>('start');
  const [savedDuration, setSavedDuration] = useState<number | null>(null);

  const reset = useCallback(() => {
    setStep('scan_of');
    setOfReference('');
    setPreviousLocation(null);
    setPreviousLocationId(null);
    setActiveStartScan(null);
    setScannedLocation(null);
    setComment('');
    setError(null);
    setSavedMovement(null);
  }, []);

  const handleOFDetected = useCallback(
    async (value: string) => {
      if (step !== 'scan_of') return;
      setError(null);

      const { data: lastMove } = await supabase
        .from('movements')
        .select('*')
        .eq('of_reference', value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastMovement = lastMove as Movement | null;

      if (lastMovement) {
        setPreviousLocation(lastMovement.new_location_name);
        setPreviousLocationId(lastMovement.new_location_id);

        if (lastMovement.scan_type === 'start') {
          setActiveStartScan(lastMovement);
        } else {
          setActiveStartScan(null);
        }
      } else {
        setPreviousLocation(null);
        setPreviousLocationId(null);
        setActiveStartScan(null);
      }

      setOfReference(value);
      setStep('confirm_of');
    },
    [step]
  );

  const handleLocationDetected = useCallback(
    async (value: string) => {
      if (step !== 'scan_location') return;
      setError(null);

      const { data: locData } = await supabase
        .from('locations')
        .select('*')
        .eq('code', value)
        .maybeSingle();

      if (!locData) {
        setError(
          `Emplacement "${value}" inconnu. Vérifiez le code ou ajoutez-le dans le référentiel des emplacements.`
        );
        return;
      }

      const loc = locData as Location;

      if (previousLocationId && loc.id === previousLocationId && !activeStartScan) {
        setError(
          `L'OF est déjà à l'emplacement "${loc.name}". Aucun déplacement nécessaire.`
        );
        return;
      }

      setScannedLocation(loc);
      setStep('confirm');
    },
    [step, previousLocationId, activeStartScan]
  );

  const determinedScanType: 'start' | 'end' = activeStartScan ? 'end' : 'start';

  async function handleSave() {
    if (!profile || !scannedLocation) return;
    if (!comment.trim()) {
      setError("Le commentaire est obligatoire pour indiquer la localisation de la pièce et de l'OF.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const isEndScan = determinedScanType === 'end';
      let durationMinutes: number | null = null;

      if (isEndScan && activeStartScan) {
        const startTime = new Date(activeStartScan.created_at).getTime();
        const endTime = Date.now();
        durationMinutes = Math.max(0, Math.round((endTime - startTime) / 60000));
      }

      const insertData: Record<string, unknown> = {
        of_reference: ofReference,
        previous_location_id: isEndScan ? previousLocationId : previousLocationId,
        previous_location_name: isEndScan ? previousLocation : previousLocation,
        new_location_id: scannedLocation.id,
        new_location_name: scannedLocation.name,
        user_id: profile.id,
        user_name: profile.full_name || profile.matricule || 'Utilisateur',
        scan_method: scanMethod,
        comment: comment.trim(),
        status: 'valid',
        scan_type: determinedScanType,
        duration_elapsed_minutes: durationMinutes,
      };

      if (!isEndScan) {
        insertData.previous_location_id = previousLocationId;
        insertData.previous_location_name = previousLocation;
      }

      const { data, error: insertError } = await supabase
        .from('movements')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedMovement(data as Movement);
      setSavedScanType(determinedScanType);
      setSavedDuration(durationMinutes);
      setStep('done');
    } catch {
      setError("Erreur lors de l'enregistrement du mouvement. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scanner un OF</h1>
        <p className="text-slate-500 text-sm mt-1">
          Scannez l'OF puis l'emplacement — début ou fin de présence
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-2">
        {[
          { key: 'scan_of', label: 'OF', icon: Package },
          { key: 'scan_location', label: 'Emplacement', icon: MapPin },
          { key: 'done', label: 'Validé', icon: Check },
        ].map((s, i) => {
          const stepOrder = ['scan_of', 'confirm_of', 'scan_location', 'confirm', 'done'];
          const currentIdx = stepOrder.indexOf(step);
          const thisIdx = stepOrder.indexOf(s.key === 'done' ? 'done' : s.key === 'scan_location' ? 'scan_location' : 'scan_of');
          const isDone = currentIdx > thisIdx;
          const isActive = currentIdx === thisIdx || (s.key === 'scan_of' && step === 'confirm_of') || (s.key === 'scan_location' && step === 'confirm');

          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isDone ? <Check size={20} /> : <s.icon size={20} />}
                </div>
                <span
                  className={`text-xs ${
                    isActive || isDone ? 'text-slate-700 font-medium' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    isDone ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
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
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
              <ScanLine size={40} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Scanner le dossier OF
            </h2>
            <p className="text-sm text-slate-500 text-center mt-1">
              Utilisez la caméra, un lecteur code-barres ou un PDA
            </p>
          </div>
          <BarcodeScanner
            onDetected={handleOFDetected}
            label="Scanner l'OF"
            placeholder="Scannez ou saisissez la référence OF..."
            onModeChange={(m) =>
              setScanMethod(
                m === 'camera'
                  ? 'camera'
                  : m === 'ocr'
                  ? 'ocr'
                  : 'barcode_reader'
              )
            }
          />
        </div>
      )}

      {/* Step: confirm OF */}
      {step === 'confirm_of' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle2 size={28} />
            <span className="font-semibold text-lg">OF détecté</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Référence lue</p>
            <p className="text-xl font-bold text-slate-900 break-all">
              {ofReference}
            </p>
          </div>

          {previousLocation && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin size={18} className="text-slate-400" />
              <span>
                Emplacement actuel: <strong>{previousLocation}</strong>
              </span>
            </div>
          )}

          {activeStartScan ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
              <StopCircle size={28} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Scan de fin détecté</p>
                <p className="text-sm text-amber-700">
                  Cet OF a un scan de début à « {activeStartScan.new_location_name} ».
                  Le prochain scan clôturera la présence et calculera le temps écoulé.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
              <PlayCircle size={28} className="text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Scan de début</p>
                <p className="text-sm text-blue-700">
                  Aucun scan de début en cours. Ce scan enregistrera l'arrivée de l'OF à un nouvel emplacement.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3.5 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Recommencer
            </button>
            <button
              onClick={() => setStep('scan_location')}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Confirmer et continuer
            </button>
          </div>
        </div>
      )}

      {/* Step: scan location */}
      {step === 'scan_location' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2 text-slate-500 text-sm">
            <Package size={18} />
            <span className="font-medium">{ofReference}</span>
            {previousLocation && (
              <>
                <ArrowRight size={16} />
                <span>{previousLocation}</span>
              </>
            )}
            <ArrowRight size={16} />
            <span className="text-blue-600 font-medium">?</span>
          </div>

          <div className="flex flex-col items-center mb-6 mt-4">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${determinedScanType === 'end' ? 'bg-amber-600 shadow-amber-600/20' : 'bg-green-600 shadow-green-600/20'}`}>
              {determinedScanType === 'end' ? <StopCircle size={40} className="text-white" /> : <PlayCircle size={40} className="text-white" />}
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              {determinedScanType === 'end' ? "Scanner l'emplacement de fin" : "Scanner l'emplacement de début"}
            </h2>
            <p className="text-sm text-slate-500 text-center mt-1">
              Scannez le QR code ou code-barres de l'emplacement
            </p>
          </div>

          <BarcodeScanner
            onDetected={handleLocationDetected}
            label="Scanner l'emplacement"
            placeholder="Scannez ou saisissez le code emplacement..."
          />
        </div>
      )}

      {/* Step: confirm movement */}
      {step === 'confirm' && scannedLocation && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-lg text-slate-900">
            {determinedScanType === 'end' ? 'Confirmer la fin de présence' : 'Confirmer le début de présence'}
          </h2>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 mb-0.5">OF</p>
              <p className="font-bold text-slate-900 break-all">{ofReference}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 rounded-lg bg-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">Ancien emplacement</p>
                <p className="font-medium text-slate-700">
                  {previousLocation || '— (premier mouvement)'}
                </p>
              </div>
              <ArrowRight size={24} className="text-slate-400 shrink-0" />
              <div className={`flex-1 p-3 rounded-lg border ${determinedScanType === 'end' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-xs mb-0.5 ${determinedScanType === 'end' ? 'text-amber-500' : 'text-blue-500'}`}>
                  {determinedScanType === 'end' ? 'Emplacement de fin' : 'Nouvel emplacement'}
                </p>
                <p className={`font-medium ${determinedScanType === 'end' ? 'text-amber-900' : 'text-blue-900'}`}>
                  {scannedLocation.name}
                </p>
              </div>
            </div>

            {determinedScanType === 'end' && activeStartScan && profile.role !== 'production' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 text-sm">
                <Timer size={18} className="text-slate-400" />
                <span className="text-slate-500">Temps écoulé (approximatif):</span>
                <span className="font-semibold text-slate-900">
                  {formatDuration(Math.max(0, Math.round((Date.now() - new Date(activeStartScan.created_at).getTime()) / 60000)))}
                </span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-500 mb-0.5">Utilisateur</p>
              <p className="font-medium text-slate-700">
                {profile.full_name || profile.matricule || 'Utilisateur'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Commentaire <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(obligatoire — localisation de la pièce et de l'OF)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
                placeholder="Indiquez la localisation de la pièce et de l'OF..."
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setScannedLocation(null);
                setStep('scan_location');
              }}
              className="flex-1 py-3.5 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Recommencer scan
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !comment.trim()}
              className={`flex-1 py-3.5 text-white rounded-xl font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${determinedScanType === 'end' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Enregistrement...
                </>
              ) : determinedScanType === 'end' ? (
                <>
                  <StopCircle size={20} />
                  Valider la fin
                </>
              ) : (
                <>
                  <PlayCircle size={20} />
                  Valider le début
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && savedMovement && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${savedScanType === 'end' ? 'bg-amber-100' : 'bg-green-100'}`}>
            {savedScanType === 'end' ? <StopCircle size={48} className="text-amber-600" /> : <CheckCircle2 size={48} className="text-green-600" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {savedScanType === 'end' ? 'Fin de présence enregistrée' : 'Début de présence enregistré'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {savedScanType === 'end'
                ? 'Le temps écoulé a été calculé'
                : "L'arrivée de l'OF a été tracée"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">OF</span>
              <span className="font-medium text-slate-900">{ofReference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Emplacement</span>
              <span className="font-medium text-slate-900">
                {savedMovement.new_location_name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Type de scan</span>
              <span className={`font-medium ${savedScanType === 'end' ? 'text-amber-600' : 'text-green-600'}`}>
                {savedScanType === 'end' ? 'Fin' : 'Début'}
              </span>
            </div>
            {savedScanType === 'end' && savedDuration !== null && profile.role !== 'production' && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Temps écoulé</span>
                <span className="font-semibold text-slate-900">
                  {formatDuration(savedDuration)}
                </span>
              </div>
            )}
            {profile.role !== 'production' && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Date/heure</span>
                <span className="font-medium text-slate-900">
                  {new Date(savedMovement.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Utilisateur</span>
              <span className="font-medium text-slate-900">
                {savedMovement.user_name}
              </span>
            </div>
            {savedMovement.comment && (
              <div className="pt-2 border-t border-slate-200 text-sm">
                <span className="text-slate-500">Commentaire: </span>
                <span className="text-slate-700 italic">"{savedMovement.comment}"</span>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} />
            Scanner un autre OF
          </button>
        </div>
      )}
    </div>
  );
}
