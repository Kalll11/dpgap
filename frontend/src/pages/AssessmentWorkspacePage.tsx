import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Assessment, Criterion, LifecycleStage, FocusArea, User } from '../types';
import {
  calculatePriorityScore,
  getPriorityCategory,
  IAPP_LEVEL_NAMES,
  isFoundationalDomain,
  getFoundationalJustification,
} from '../utils/scoring';

interface AssessmentWorkspacePageProps {
  assessment: Assessment;
  currentUser?: User | null;
  onUpdateCriterion: (id: string, updates: Partial<Criterion>) => void;
  onDeleteCriterion: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (criterion: Criterion) => void;
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

export const AssessmentWorkspacePage: React.FC<AssessmentWorkspacePageProps> = ({
  assessment,
  currentUser,
  onUpdateCriterion,
  onDeleteCriterion,
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const isViewer = false; // Viewer role no longer exists — Admin and Assessor share full edit rights

  const [selectedStage, setSelectedStage] = useState<LifecycleStage>('Collection');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingCriterion, setDeletingCriterion] = useState<Criterion | null>(null);

  const criteria = assessment.criteria || [];
  const domains = [...new Set(criteria.map((c) => c.domain))].sort();

  // Filter criteria
  const stageCriteria = criteria.filter((c) => c.stage === selectedStage);
  const filteredCriteria = stageCriteria.filter((c) => {
    const matchesSearch =
      c.checklist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.pic && c.pic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDomain = !selectedDomain || c.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Batch / Lifecycle Navigation Bar */}
      <div className="p-4 rounded-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tahapan Data Lifecycle Assessment
          </div>
          {!isViewer ? (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Kriteria</span>
            </button>
          ) : (
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800">
              👁️ Mode Read-Only (Viewer)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {LIFECYCLE_STAGES.map((stg) => {
            const count = criteria.filter((c) => c.stage === stg).length;
            const completed = criteria.filter((c) => c.stage === stg && c.currentLevel > 0 && c.currentLevel >= c.targetLevel).length;
            const isSelected = selectedStage === stg;

            return (
              <button
                key={stg}
                onClick={() => setSelectedStage(stg)}
                className={`p-3 rounded-sm border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold border-l-4'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {stg}
                </div>
                <div className="text-xs font-bold mt-1 flex items-center justify-between">
                  <span>{completed}/{count} Done</span>
                  {completed === count && count > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar Search & Domain Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pertanyaan, domain, atau PIC..."
            className="w-full pl-9 pr-3 py-2 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none"
            >
              <option value="">Semua Domain ({domains.length})</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {filteredCriteria.length} Kriteria
          </div>
        </div>
      </div>

      {/* Criteria Cards View */}
      {filteredCriteria.length > 0 ? (
        <div className="space-y-4">
          {filteredCriteria.map((item) => {
            const gap = Math.max(0, item.targetLevel - item.currentLevel);
            const priorityScore = calculatePriorityScore(
              item.targetLevel,
              item.currentLevel
            );
            const prioCategory = getPriorityCategory(priorityScore);
            const isFoundational = isFoundationalDomain(item.domain);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-sm bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                  isFoundational && gap > 0
                    ? 'border-amber-300 dark:border-amber-800 border-l-4 border-l-amber-500 ring-1 ring-amber-400/30'
                    : gap >= 3
                    ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500'
                    : gap > 0
                    ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500'
                    : 'border-emerald-200 dark:border-emerald-900/40 border-l-4 border-l-emerald-500 bg-emerald-50/10'
                }`}
              >
                {/* Item Top Meta Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase tracking-wider">
                      {item.domain}
                    </span>

                    {isFoundational && (
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                        ⚠️ Fondasional
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      PIC: {item.pic || '-'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${prioCategory.badgeBg} ${prioCategory.badgeText}`}>
                      {prioCategory.label}
                    </span>
                  </div>

                  {/* Actions */}
                  {!isViewer && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onOpenEditModal(item)}
                        className="p-1.5 rounded-sm text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Kriteria"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingCriterion(item)}
                        className="p-1.5 rounded-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Hapus Kriteria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Checklist Question */}
                <div className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed mb-4">
                  {item.checklist}
                </div>

                {/* Level Controls & Scoring Matrix */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6">
                  
                  {/* KELOMPOK KIRI: Target, Current, Gap */}
                  {/* Jarak antar komponen diperbesar menjadi gap-8 atau gap-12 di layar besar */}
                  <div className="flex flex-wrap items-center gap-8 md:gap-12">
                    
                    {/* Target Level (read-only) */}
                    <div className="flex-shrink-0 w-32 sm:w-36">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Target Level
                        </label>
                        {item.targetLevel === 0 ? (
                          <span className="text-[10px] font-bold text-amber-500">
                            Belum
                          </span>
                        ) : (
                          <span className="text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            LVL {item.targetLevel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={`target-${lvl}`}
                            className={`h-2.5 flex-1 rounded-full transition-all ${
                              item.targetLevel >= lvl
                                ? 'bg-amber-500 shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Current Level Controls (Read-Only / Terkunci) */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Current Level
                        </label>
                        {item.currentLevel === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 ml-2">
                            Belum Diisi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5" title="Diubah otomatis melalui penyelesaian Action Plan di halaman Rekomendasi">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={`current-${lvl}`}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              item.currentLevel === lvl
                                ? 'bg-indigo-600 text-white shadow-md font-extrabold ring-2 ring-indigo-600/30 transform scale-105'
                                : 'bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {lvl}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gap */}
                    <div className="flex-shrink-0 min-w-[60px]">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Gap</div>
                      <div
                        className={`text-sm font-black ${
                          gap === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {gap === 0 ? '✓ Zero' : `${gap} Level`}
                      </div>
                    </div>
                  </div>

                  {/* KELOMPOK KANAN: IAPP Maturity Name & Expand Button */}
                  <div className="flex flex-col sm:flex-row items-center lg:justify-end gap-4 mt-4 lg:mt-0 flex-1">
                    
                    {/* Teks didekatkan ke tombol (hapus flex-1) dan dibuat rata tengah (text-center) */}
                    <div className="text-[11px] font-medium text-slate-500 text-center leading-relaxed break-words max-w-[220px]">
                      {IAPP_LEVEL_NAMES[item.currentLevel]?.split('—')[1] || ''}
                    </div>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900 whitespace-nowrap flex-shrink-0"
                    >
                      <span>{isExpanded ? 'Sembunyikan' : 'Dasar Hukum & Detail'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                </div>

                {/* Expandable Justification, References & Evidence Drawer */}
                {isExpanded && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 text-xs animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Justification */}
                      <div>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-1">
                          Justifikasi Pentingnya Kontrol:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.justification || 'Tidak ada catatan justifikasi tertulis.'}
                        </p>
                      </div>

                      {/* Risk if Failed */}
                      <div>
                        <span className="font-bold text-red-600 dark:text-red-400 block mb-1">
                          Risiko Jika Tidak Terpenuhi:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.riskIfFailed || 'Potensi sanksi administratif dan breach data.'}
                        </p>
                      </div>
                    </div>

                    {/* Legal References Tags */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 font-mono font-bold">
                        UU PDP: {item.uuPdpRef || 'Pasal 39'}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-mono">
                        NIST: {item.nistRef || 'Protect-P'}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-mono">
                        PbD: {item.pbdRef || 'End-to-End Security'}
                      </span>
                    </div>

                    {/* Evidence Attachment Note */}
                    <div className="pt-2 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Status Action Plan: <strong className="text-slate-700 dark:text-slate-300">{item.actionStatus || 'Not Started'}</strong> ({item.actionProgress || 0}%)</span>
                      </div>
                      {item.actionDeadline && (
                        <div className="text-amber-600 dark:text-amber-400 font-medium">
                          Deadline: {item.actionDeadline}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Tidak ada kriteria evaluasi yang cocok dengan pencarian / filter pada tahap {selectedStage}.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
          >
            + Tambah Kriteria Baru
          </button>
        </div>
      )}

      {/* Delete Criterion Confirmation Modal */}
      {deletingCriterion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Konfirmasi Hapus Kriteria
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Apakah Anda yakin ingin menghapus kriteria evaluasi berikut?
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 leading-normal">
                {deletingCriterion.checklist}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Domain: <strong className="text-slate-700 dark:text-slate-300">{deletingCriterion.domain}</strong> | Tahap: <strong className="text-slate-700 dark:text-slate-300">{deletingCriterion.stage}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCriterion(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCriterion(deletingCriterion.id);
                  setDeletingCriterion(null);
                }}
                className="px-4.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Kriteria</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};