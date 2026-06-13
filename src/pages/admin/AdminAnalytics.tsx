import { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, TrendingUp, Clock, Users, Folder, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../../components/Skeleton';

import { lazyWithRetry as lazy } from '../../lib/lazyWithRetry';
const AnalyticsCharts = lazy(() => import('../../components/admin/AnalyticsCharts'), 'AnalyticsCharts');

interface KPIState {
  dau: number;
  wau: number;
  mau: number;
  avgSessionMin: number;
  dauChange: number;
  wauChange: number;
}

interface WauMauItem {
  date: string;
  users: number;
}

interface ContentGrowthItem {
  date: string;
  materials: number;
  files: number;
}

interface TopGroupItem {
  id: string;
  name: string;
  members: number;
  messages: number;
  files: number;
  score: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [wauMau, setWauMau] = useState<WauMauItem[]>([]);
  const [contentGrowth, setContentGrowth] = useState<ContentGrowthItem[]>([]);
  const [funnel, setFunnel] = useState({ total: 0, uploaded: 0, joinedGroup: 0, returned7d: 0 });
  const [topGroups, setTopGroups] = useState<TopGroupItem[]>([]);
  const [peakHours, setPeakHours] = useState<number[]>(Array(24).fill(0));
  const [kpis, setKpis] = useState<KPIState>({ dau: 0, wau: 0, mau: 0, avgSessionMin: 0, dauChange: 0, wauChange: 0 });

  const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const adminId = sessionStorage.getItem('adminId');

      const { data, error } = await supabase.rpc('admin_get_analytics_suite', {
        p_admin_id: adminId,
        p_range_days: rangeDays
      });

      if (error) throw error;

      if (data) {
        setKpis(data.kpis);
        setWauMau(data.wau_mau || []);
        setContentGrowth(data.content_growth || []);
        setFunnel(data.funnel || { total: 0, uploaded: 0, joinedGroup: 0, returned7d: 0 });
        setTopGroups(data.top_groups || []);
        setPeakHours(data.peak_hours || []);
      }
    } catch (err: any) {
      console.error('[AdminAnalytics] Neural sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxFunnel = Math.max(funnel.total, 1);
  const maxPeak = Math.max(...peakHours, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={28} className="text-violet-500" /> Analytics & Insights
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Deep platform metrics and engagement intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition ${timeRange === r ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:bg-slate-50'}`}>{r}</button>
            ))}
          </div>
          <button onClick={fetchAnalytics} disabled={loading} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-violet-500 transition shadow-sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <SkeletonLine width="80px" height="1.5rem" />
              <SkeletonLine width="60px" height="10px" className="opacity-40" />
            </div>
          ))
        ) : [
          { label: 'Daily Active', value: kpis.dau, change: kpis.dauChange, icon: Users, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Weekly Active', value: kpis.wau, change: kpis.wauChange, icon: TrendingUp, gradient: 'from-sky-500 to-blue-600' },
          { label: 'Monthly Active', value: kpis.mau, change: null, icon: BarChart3, gradient: 'from-emerald-500 to-green-600' },
          { label: 'Avg Session', value: `${kpis.avgSessionMin}m`, change: null, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition">
            <div className={`w-10 h-10 bg-gradient-to-br ${k.gradient} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
              <k.icon size={20} className="text-white" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-black text-slate-900">{k.value}</h3>
              {k.change !== null && (
                <span className={`text-xs font-bold flex items-center gap-0.5 mb-1 ${k.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {k.change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(k.change)}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[350px] bg-white rounded-2xl border border-slate-100 animate-pulse" />
          <div className="h-[350px] bg-white rounded-2xl border border-slate-100 animate-pulse" />
        </div>
      }>
        <AnalyticsCharts wauMau={wauMau} contentGrowth={contentGrowth} />
      </Suspense>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retention Funnel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><SkeletonCircle size={18} /> Retention Funnel</h3>
          <div className="space-y-6">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                   <div className="flex justify-between">
                      <SkeletonLine width="80px" height="10px" />
                      <SkeletonLine width="40px" height="10px" />
                   </div>
                   <Skeleton className="w-full h-3 rounded-full opacity-20" />
                </div>
              ))
            ) : [
              { label: 'Signed Up', value: funnel.total, color: 'bg-violet-500' },
              { label: 'First Upload', value: funnel.uploaded, color: 'bg-sky-500' },
              { label: 'Joined Group', value: funnel.joinedGroup, color: 'bg-emerald-500' },
              { label: '7-Day Return', value: funnel.returned7d, color: 'bg-amber-500' },
            ].map((step, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">{step.label}</span>
                  <span className="font-black text-slate-900">{step.value} <span className="text-slate-400 font-medium">({maxFunnel ? Math.round((step.value / maxFunnel) * 100) : 0}%)</span></span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${step.color} rounded-full transition duration-700`} style={{ width: `${maxFunnel ? (step.value / maxFunnel) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Heatmap */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><SkeletonCircle size={18} /> Peak Usage Hours</h3>
          <div className="grid grid-cols-6 gap-1.5">
            {loading ? (
              Array(24).fill(0).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg opacity-10" />)
            ) : peakHours.map((v, i) => {
              const intensity = v / maxPeak;
              return (
                <div
                  key={i}
                  className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition hover:scale-110 cursor-default"
                  style={{ backgroundColor: `rgba(139,92,246,${Math.max(intensity * 0.8, 0.05)})`, color: intensity > 0.4 ? '#fff' : '#94a3b8' }}
                  title={`${i}:00 — ${v} users`}
                >
                  {i}h
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase">
             <span>Low</span>
             <div className="flex-1 mx-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-violet-100 to-violet-600 opacity-40" />
             </div>
             <span>High</span>
          </div>
        </div>

        {/* Top Groups */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><SkeletonCircle size={18} /> Top Groups</h3>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl">
                   <Skeleton className="w-8 h-8 rounded-lg" />
                   <div className="flex-1 space-y-1.5">
                      <SkeletonLine width="100px" height="12px" />
                      <SkeletonLine width="140px" height="8px" className="opacity-40" />
                   </div>
                   <SkeletonLine width="30px" />
                </div>
              ))
            ) : (topGroups && topGroups.length > 0 ? (
              topGroups.slice(0, 5).map((group, i) => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'}`}>
                      #{i + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm truncate max-w-[120px]">{group.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{group.members} members • {group.files} files</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-indigo-600">{group.messages}</div>
                    <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Msgs</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <div className="text-slate-300 mb-2">
                  <Folder size={32} className="mx-auto opacity-20" />
                </div>
                <div className="text-xs font-medium text-slate-400 italic">No active groups in this range</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
