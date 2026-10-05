import { useState, useCallback } from 'react';
import { supabase, type Movement } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import {
  Search,
  Package,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  History,
  XCircle,
} from 'lucide-react';

interface TrackPageProps {
  onShowHistory: (ofReference: string) => void;
  initialQuery?: string;
}

export function TrackPage({ onShowHistory, initialQuery }: TrackPageProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState(initialQuery || '');
  const [result, setResult] = useState<{
    reference: string;
    currentLocation: string | null;
    lastMove: Movement | null;
    totalMoves: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (value: string) => {
    const ref = value.trim();
    if (!ref) return;

    setLoading(true);
    setNotFound(false);
    setSearched(true);
    setResult(null);

    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('of_reference', ref)
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const moves = data as Movement[];
    const last = moves[0];

    setResult({
      reference: ref,
      currentLocation: last.new_location_name,
      lastMove: last,
      totalMoves: moves.length,
    });
    setLoading(false);
  }, []);

  function handleDetected(value: string) {
    setQuery(value);
    doSearch(value);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rechercher un OF</h1>
        <p className="text-slate-500 text-sm mt-1">
          Trouvez l'emplacement actuel d'un dossier
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <BarcodeScanner
          onDetected={handleDetected}
          label="Scanner ou saisir la référence"
          placeholder="Scannez ou saisissez la référence OF..."
          mode="keyboard"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {notFound && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <XCircle size={48} className="text-slate-300 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-700">OF introuvable</h2>
          <p className="text-sm text-slate-500 mt-1">
            Aucun mouvement enregistré pour la référence "{query}"
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Package size={16} />
                OF
              </div>
              <p className="text-xl font-bold text-slate-900 break-all">
                {result.reference}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <MapPin size={16} />
                  Emplacement actuel
                </div>
                <p className="font-semibold text-slate-900">
                  {result.currentLocation || '—'}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Clock size={16} />
                  Dernier déplacement
                </div>
                <p className="font-semibold text-slate-900">
                  {result.lastMove && profile?.role !== 'production'
                    ? new Date(result.lastMove.created_at).toLocaleString('fr-FR')
                    : profile?.role === 'production' ? '—'
                    : '—'}
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <User size={16} />
                Déplacé par
              </div>
              <p className="font-semibold text-slate-900">
                {result.lastMove?.user_name || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 size={18} className="text-green-500" />
              {result.totalMoves} mouvement{result.totalMoves > 1 ? 's' : ''} au total
            </div>
            <button
              onClick={() => onShowHistory(result.reference)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              <History size={18} />
              Voir l'historique
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
