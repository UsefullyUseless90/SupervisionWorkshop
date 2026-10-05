import { useEffect, useState, useCallback } from 'react';
import { supabase, type Movement, type AppSettings } from '@/lib/supabase';
import {
  Package,
  Activity,
  MapPin,
  AlertTriangle,
  Search,
  TrendingDown,
  Clock,
} from 'lucide-react';
import type { PageKey } from '@/components/Layout';

interface DashboardData {
  activeOFs: number;
  movementsToday: number;
  recentMovements: Movement[];
  locationDistribution: { name: string; count: number }[];
  inactiveOFs: { of_reference: string; last_move: string; location: string | null }[];
  anomaliesToday: number;
}

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
}

export function DashboardPage({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [movementsToday, allMovements, settingsRes] = await Promise.all([
      supabase
        .from('movements')
        .select('*')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false }),
      supabase
        .from('movements')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
    ]);

    const todayMoves = (movementsToday.data || []) as Movement[];
    const allMoves = (allMovements.data || []) as Movement[];
    setSettings(settingsRes.data as AppSettings | null);

    const activeRefs = new Set(allMoves.map((m) => m.of_reference));

    const locDist = new Map<string, number>();
    const lastMoveByOF = new Map<string, Movement>();
    for (const m of allMoves) {
      if (!lastMoveByOF.has(m.of_reference)) {
        lastMoveByOF.set(m.of_reference, m);
        const loc = m.new_location_name;
        locDist.set(loc, (locDist.get(loc) || 0) + 1);
      }
    }

    const thresholdDays = settingsRes.data?.inactivity_threshold_days || 3;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
    const inactiveOFs: DashboardData['inactiveOFs'] = [];
    for (const [ref, move] of lastMoveByOF) {
      if (new Date(move.created_at) < thresholdDate) {
        inactiveOFs.push({
          of_reference: ref,
          last_move: move.created_at,
          location: move.new_location_name,
        });
      }
    }

    setData({
      activeOFs: activeRefs.size,
      movementsToday: todayMoves.length,
      recentMovements: allMoves.slice(0, 10),
      locationDistribution: Array.from(locDist.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      inactiveOFs: inactiveOFs.sort(
        (a, b) => new Date(a.last_move).getTime() - new Date(b.last_move).getTime()
      ),
      anomaliesToday: todayMoves.filter((m) => m.status === 'anomaly').length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function handleSearch() {
    if (searchValue.trim()) {
      onNavigate('track');
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxLocCount = Math.max(...data.locationDistribution.map((l) => l.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vue d'ensemble de l'atelier
        </p>
      </div>

      {/* Quick search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Rechercher une référence OF..."
            className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Rechercher
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package size={22} />}
          label="OF suivis"
          value={data.activeOFs}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Activity size={22} />}
          label="Mouvements aujourd'hui"
          value={data.movementsToday}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Anomalies aujourd'hui"
          value={data.anomaliesToday}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<TrendingDown size={22} />}
          label="OF inactifs"
          value={data.inactiveOFs.length}
          color="bg-red-50 text-red-600"
          subtitle={`> ${settings?.inactivity_threshold_days || 3} jours sans mouvement`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Location distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">
              Répartition par emplacement
            </h2>
          </div>
          {data.locationDistribution.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Aucun mouvement enregistré
            </p>
          ) : (
            <div className="space-y-3">
              {data.locationDistribution.map((loc) => (
                <div key={loc.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{loc.name}</span>
                    <span className="font-medium text-slate-900">
                      {loc.count}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${(loc.count / maxLocCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">
              Derniers mouvements
            </h2>
          </div>
          {data.recentMovements.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Aucun mouvement enregistré
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentMovements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {m.of_reference}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.previous_location_name || '—'} → {m.new_location_name}
                    </p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-xs text-slate-400">
                      {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {m.status === 'anomaly' && (
                      <span className="inline-block text-xs text-amber-600 font-medium">
                        anomalie
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inactive OFs */}
      {data.inactiveOFs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={20} className="text-amber-500" />
            <h2 className="font-semibold text-slate-900">
              OF sans mouvement récent
            </h2>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.inactiveOFs.map((of) => (
              <div
                key={of.of_reference}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {of.of_reference}
                  </p>
                  <p className="text-xs text-slate-500">
                    Emplacement: {of.location || '—'}
                  </p>
                </div>
                <p className="text-xs text-amber-600">
                  {new Date(of.last_move).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
