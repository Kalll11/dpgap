import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Zap,
  Flame,
  ArrowUpRight,
  CheckSquare,
  Plus,
  Sparkles,
  Target,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
} from 'lucide-react';
import { Assessment, Criterion, ActionStatus, User } from '../types';
import {
  calculatePriorityScore,
  getPriorityCategory,
  IAPP_LEVEL_NAMES,
  isFoundationalDomain,
  getFoundationalJustification,
  sortCriteriaByPriority,
  getRemediationSuggestion,
} from '../utils/scoring';

interface RecommendationsPageProps {
  assessment: Assessment;
  currentUser?: User | null;
  onUpdateCriterion: (id: string, updates: Partial<Criterion>) => void;
}

const DEFAULT_MILESTONES = [
  { id: 'm1', label: 'Analisis & Identifikasi Celah', completed: false },
  { id: 'm2', label: 'Penyusunan Kebijakan / SOP Baru', completed: false },
  { id: 'm3', label: 'Rollout Teknis & Kontrol Keamanan', completed: false },
  { id: 'm4', label: 'Verifikasi Evident & Audit Sign-Off', completed: false },
];

export const RecommendationsPage: React.FC<RecommendationsPageProps> = ({
  assessment,
  currentUser,
  onUpdateCriterion,
}) => {
  const criteria = assessment.criteria || [];

  // STATE UNTUK PENCARIAN & FILTER
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'All'>('All');
  const [domainFilter, setDomainFilter] = useState<string>('All');

  // Daftar domain unik untuk dropdown filter
  const domains = [...new Set(criteria.map((c) => c.domain))].sort();

  // LOGIKA: Checklist tidak terisi otomatis oleh actionProgress
  const getCriterionChecklist = (item: Criterion) => {
    if (item.actionChecklist && item.actionChecklist.length > 0) {
      return item.actionChecklist;
    }
    return DEFAULT_MILESTONES.map((m) => ({ ...m, completed: false }));
  };

  // LOGIKA: Fungsi Reset & Naik Level
  const handleLevelUp = (item: Criterion) => {
    if (item.currentLevel >= item.targetLevel) return;
    const newLevel = Math.min(item.targetLevel, item.currentLevel + 1);
    onUpdateCriterion(item.id, {
      currentLevel: newLevel,
      actionChecklist: DEFAULT_MILESTONES.map((m) => ({ ...m, completed: false })),
      actionProgress: 0,
      actionStatus: 'Not Started',
    });
  };

  const handleToggleMilestone = (item: Criterion, milestoneId: string) => {
    const currentList = getCriterionChecklist(item);
    const updatedList = currentList.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );

    const completedCount = updatedList.filter((m) => m.completed).length;
    const newProgress = Math.round((completedCount / updatedList.length) * 100);

    let newStatus: ActionStatus = 'On Progress';
    if (completedCount === 0) newStatus = 'Not Started';
    else if (completedCount === updatedList.length) newStatus = 'Completed';

    onUpdateCriterion(item.id, {
      actionChecklist: updatedList,
      actionProgress: newProgress,
      actionStatus: newStatus,
    });
  };

  const handleAddCustomSubtask = (item: Criterion) => {
    const label = window.prompt('Masukkan nama tugas / milestone baru:');
    if (!label || !label.trim()) return;

    const currentList = getCriterionChecklist(item);
    const updatedList = [
      ...currentList,
      { id: `custom-${Date.now()}`, label: label.trim(), completed: false },
    ];

    const completedCount = updatedList.filter((m) => m.completed).length;
    const newProgress = Math.round((completedCount / updatedList.length) * 100);

    onUpdateCriterion(item.id, {
      actionChecklist: updatedList,
      actionProgress: newProgress,
    });
  };

  // LOGIKA FILTERING
  const filteredCriteria = criteria.filter((item) => {
    if (item.currentLevel === 0) {
      return false;
    }

    const matchesSearch =
      item.checklist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.actionPic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.pic || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || (item.actionStatus || 'Not Started') === statusFilter;
    const matchesDomain = domainFilter === 'All' || item.domain === domainFilter;

    return matchesSearch && matchesStatus && matchesDomain;
  });

  // Categorize items
  let quickWins: Criterion[] = [];
  let mediumPriority: Criterion[] = [];
  let criticalPriority: Criterion[] = [];
  const stepUpItems: Criterion[] = [];

  filteredCriteria.forEach((item) => {
    const gap = Math.max(0, item.targetLevel - item.currentLevel);
    if (gap > 0) {
      const score = calculatePriorityScore(item.targetLevel, item.currentLevel);
      if (score <= 25) quickWins.push(item);
      else if (score <= 50) mediumPriority.push(item);
      else criticalPriority.push(item);
    } else if (item.currentLevel < 5) {
      stepUpItems.push(item);
    }
  });

  quickWins = sortCriteriaByPriority(quickWins);
  mediumPriority = sortCriteriaByPriority(mediumPriority);
  criticalPriority = sortCriteriaByPriority(criticalPriority);

  const renderCard = (item: Criterion) => {
    const gap = Math.max(0, item.targetLevel - item.currentLevel);
    const score = calculatePriorityScore(item.targetLevel, item.currentLevel);
    const isFoundational = isFoundationalDomain(item.domain);
    const foundationalJustification = getFoundationalJustification(item.domain);
    const checklist = getCriterionChecklist(item);
    const completedCount = checklist.filter((m) => m.completed).length;
    const computedProgress = Math.round((completedCount / checklist.length) * 100);
    const concreteSuggestion = getRemediationSuggestion(item);

    return (
      <div
        key={item.id}
        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all flex flex-col ${
          isFoundational
            ? 'border-amber-300 dark:border-amber-800 border-l-4 border-l-amber-500 ring-1 ring-amber-400/20'
            : score >= 61
            ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500'
            : score >= 26
            ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500'
            : 'border-emerald-200 dark:border-emerald-900/40 border-l-4 border-l-emerald-500 bg-emerald-50/10'
        }`}
      >
        {/* Top Badges & Priority Score */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase tracking-wider border border-slate-200 dark:border-slate-700">
              {item.domain} • {item.stage}
            </span>
            {isFoundational && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                ⚠️ Fondasional
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-extrabold text-slate-600 dark:text-slate-300">
            Score: <span className={score >= 61 ? 'text-rose-600' : score >= 26 ? 'text-amber-600' : 'text-emerald-600'}>{score}%</span>
          </div>
        </div>

        {isFoundational && foundationalJustification && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
            <strong>Landasan Hukum/Struktural:</strong> {foundationalJustification}
          </div>
        )}

        {/* Question Title - Ukuran Diperbesar agar menjadi Fokus Utama */}
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug mb-4">
          {item.checklist}
        </h3>

        {/* Saran Tindakan Konkret Box */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 mb-5">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Saran Tindakan Konkret:</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {concreteSuggestion}
          </p>
        </div>

        {/* ACTION PLAN SECTION - TANPA BORDER LUAR */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-5">
          
          {/* Form Inputs (Berdiri Sendiri) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">PIC Eksekutor</label>
              <input
                type="text"
                value={item.actionPic || item.pic || ''}
                onChange={(e) => onUpdateCriterion(item.id, { actionPic: e.target.value })}
                placeholder="Team IT Security"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Target Deadline</label>
              <input
                type="date"
                value={item.actionDeadline || ''}
                onChange={(e) => onUpdateCriterion(item.id, { actionDeadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Status Remediasi</label>
              <select
                value={item.actionStatus || 'Not Started'}
                onChange={(e) => onUpdateCriterion(item.id, { actionStatus: e.target.value as ActionStatus })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Not Started">Not Started</option>
                <option value="On Progress">On Progress</option>
                <option value="Under Review">Under Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Progress Checklist Section (Boxed) */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <CheckSquare className="w-4 h-4 text-indigo-500" />
                <span>Checklist Progress Remediasi</span>
              </div>
              <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {completedCount}/{checklist.length} Selesai ({computedProgress}%)
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-indigo-500 dark:bg-indigo-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${computedProgress}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5 mb-2">
              {checklist.map((m) => (
                <label
                  key={m.id}
                  className="flex items-start gap-2.5 group cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={m.completed}
                    onChange={() => handleToggleMilestone(item, m.id)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span className={`text-xs transition-colors ${m.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                    {m.label}
                  </span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddCustomSubtask(item)}
              className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tugas Custom</span>
            </button>

            {/* Level Up Button */}
            {completedCount === checklist.length && checklist.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-start gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-2.5 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Checklist selesai 100%. Silakan verifikasi evident sebelum menaikkan level.</span>
                </div>
                {item.currentLevel < item.targetLevel && (
                  <button
                    type="button"
                    onClick={() => handleLevelUp(item)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-md transition-all"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Naikkan Current Level ke Level {item.currentLevel + 1}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 italic">
                * Selesaikan seluruh checklist di atas untuk membuka tombol kenaikan Current Level.
              </div>
            )}
          </div>

          {/* Action Notes & Evident Link */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Catatan Tindak Lanjut / Tautan Bukti Evident
            </label>
            <input
              type="text"
              value={item.actionNotes || ''}
              onChange={(e) => onUpdateCriterion(item.id, { actionNotes: e.target.value })}
              placeholder="Masukkan catatan atau URL Google Drive..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      
      {/* TOOLBAR: SEARCH & FILTERS */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-96 flex-shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari tugas, checklist, atau PIC..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ActionStatus | 'All')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="All">Semua Status</option>
              <option value="Not Started">Not Started</option>
              <option value="On Progress">On Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-slate-500">Domain:</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="All">Semua Domain</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ZONA A HEADER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-extrabold text-[10px] tracking-wider uppercase">
                Zona A
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Gap yang Perlu Ditutup (Action Plan Remediasi)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Daftar kriteria yang memiliki celah kepatuhan (Gap &gt; 0). Dilengkapi saran tindakan konkret, sub-tugas, PIC, dan deadline.
            </p>
          </div>
        </div>

        {/* 3 Columns: Quick Win, Medium, Critical */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Quick Win */}
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-950 dark:text-emerald-200">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Quick Win (Score 1 - 25)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                {quickWins.length} Items
              </span>
            </div>

            {quickWins.length > 0 ? (
              quickWins.map(renderCard)
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada kriteria Quick Win.
              </div>
            )}
          </div>

          {/* Column 2: Medium Priority */}
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-950 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Medium Priority (Score 26 - 60)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                {mediumPriority.length} Items
              </span>
            </div>

            {mediumPriority.length > 0 ? (
              mediumPriority.map(renderCard)
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada kriteria Medium Priority.
              </div>
            )}
          </div>

          {/* Column 3: Critical Priority */}
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs text-red-950 dark:text-red-200">
                <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Critical Priority (Score 61 - 100)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100">
                {criticalPriority.length} Items
              </span>
            </div>

            {criticalPriority.length > 0 ? (
              criticalPriority.map(renderCard)
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada kriteria Critical Priority.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ZONA B: PELUANG PENINGKATAN LANJUTAN */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-white font-extrabold text-[10px] tracking-wider uppercase">
                Zona B
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Peluang Peningkatan Lanjutan (Step-up to Level 5)</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kriteria yang telah memenuhi target awal dapat terus ditingkatkan ke level kematangan berikutnya hingga Level 5 (Optimized).
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {stepUpItems.length} Kriteria Siap Step-Up
          </span>
        </div>

        {stepUpItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stepUpItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white leading-snug">{item.checklist}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Domain: <strong className="text-slate-700 dark:text-slate-300">{item.domain}</strong> • Level Saat Ini: <strong className="text-emerald-600 dark:text-emerald-400">Level {item.currentLevel}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-950 dark:text-indigo-200 font-medium">
                    <strong>Rekomendasi Step-Up:</strong> {IAPP_LEVEL_NAMES[item.currentLevel + 1] || 'Level 5 — Optimized'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateCriterion(item.id, { currentLevel: Math.min(5, item.currentLevel + 1) })}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs transition-all flex-shrink-0"
                >
                  Naikkan Level +1
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 max-w-xl mx-auto space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Belum Ada Kriteria Capai Target</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Seluruh kriteria pada assessment ini saat ini masih dalam Zona A (memiliki gap). Ketika suatu kriteria telah mencapai target (Gap = 0), saran peningkatan ke level kematangan berikutnya akan otomatis muncul di Zona B ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};