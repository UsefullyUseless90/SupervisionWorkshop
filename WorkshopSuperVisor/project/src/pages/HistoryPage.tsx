import { useState, useCallback, useEffect } from 'react';
import { supabase, type Movement } from '@/lib/supabase';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import {
  History,
  ArrowRight,
  Package,
  MapPin,
  Clock,
  User,
  ScanLine,
  AlertCircle,
} from 'lucide-react';

interface HistoryPageProps {
  ofReference: string | null;
  onClearReference: () => void;
}

export function HistoryPage({ ofReference, onClearReference }: HistoryPageProps) {
  const [query, setQuery] = useState(ofReference || '');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (ref: string) => {
    const trimmed = ref.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    setMovements([]);

    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('of_reference', trimmed)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMovements(data as Movement[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (ofReference) {
      setQuery(ofReference);
      search(ofReference);
    }
  }, [ofReference, search]);

  function handleDetected(value: string) {
    setQuery(value);
    onClearReference();
    search(value);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Historique d'un OF</h1>
        <p className="text-slate-500 text-sm mt-1">
          Parcours physique complet d'un dossier
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <BarcodeScanner
          onDetected={handleDetected}
          label="Scanner ou saisir la référence"
          placeholder="Référence OF..."
          mode="keyboard"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {searched && !loading && movements.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">
            Aucun mouvement trouvé pour "{query}"
          </p>
        </div>
      )}

      {movements.length > 0 && !loading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package size={20} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900 break-all">{query}</h2>
            <span className="text-sm text-slate-400 ml-auto">
              {movements.length} mouvement{movements.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Timeline */}
          <div className="relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

            {movements.map((m, i) => {
              const isFirst = i === 0;
              const isLast = i === movements.length - 1;
              return (
                <div key={m.id} className="relative pb-6 last:pb-0">
                  <div
                    className={`absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-slate-50 ${
                      m.status === 'anomaly'
                        ? 'bg-amber-500'
                        : isLast
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                  >
                    {isFirst ? (
                      <Package size={12} className="text-white" />
                    ) : (
                      <ArrowRight size={12} className="text-white" />
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={16} className="text-slate-400" />
                        <span className="text-slate-500">
                          {m.previous_location_name || 'Entrée atelier'}
                        </span>
                        <ArrowRight size={14} className="text-slate-300" />
                        <span className="font-semibold text-slate-900">
                          {m.new_location_name}
                        </span>
                      </div>
                      {m.status === 'anomaly' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                          anomalie
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {m.user_name}
                      </span>
                      {m.scan_method && (
                        <span className="flex items-center gap-1">
                          <ScanLine size={14} />
                          {m.scan_method}
                        </span>
                      )}
                    </div>

                    {m.comment && (
                      <p className="mt-2 text-sm text-slate-600 italic border-t border-slate-100 pt-2">
                        "{m.comment}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
