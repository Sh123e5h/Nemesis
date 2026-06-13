import { TrendingUp, FileText } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WauMauItem {
  date: string;
  users: number;
}

interface ContentGrowthItem {
  date: string;
  materials: number;
  files: number;
}

interface AnalyticsChartsProps {
  wauMau: WauMauItem[];
  contentGrowth: ContentGrowthItem[];
}

export default function AnalyticsCharts({ wauMau, contentGrowth }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* WAU Trend */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-violet-500" /> Active Users Trend
        </h3>
        <div className="h-[250px] min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wauMau}>
              <defs>
                <linearGradient id="wauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }} />
              <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={3} fill="url(#wauGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Growth */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-sky-500" /> Content Growth
        </h3>
        <div className="h-[250px] min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contentGrowth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }} />
              <Bar dataKey="materials" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Materials" />
              <Bar dataKey="files" fill="#6366f1" radius={[6, 6, 0, 0]} name="Files" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
