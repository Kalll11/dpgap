import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Camera,
  BarChart3,
  Flame,
  CheckSquare,
} from 'lucide-react';
import { Assessment } from '../types';
import {
  calculateOverallCompliance,
  calculateOverallRisk,
  calculateRecommendationProgress,
  sortCriteriaByPriority,
  isFoundationalDomain,
} from '../utils/scoring';

interface DashboardPageProps {
  assessment: Assessment;
  onSaveSnapshot: () => void;
}

// Custom Tick for PolarAngleAxis to prevent text overlapping on Spider Chart
const renderCustomAngleTick = (props: any) => {
  const { x, y, cx, cy, payload } = props;
  if (!payload || payload.value === undefined) return null;
  const text = String(payload.value);

  // PERBAIKAN ERROR 2322: Berikan pengetikan spesifik SVG text anchor
  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  if (x > cx + 20) textAnchor = 'start';
  else if (x < cx - 20) textAnchor = 'end';

  const isBelow = y > cy + 10;
  const isAbove = y < cy - 10;
  const deltaY = isBelow ? 10 : isAbove ? -6 : 0;

  const words = text.split(' ');
  if (words.length >= 2 && text.length > 12) {
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    return (
      <g transform={`translate(${x},${y + deltaY})`}>
        <text
          textAnchor={textAnchor}
          fill="#475569"
          fontSize={10}
          fontWeight={700}
        >
          <tspan x={0} dy={0}>{line1}</tspan>
          <tspan x={0} dy={12}>{line2}</tspan>
        </text>
      </g>
    );
  }

  return (
    <text
      x={x}
      y={y + deltaY}
      textAnchor={textAnchor}
      fill="#475569"
      fontSize={10}
      fontWeight={700}
    >
      {text}
    </text>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ assessment, onSaveSnapshot }) => {
  const criteria = assessment.criteria || [];
  const compliance = calculateOverallCompliance(criteria);
  const riskInfo = calculateOverallRisk(criteria);
  const recProgress = calculateRecommendationProgress(criteria);

  const itemsWithGapCount = criteria.filter((c) => c.targetLevel > c.currentLevel).length;
  const isAllMet = criteria.length > 0 && itemsWithGapCount === 0;

  // Top Critical Criteria sorted by Priority (Foundational domain gap > 0 items pinned at top)
  const topPriorities = sortCriteriaByPriority(
    criteria.filter((c) => c.targetLevel > 0 && c.targetLevel > c.currentLevel)
  );

  const topPriorityStage = topPriorities.length > 0 ? topPriorities[0].stage : null;

  const domainsInTopStage = topPriorityStage
    ? [...new Set(
        sortCriteriaByPriority(
          criteria.filter(
            (c) => c.stage === topPriorityStage && c.targetLevel > 0 && c.targetLevel > c.currentLevel
          )
        ).map((c) => c.domain)
      )].slice(0, 2)
    : [];

  // 1. Radar Chart Data (Target vs Current per Domain)
  const domainMap: Record<string, { targetSum: number; currentSum: number; count: number }> = {};
  criteria.forEach((c) => {
    if (!domainMap[c.domain]) {
      domainMap[c.domain] = { targetSum: 0, currentSum: 0, count: 0 };
    }
    domainMap[c.domain].targetSum += c.targetLevel;
    domainMap[c.domain].currentSum += c.currentLevel;
    domainMap[c.domain].count += 1;
  });

  const radarData = Object.entries(domainMap).map(([domain, val]) => ({
    domain: domain,
    Target: +(val.targetSum / val.count).toFixed(1),
    Current: +(val.currentSum / val.count).toFixed(1),
  }));

  // 2. Pie Chart Data (Gap Distribution)
  const noGapCount = criteria.filter((c) => c.targetLevel > 0 && c.currentLevel > 0 && c.currentLevel >= c.targetLevel).length;
  const minorGapCount = criteria.filter((c) => {
    if (c.targetLevel <= 0) return false;
    const g = c.targetLevel - c.currentLevel;
    return g === 1 || g === 2;
  }).length;
  const majorGapCount = criteria.filter((c) => {
    if (c.targetLevel <= 0) return false;
    return c.targetLevel - c.currentLevel >= 3;
  }).length;
  const unassessedCount = criteria.filter((c) => c.targetLevel === 0 || c.currentLevel === 0).length;

  const pieData = [
    { name: 'Selesai (Terpenuhi)', value: noGapCount, color: '#10B981' },
    { name: 'Gap Minor (1-2 Level)', value: minorGapCount, color: '#F59E0B' },
    { name: 'Gap Utama (3+ Level)', value: majorGapCount, color: '#EF4444' },
    ...(unassessedCount > 0 ? [{ name: 'Belum Diisi / Diatur', value: unassessedCount, color: '#94A3B8' }] : []),
  ];

  // 3. Trend Line Chart Data
  const trendData = (assessment.snapshots || []).map((s, idx) => ({
    name: `Snapshot ${idx + 1}`,
    date: new Date(s.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
    avgGap: s.avgGap,
    compliance: s.overallCompliance,
  }));

  return (
    <div className="space-y-6">
      {/* 4 Core Executive KPI Cards - Clean & Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Compliance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-red-200 dark:hover:border-red-900/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tingkat Kepatuhan Absolut</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">{compliance}%</div>
            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${compliance}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>{noGapCount} dari {criteria.length} kriteria terpenuhi</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {compliance >= 80 ? 'Sangat Baik' : compliance >= 60 ? 'Cukup Baik' : 'Perlu Perbaikan'}
            </span>
          </div>
        </div>

        {/* Card 2: Risk Level */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-red-200 dark:hover:border-red-900/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tingkat Risiko Gap</span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-red-600 dark:text-red-400 uppercase tracking-wide">
              {riskInfo.label}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Skor Prioritas Risiko: <strong className="text-slate-800 dark:text-slate-200">{riskInfo.avgPriorityScore} / 100</strong>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Kalkulasi besaran Gap x Impact Risiko
          </div>
        </div>

        {/* Card 3: Critical Focus Area */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-red-200 dark:hover:border-red-900/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Fokus Perbaikan Prioritas</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2 space-y-1">
            {topPriorityStage ? (
              <>
                <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {topPriorityStage}
                </div>
                <div className="space-y-1">
                  {domainsInTopStage.map((domain) => {
                    const isFound = isFoundationalDomain(domain);
                    return (
                      <div key={domain} className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                          <span className="truncate">{domain}</span>
                        </div>
                        {isFound && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex-shrink-0 border border-amber-300 dark:border-amber-800">
                            ⚠️ Fondasional
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-xs font-bold text-emerald-600">✓ Semua Kriteria Tercapai</div>
            )}
          </div>
          <div className="text-[11px] text-red-600 dark:text-red-400 font-bold truncate">
            Terdapat {majorGapCount} kriteria dengan Gap Utama (3+ Level)
          </div>
        </div>

        {/* Card 4: Action Plan Progress */}
        <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm flex flex-col justify-between transition-all ${
          isAllMet 
            ? 'border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-300' 
            : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Progres Jira / Action Plan</span>
            <div className={`p-2 rounded-xl ${
              isAllMet 
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
            }`}>
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          
          <div className="my-3">
            {/* LOGIKA KONDISIONAL: Jika tidak ada gap, tampilkan status Tuntas. Jika ada, tampilkan Bar. */}
            {isAllMet ? (
              <div className="py-1">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Tuntas
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                  ✓ Zero Gap
                </div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{recProgress}%</div>
                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${recProgress}%` }}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {isAllMet 
              ? "Semua kriteria telah mencapai target. Tidak ada tugas remediasi yang diperlukan." 
              : "*Persentase eksekusi dokumen/tugas remediasi yang telah diselesaikan."}
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart: Target vs Current per Domain */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                <span>Target vs Level Saat Ini (per Domain)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Perbandingan tingkat kematangan data protection per area
              </p>
            </div>
          </div>

          <div className="h-80 w-full flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="88%">
              <RadarChart
                data={radarData}
                cx="50%"
                cy="46%"
                outerRadius="58%"
                margin={{ top: 15, right: 30, bottom: 15, left: 30 }}
              >
                <PolarGrid stroke="#64748b" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.8} gridType="polygon" />
                <PolarAngleAxis dataKey="domain" tick={renderCustomAngleTick} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                <Radar name="Target Level" dataKey="Target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                <Radar name="Level Saat Ini" dataKey="Current" stroke="#dc2626" fill="#dc2626" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>

            {/* Custom HTML Legend below chart - avoids any SVG text overlap */}
            <div className="flex items-center justify-center gap-6 pt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-red-600 inline-block shadow-xs"></span>
                <span>Level Saat Ini</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-amber-500 inline-block shadow-xs"></span>
                <span>Target Level</span>
              </div>
            </div>
          </div>
        </div>

        {/* Donut Chart: Gap Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-600" />
                <span>Distribusi Kategori Gap</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proporsi tingkat penyelesaian kriteria evaluasi
              </p>
            </div>
          </div>

          <div className="h-80 w-full flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="88%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="48%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-4 pt-1 flex-wrap text-xs font-bold text-slate-700 dark:text-slate-300">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: p.color }}></span>
                  <span>{p.name} ({p.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Historical Trend Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Tren Perkembangan Compliance (Snapshot Historis)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grafik peningkatan kepatuhan dan penurunan gap dari waktu ke waktu
            </p>
          </div>

          <button
            onClick={onSaveSnapshot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Simpan Progress Snapshot</span>
          </button>
        </div>

        {trendData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="left" domain={[0, 4]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgGap"
                  name="Rata-rata Gap Level"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="compliance"
                  name="Compliance (%)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Belum ada data snapshot. Klik tombol <strong>"Simpan Progress Snapshot"</strong> di atas untuk mulai merekam progres perbaikan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};