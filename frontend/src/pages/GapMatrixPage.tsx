import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { BarChart3, Layers, ShieldCheck, Grid, Info, Filter, Settings2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Assessment, LifecycleStage, Criterion } from '../../../shared/types'
import {
  calculatePriorityScore,
  getPriorityCategory,
  isFoundationalDomain,
  getFoundationalJustification,
  getFoundationalDomains,
  setFoundationalDomains,
} from '../utils/scoring';
import { INITIAL_DOMAINS } from '../../../shared/data/initialData';

interface GapMatrixPageProps {
  assessment: Assessment;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'Collection',
  'Storage',
  'Use / Processing',
  'Sharing',
  'Retention',
  'Disposal',
  'Seluruh Tahap',
];

const GAP_LEVELS = [0, 1, 2, 3, 4];

export const GapMatrixPage: React.FC<GapMatrixPageProps> = ({ assessment }) => {
  const criteria = assessment.criteria || [];
  const [selectedCell, setSelectedCell] = useState<{ gap: number; domain: string } | null>(null);
  const [showFoundationalManager, setShowFoundationalManager] = useState(false);
  const [foundationalList, setFoundationalList] = useState<string[]>(getFoundationalDomains());

  useEffect(() => {
    const handleChanged = () => {
      setFoundationalList(getFoundationalDomains());
    };
    window.addEventListener('dpgap_foundational_changed', handleChanged);
    return () => window.removeEventListener('dpgap_foundational_changed', handleChanged);
  }, []);

  const toggleDomainFoundational = async (domainName: string) => {
    const current = getFoundationalDomains();
    const exists = current.some((d) => d.toLowerCase() === domainName.toLowerCase());
    let updated: string[];
    if (exists) {
      updated = current.filter((d) => d.toLowerCase() !== domainName.toLowerCase());
    } else {
      updated = [...current, domainName];
    }
    try {
      const saved = await setFoundationalDomains(updated);
      setFoundationalList(saved);
    } catch (err: any) {
      console.error('Error toggling foundational domain:', err);
    }
  };

  // 1. Unique Domains
  const domains = [...new Set(criteria.map((c) => c.domain))].sort();

  // 2. Domain Averages Data
  const domainMap: Record<string, { totalGap: number; totalPriority: number; count: number }> = {};
  criteria.forEach((c) => {
    const gap = Math.max(0, c.targetLevel - c.currentLevel);
    const priority = calculatePriorityScore(c.targetLevel, c.currentLevel);

    if (!domainMap[c.domain]) {
      domainMap[c.domain] = { totalGap: 0, totalPriority: 0, count: 0 };
    }
    domainMap[c.domain].totalGap += gap;
    domainMap[c.domain].totalPriority += priority;
    domainMap[c.domain].count += 1;
  });

  const domainData = Object.entries(domainMap)
    .map(([domain, val]) => ({
      domain,
      avgGap: +(val.totalGap / val.count).toFixed(1),
      avgPriority: +(val.totalPriority / val.count).toFixed(1),
    }))
    .sort((a, b) => b.avgPriority - a.avgPriority);

  // 3. Stage Data — jumlah kriteria dengan Gap Utama (≥3 level) per stage.
  const stageMap: Record<string, { majorGapCount: number; totalCount: number }> = {};
  criteria.forEach((c) => {
    const gap = Math.max(0, c.targetLevel - c.currentLevel);
    if (!stageMap[c.stage]) stageMap[c.stage] = { majorGapCount: 0, totalCount: 0 };
    stageMap[c.stage].totalCount += 1;
    if (gap >= 3) stageMap[c.stage].majorGapCount += 1;
  });

  const stageData = Object.entries(stageMap).map(([stage, val]) => ({
    stage,
    majorGapCount: val.majorGapCount,
    totalCount: val.totalCount,
  }));

  // Selected cell items
  const cellItems = selectedCell
    ? criteria.filter((c) => {
        const g = Math.max(0, c.targetLevel - c.currentLevel);
        return g === selectedCell.gap && c.domain === selectedCell.domain;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider border border-slate-200 dark:border-slate-700">
            Prioritas Perbaikan UU PDP
          </span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Gap Matrix &amp; Focus Area Telkom Hub
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
          Matriks perhitungan otomatis Priority Score berdasarkan besaran Gap (Target Level − Current Level). <br />
          <strong>Formula Urgensi Prioritas:</strong> Priority Score (%) = (Gap / 4) × 100%.
        </p>
      </div>

      {/* Heatmap Matrix Grid (Domain vs Gap) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Grid className="w-4 h-4 text-red-600" />
              <span>Matriks Gap Kepatuhan Per Domain Keamanan</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klik sel untuk melihat daftar kriteria spesifik pada domain dan besaran Gap tersebut
            </p>
          </div>

          <button
            onClick={() => setShowFoundationalManager(!showFoundationalManager)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>⚙️ Atur Domain Fondasional</span>
          </button>
        </div>

        {/* Foundational Domain Manager Panel */}
        {showFoundationalManager && (
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pengaturan Domain Fondasional (Flag Fondasional)</span>
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Klik tombol pada domain untuk mengaktifkan/mematikan status Fondasional. Domain fondasional otomatis diprioritaskan di baris paling atas matriks dan laporan rekomendasi.
                </p>
              </div>
              <button
                onClick={() => setShowFoundationalManager(false)}
                className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {[...new Set([...INITIAL_DOMAINS, ...domains])].map((dom: string) => {
                const isFound = isFoundationalDomain(dom);
                return (
                  <button
                    key={dom}
                    type="button"
                    onClick={() => toggleDomainFoundational(dom)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isFound
                        ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-600 font-extrabold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    <span>{isFound ? '⚠️' : '⚪'}</span>
                    <span>{dom}</span>
                    <span className="text-[10px] opacity-80">({isFound ? 'Fondasional' : 'Standar'})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <th className="p-2.5 border border-slate-200 dark:border-slate-700 text-left font-bold w-56">
                  Domain Keamanan \ Gap
                </th>
                {GAP_LEVELS.map((g) => {
                  const prio = Math.round((g / 4) * 100);
                  return (
                    <th key={g} className="p-2.5 border border-slate-200 dark:border-slate-700 text-center font-bold">
                      {g === 0 ? 'Gap 0 (0%)' : `Gap ${g} (${prio}%)`}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {domains.map((dom: string) => {
                const isFound = isFoundationalDomain(dom);
                return (
                  <tr key={dom} className={isFound ? 'border-l-4 border-l-amber-500 bg-amber-500/5' : ''}>
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white">
                      <div className="flex items-center justify-between gap-2">
                        <span>{dom}</span>
                        {isFound && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Fondasional</span>
                          </span>
                        )}
                      </div>
                    </td>
                  {GAP_LEVELS.map((gap) => {
                    const priorityScore = Math.round((gap / 4) * 100);
                    const matching = criteria.filter((c) => {
                      const g = Math.max(0, c.targetLevel - c.currentLevel);
                      return g === gap && c.domain === dom;
                    });
                    const isSelected = selectedCell?.gap === gap && selectedCell?.domain === dom;

                    let bgStyle = 'bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200';
                    if (priorityScore === 100) {
                      bgStyle = 'bg-rose-100/90 hover:bg-rose-200 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 font-bold';
                    } else if (priorityScore >= 75) {
                      bgStyle = 'bg-orange-100/80 hover:bg-orange-200 dark:bg-orange-950/60 text-orange-900 dark:text-orange-200';
                    } else if (priorityScore >= 50) {
                      bgStyle = 'bg-amber-100/80 hover:bg-amber-200 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200';
                    } else if (priorityScore > 0) {
                      bgStyle = 'bg-green-100/80 hover:bg-green-200 dark:bg-green-950/40 text-green-900 dark:text-green-200';
                    }

                    return (
                      <td
                        key={gap}
                        onClick={() => setSelectedCell({ gap, domain: dom })}
                        className={`p-2.5 border border-slate-200 dark:border-slate-700 text-center cursor-pointer transition-all ${bgStyle} ${
                          isSelected ? 'ring-2 ring-red-600 scale-[0.98]' : ''
                        }`}
                      >
                        <div className="font-mono text-xs font-black">{matching.length} item</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>

        {/* Selected Cell Detail Drawer */}
        {selectedCell && (
          <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-red-900 dark:text-red-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Info className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>
                  Detail Kriteria — Domain: <strong>{selectedCell.domain}</strong> | Gap {selectedCell.gap} Level (Priority Score:{' '}
                  {Math.round((selectedCell.gap / 4) * 100)}%)
                </span>
                {isFoundationalDomain(selectedCell.domain) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    ⚠️ Flag Fondasional
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold"
              >
                Tutup Detail
              </button>
            </div>

            {isFoundationalDomain(selectedCell.domain) && (
              <div className="p-2.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                <strong>Justifikasi Domain Fondasional:</strong>{' '}
                {getFoundationalJustification(selectedCell.domain)}
              </div>
            )}

            {cellItems.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {cellItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-2">[{item.stage}]</span>
                      <span className="text-slate-700 dark:text-slate-300">{item.checklist}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Target: L{item.targetLevel} | Cur: L{item.currentLevel}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                        PIC: {item.pic || '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Tidak ada kriteria yang berada pada kombinasi domain &amp; gap ini.</p>
            )}
          </div>
        )}
      </div>

      {/* Priority Score per Domain Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-600" />
            <span>Rata-rata Priority Score per Domain (0 - 100%)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tingkat urgensi penanganan per domain berdasarkan persentase gap rata-rata
          </p>
        </div>

        <div className="h-[560px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domainData} layout="vertical" margin={{ left: 170, right: 55, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#cbd5e1" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
              <YAxis dataKey="domain" type="category" interval={0} width={160} tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
              <Tooltip formatter={(val: any) => [`${val}%`, 'Priority Score']} />
              <Bar dataKey="avgPriority" name="Priority Score (%)" barSize={22} radius={[0, 6, 6, 0]}>
                <LabelList dataKey="avgPriority" position="right" formatter={(v: any) => `${v}%`} style={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }} />
                {domainData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.avgPriority >= 75
                        ? '#e11d48'
                        : entry.avgPriority >= 50
                        ? '#ea580c'
                        : entry.avgPriority >= 25
                        ? '#d97706'
                        : entry.avgPriority > 0
                        ? '#10b981'
                        : '#059669'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stage Major Gap Count Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Jumlah Kriteria Gap Utama per Tahap Lifecycle Data</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mendeteksi tahap operasional dengan kriteria bergap parah (3+ Level) terbanyak
          </p>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                formatter={(value: any, _name: any, props: any) => [
                  `${value} dari ${props.payload.totalCount} kriteria`,
                  'Gap Utama (3+ Level)',
                ]}
              />
              <Bar dataKey="majorGapCount" name="Gap Utama (3+ Level)" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lifecycle Stage Summary Table (matches Checklist Workspace stage grouping) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Ringkasan Evaluasi per Tahap Data Lifecycle</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penilaian terkelompok berdasarkan tahap Data Lifecycle, sama seperti pengelompokan di Checklist Workspace
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <th className="p-3 font-bold">Tahap Data Lifecycle</th>
                <th className="p-3 font-bold text-center">Total Kriteria</th>
                <th className="p-3 font-bold text-center">Compliance (%)</th>
                <th className="p-3 font-bold text-center">Avg Priority (%)</th>
                <th className="p-3 font-bold">Status Layanan</th>
              </tr>
            </thead>
            <tbody>
              {LIFECYCLE_STAGES.map((stage) => {
                const items = criteria.filter((c) => c.stage === stage);
                const count = items.length;
                const met = items.filter((c) => c.currentLevel >= c.targetLevel).length;
                const comp = count > 0 ? Math.round((met / count) * 100) : 0;
                const avgPrio =
                  count > 0
                    ? (
                        items.reduce(
                          (s, c) => s + calculatePriorityScore(c.targetLevel, c.currentLevel),
                          0
                        ) / count
                      ).toFixed(1)
                    : '0.0';

                return (
                  <tr key={stage} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{stage}</td>
                    <td className="p-3 text-center text-slate-600 dark:text-slate-400 font-mono">{count} items</td>
                    <td className="p-3 text-center">
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{comp}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold font-mono text-red-600 dark:text-red-400">{avgPrio}%</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          comp >= 80
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : comp >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                        }`}
                      >
                        {comp >= 80 ? 'Memenuhi Standar' : comp >= 50 ? 'Perlu Perbaikan' : 'Kritis (Critical)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
