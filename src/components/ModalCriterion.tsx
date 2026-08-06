import React, { useState, useEffect } from 'react';
import { X, Save, FileText, CheckSquare, AlertTriangle } from 'lucide-react';
import { Criterion, LifecycleStage, FocusArea, ActionStatus } from '../types';

interface ModalCriterionProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (criterion: Omit<Criterion, 'id'>, id?: string) => void;
  editingCriterion: Criterion | null;
  domains: string[];
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

const FOCUS_AREAS: FocusArea[] = [
  'Dasar Pemrosesan Data Pribadi',
  'Pengendalian Akses Data Pribadi',
  'Akurasi, Keamanan dan Kerahasiaan Data Pribadi',
  'Pengendalian Pemrosesan Data Pribadi',
  'Pengawasan Pelindungan Data Pribadi',
];

const ACTION_STATUSES: ActionStatus[] = ['Not Started', 'On Progress', 'Under Review', 'Completed'];

export const ModalCriterion: React.FC<ModalCriterionProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCriterion,
  domains,
}) => {
  const [stage, setStage] = useState<LifecycleStage>('Collection');
  const [domain, setDomain] = useState<string>(domains[0] || 'Governance');
  const [focusArea, setFocusArea] = useState<FocusArea>('Dasar Pemrosesan Data Pribadi');
  const [pic, setPic] = useState<string>('IT Security');
  const [checklist, setChecklist] = useState<string>('');
  const [targetLevel, setTargetLevel] = useState<number>(4);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [justification, setJustification] = useState<string>('');
  const [riskIfFailed, setRiskIfFailed] = useState<string>('');
  const [evidenceName, setEvidenceName] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [uuPdpRef, setUuPdpRef] = useState<string>('');
  const [nistRef, setNistRef] = useState<string>('');
  const [pbdRef, setPbdRef] = useState<string>('');
  const [actionPic, setActionPic] = useState<string>('');
  const [actionDeadline, setActionDeadline] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('Not Started');
  const [actionProgress, setActionProgress] = useState<number>(0);
  const [actionNotes, setActionNotes] = useState<string>('');

  useEffect(() => {
    if (editingCriterion) {
      setStage(editingCriterion.stage);
      setDomain(editingCriterion.domain);
      setFocusArea(editingCriterion.focusArea || 'Dasar Pemrosesan Data Pribadi');
      setPic(editingCriterion.pic || 'IT Security');
      setChecklist(editingCriterion.checklist);
      setTargetLevel(editingCriterion.targetLevel);
      setCurrentLevel(editingCriterion.currentLevel); // Kita muat current level
      setJustification(editingCriterion.justification || '');
      setRiskIfFailed(editingCriterion.riskIfFailed || '');
      setEvidenceName(editingCriterion.evidenceName || '');
      setEvidenceUrl(editingCriterion.evidenceUrl || '');
      setUuPdpRef(editingCriterion.uuPdpRef || '');
      setNistRef(editingCriterion.nistRef || '');
      setPbdRef(editingCriterion.pbdRef || '');
      setActionPic(editingCriterion.actionPic || '');
      setActionDeadline(editingCriterion.actionDeadline || '');
      setActionStatus(editingCriterion.actionStatus || 'Not Started');
      setActionProgress(editingCriterion.actionProgress || 0);
      setActionNotes(editingCriterion.actionNotes || '');
    } else {
      setStage('Collection');
      setDomain(domains[0] || 'Governance');
      setFocusArea('Dasar Pemrosesan Data Pribadi');
      setPic('IT Security');
      setChecklist('');
      setTargetLevel(0);
      setCurrentLevel(0);
      setJustification('');
      setRiskIfFailed('');
      setEvidenceName('');
      setEvidenceUrl('');
      setUuPdpRef('Pasal 39 UU PDP');
      setNistRef('Protect-P (P.PR-DS)');
      setPbdRef('P5 - End-to-End Security');
      setActionPic('');
      setActionDeadline('');
      setActionStatus('Not Started');
      setActionProgress(0);
      setActionNotes('');
    }
  }, [editingCriterion, domains, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklist.trim()) return;

    // Pastikan jika status Completed, progress diset jadi 100% otomatis
    const finalProgress = actionStatus === 'Completed' ? 100 : actionProgress;

    onSave(
      {
        stage,
        domain,
        focusArea,
        pic,
        checklist: checklist.trim(),
        targetLevel,
        currentLevel, // Simpan current level hasil override
        justification: justification.trim(),
        riskIfFailed: riskIfFailed.trim(),
        evidenceName: evidenceName.trim(),
        evidenceUrl: evidenceUrl.trim(),
        uuPdpRef: uuPdpRef.trim(),
        nistRef: nistRef.trim(),
        pbdRef: pbdRef.trim(),
        actionPic: actionPic.trim(),
        actionDeadline,
        actionStatus,
        actionProgress: finalProgress,
        actionNotes: actionNotes.trim(),
      },
      editingCriterion ? editingCriterion.id : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCriterion ? 'Edit Kriteria Assessment' : 'Tambah Kriteria Assessment'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lengkapi metadata kriteria, tingkat kematangan target, dan rencana tindakan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Row 1: Lifecycle Stage & Domain */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tahap Lifecycle
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as LifecycleStage)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {LIFECYCLE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Domain Keamanan
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Focus Area Telkom Hub
              </label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value as FocusArea)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium truncate"
              >
                {FOCUS_AREAS.map((fa) => (
                  <option key={fa} value={fa}>
                    {fa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checklist Question & PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pertanyaan Evaluasi / Checklist *
              </label>
              <textarea
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
                required
                rows={2}
                placeholder="Apakah ..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                PIC Penanggung Jawab
              </label>
              <input
                type="text"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="cth. IT Security"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Target & Current Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3">
                Pengaturan Target Maturitas
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Level (0 = Belum Diatur, 1-5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(isNaN(parseInt(e.target.value, 10)) ? 0 : Math.max(0, Math.min(5, parseInt(e.target.value, 10))))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* AREA CURRENT LEVEL AWAL (Bersih & Netral) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3">
                Current Level Awal
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Level (0 - 5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(isNaN(parseInt(e.target.value, 10)) ? 0 : Math.max(0, Math.min(5, parseInt(e.target.value, 10))))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium leading-tight">
                  Kenaikan level selanjutnya hanya dapat dilakukan melalui penyelesaian 100% tugas di Action Plan.
                </p>
              </div>
            </div>
          </div>

          {/* Justification & Risk breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Justifikasi Kepentingan Kontrol
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                placeholder="Mengapa kontrol ini krusial untuk diterapkan..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-slate-700 dark:text-slate-300">
                Risiko / Dampak Jika Tidak Diterapkan
              </label>
              <textarea
                value={riskIfFailed}
                onChange={(e) => setRiskIfFailed(e.target.value)}
                rows={2}
                placeholder="Risiko kebocoran, denda UU PDP, reputasi..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* References: UU PDP, NIST, PbD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Referensi UU PDP
              </label>
              <input
                type="text"
                value={uuPdpRef}
                onChange={(e) => setUuPdpRef(e.target.value)}
                placeholder="Pasal 39 UU PDP"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                NIST Privacy Framework
              </label>
              <input
                type="text"
                value={nistRef}
                onChange={(e) => setNistRef(e.target.value)}
                placeholder="Protect-P (P.PR-DS)"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Privacy by Design
              </label>
              <input
                type="text"
                value={pbdRef}
                onChange={(e) => setPbdRef(e.target.value)}
                placeholder="P5 - End-to-End Security"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action Plan Details */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 space-y-3">
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>Rencana Tindakan Remediasi (Jira Action Plan)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100">
                Action Plan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIC Eksekutor
                </label>
                <input
                  type="text"
                  value={actionPic}
                  onChange={(e) => setActionPic(e.target.value)}
                  placeholder="Team SecOps"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={actionDeadline}
                  onChange={(e) => setActionDeadline(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Remediasi
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) => {
                    setActionStatus(e.target.value as ActionStatus);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {ACTION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Progress (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={actionStatus === 'Completed' ? 100 : actionProgress} // Otomatis 100 jika completed
                  disabled={actionStatus === 'Completed'}
                  onChange={(e) => setActionProgress(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Tindak Lanjut / Link Bukti Evident
              </label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Catatan pengerjaan atau URL dokumen evident..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{editingCriterion ? 'Simpan Perubahan' : 'Tambah Kriteria'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};