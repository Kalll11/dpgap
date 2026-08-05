import React, { useState, useRef } from 'react';
import {
  FolderPlus,
  Trash2,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { Assessment, User } from '../types';
import { calculateOverallCompliance, calculateOverallRisk } from '../utils/scoring';
import { parseAssessmentExcel } from '../utils/importer';

interface AssessmentsListPageProps {
  assessments: Assessment[];
  currentUser?: User | null;
  onOpenAssessment: (id: string) => void;
  onCreateAssessment: (name: string, description: string, templateType: 'template' | 'blank') => void;
  onDeleteAssessment: (id: string) => void;
  onImportAssessment: (name: string, description: string, criteria: any[]) => void;
}

export const AssessmentsListPage: React.FC<AssessmentsListPageProps> = ({
  assessments,
  currentUser,
  onOpenAssessment,
  onCreateAssessment,
  onDeleteAssessment,
  onImportAssessment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [templateType, setTemplateType] = useState<'template' | 'blank'>('template');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // LANGKAH 2C: Admin dan Assessor punya hak penuh di halaman ini
  const hasFullAccess = currentUser?.role === 'Admin' || currentUser?.role === 'Assessor';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateAssessment(newTitle.trim(), newDesc.trim(), templateType);
    setNewTitle('');
    setNewDesc('');
    setTemplateType('template');
    setIsModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      // Membaca file menggunakan array buffer
      const buffer = await file.arrayBuffer();
      // Menggunakan fungsi yang benar dari importer.ts
      const { assessmentName, description, criteria } = parseAssessmentExcel(buffer);
      
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      onImportAssessment(
        `Imported: ${assessmentName || fileNameWithoutExt}`,
        description || `Hasil import dari file excel ${file.name}`,
        criteria
      );
    } catch (error: any) {
      alert(`Gagal mengimpor file: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Daftar Workspace Assessment
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pilih, kelola, atau buat evaluasi kepatuhan baru
          </p>
        </div>

        {hasFullAccess && (
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Import Excel</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Assessment Baru</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {assessments.map((a) => {
          const compliance = calculateOverallCompliance(a.criteria || []);
          const riskInfo = calculateOverallRisk(a.criteria || []);

          return (
            <div
              key={a.id}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-red-300 dark:hover:border-red-900/50 transition-all flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>

              <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                
                {/* LANGKAH 2C: Assessor sekarang juga bisa melihat tombol Delete ini */}
                {hasFullAccess && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(a.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                    title="Hapus Assessment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mb-4 flex-1 relative z-10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">
                  {a.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {a.description || 'Tidak ada deskripsi'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 relative z-10">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Compliance
                  </div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {compliance}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Risiko Gap
                  </div>
                  <div className={`text-sm font-black mt-1 ${riskInfo.badgeText}`}>
                    {riskInfo.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(a.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
                <button
                  onClick={() => onOpenAssessment(a.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition-colors"
                >
                  Buka Workspace
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {assessments.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Belum Ada Assessment Terdaftar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Mulai evaluasi kepatuhan PDP dengan membuat workspace baru atau mengimpor data dari Excel.
          </p>
          {hasFullAccess && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Buat Assessment Pertama</span>
            </button>
          )}
        </div>
      )}

      {/* Modal Add Assessment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Buat Workspace Assessment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Inisiasi ruang kerja evaluasi untuk project, aplikasi, atau departemen tertentu.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama / Judul Assessment *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="cth. Aplikasi MyTelkomsel v2.0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Deskripsi / Konteks
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Konteks evaluasi atau ruang lingkup sistem..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Metode Inisialisasi Kriteria
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplateType('template')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      templateType === 'template'
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-500 ring-1 ring-red-500/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className={`text-xs font-bold ${templateType === 'template' ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      Gunakan Template
                    </span>
                    <span className="text-[9px] text-slate-500">
                      40+ Kriteria Standar DPGAP Telkom Hub
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('blank')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      templateType === 'blank'
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-500 ring-1 ring-red-500/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className={`text-xs font-bold ${templateType === 'blank' ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      Mulai Kosong
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Saya akan import dari Excel atau input manual
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                >
                  Buat Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Hapus Assessment?
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-5">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Seluruh data kriteria, action plan, dan riwayat snapshot di dalam workspace ini akan terhapus secara permanen dari database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAssessment(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};