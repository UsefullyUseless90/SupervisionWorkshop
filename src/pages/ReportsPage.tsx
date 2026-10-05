import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase, type Movement } from '@/lib/supabase';
import {
  FileText,
  Calendar,
  Download,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Clock,
  Package,
  MapPin,
  User,
  Activity,
} from 'lucide-react';

export function ReportsPage() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setSearched(true);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      setLoading(false);
      return;
    }

    setMovements((data || []) as Movement[]);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function handleExport() {
    setExporting(true);

    const rows = movements.map((m) => ({
      'OF': m.of_reference,
      'Ancien emplacement': m.previous_location_name || '',
      'Nouvel emplacement': m.new_location_name,
      'Utilisateur': m.user_name,
      'Date': new Date(m.created_at).toLocaleDateString('fr-FR'),
      'Heure': new Date(m.created_at).toLocaleTimeString('fr-FR'),
      'Méthode': m.scan_method || '',
      'Statut': m.status,
      'Type anomalie': m.anomaly_type || '',
      'Commentaire': m.comment || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 10 }, { wch: 15 },
      { wch: 10 }, { wch: 18 }, { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mouvements');

    const summaryData = [
      { 'Indicateur': 'Nombre total de mouvements', 'Valeur': movements.length },
      { 'Indicateur': 'OF différents scannés', 'Valeur': new Set(movements.map((m) => m.of_reference)).size },
      { 'Indicateur': 'Anomalies', 'Valeur': movements.filter((m) => m.status === 'anomaly').length },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    const byLocation = new Map<string, number>();
    for (const m of movements) {
      byLocation.set(
        m.new_location_name,
        (byLocation.get(m.new_location_name) || 0) + 1
      );
    }
    const locData = Array.from(byLocation.entries()).map(([name, count]) => ({
      'Emplacement': name,
      'Nombre de mouvements': count,
    }));
    const wsLoc = XLSX.utils.json_to_sheet(locData);
    wsLoc['!cols'] = [{ wch: 25 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsLoc, 'Par emplacement');

    const filename = `Rapport_Mouvements_OF_${date}.xlsx`;
    XLSX.writeFile(wb, filename);

    setExporting(false);
  }

  const uniqueOFs = new Set(movements.map((m) => m.of_reference)).size;
  const anomalies = movements.filter((m) => m.status === 'anomaly').length;
  const byLocation = new Map<string, number>();
  for (const m of movements) {
    byLocation.set(
      m.new_location_name,
      (byLocation.get(m.new_location_name) || 0) + 1
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rapports</h1>
        <p className="text-slate-500 text-sm mt-1">
          Rapport quotidien des mouvements
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Date du rapport
            </label>
            <div className="relative">
              <Calendar
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileText size={18} />
            )}
            Générer
          </button>
        </div>
      </div>

      {searched && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              icon={<Activity size={20} />}
              label="Mouvements"
              value={movements.length}
              color="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              icon={<Package size={20} />}
              label="OF différents"
              value={uniqueOFs}
              color="bg-green-50 text-green-600"
            />
            <SummaryCard
              icon={<MapPin size={20} />}
              label="Emplacements"
              value={byLocation.size}
              color="bg-slate-50 text-slate-600"
            />
            <SummaryCard
              icon={<AlertCircle size={20} />}
              label="Anomalies"
              value={anomalies}
              color="bg-amber-50 text-amber-600"
            />
          </div>

          {/* Export button */}
          {movements.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full mb-4 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
              Exporter Excel — Rapport_Mouvements_OF_{date}.xlsx
            </button>
          )}

          {/* By location */}
          {byLocation.size > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
              <h2 className="font-semibold text-slate-900 mb-3">
                Mouvements par emplacement
              </h2>
              <div className="space-y-2">
                {Array.from(byLocation.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50"
                    >
                      <span className="text-sm text-slate-700">{name}</span>
                      <span className="text-sm font-medium text-slate-900">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Movements table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                Détail des mouvements ({movements.length})
              </h2>
            </div>
            {movements.length === 0 ? (
              <div className="py-12 text-center">
                <FileText size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  Aucun mouvement le {new Date(date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">OF</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden sm:table-cell">De</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Vers</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Utilisateur</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Heure</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden lg:table-cell">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900 break-all">
                          {m.of_reference}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">
                          {m.previous_location_name || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {m.new_location_name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">
                          {m.user_name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          {m.status === 'anomaly' ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              anomalie
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              valide
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${color}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
