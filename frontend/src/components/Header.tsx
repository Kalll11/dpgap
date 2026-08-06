import React, { useState } from 'react';
import { Menu, Download, ShieldCheck, FileSpreadsheet, FileText, ChevronDown, ArrowLeft, FolderOpen } from 'lucide-react';
import { User, Assessment } from '../types';

interface HeaderProps {
  currentUser: User | null;
  activeAssessment: Assessment | null;
  assessments: Assessment[];
  onSelectAssessment: (id: string | null) => void;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  activePage: string;
  isAssessmentOpen: boolean;
  onCloseAssessment: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeAssessment,
  assessments,
  onSelectAssessment,
  onToggleSidebar,
  isDarkMode,
  onToggleTheme,
  onExportExcel,
  onExportPDF,
  activePage,
  isAssessmentOpen,
  onCloseAssessment,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAssessSelect, setShowAssessSelect] = useState(false);

  const pageTitles: Record<string, { title: string; sub: string; badge: string; isSubMenu: boolean }> = {
    assessments: {
      title: 'Daftar Proyek Assessment',
      sub: 'Manajemen & pemantauan proyek kepatuhan pelindungan data pribadi Telkom Indonesia',
      badge: 'MENU UTAMA',
      isSubMenu: false,
    },
    dashboard: {
      title: 'Executive Dashboard',
      sub: activeAssessment
        ? `Ringkasan visual tingkat kepatuhan, risiko, dan progres perbaikan • Proyek: ${activeAssessment.name}`
        : 'Ringkasan visual tingkat kepatuhan, risiko, dan progres perbaikan',
      badge: 'SUB-MENU ASSESSMENT',
      isSubMenu: true,
    },
    workspace: {
      title: 'Checklist Assessment Workspace',
      sub: activeAssessment
        ? `Pengisian evaluasi mandiri, tingkat maturitas, dasar hukum & bukti • Proyek: ${activeAssessment.name}`
        : 'Pengisian evaluasi mandiri, tingkat maturitas, dasar hukum & bukti',
      badge: 'SUB-MENU ASSESSMENT',
      isSubMenu: true,
    },
    gap: {
      title: 'Gap Matrix & Analisis Prioritas',
      sub: activeAssessment
        ? `Matriks 2D pemetaan celah kepatuhan berdasarkan Impact vs Gap • Proyek: ${activeAssessment.name}`
        : 'Matriks 2D pemetaan celah kepatuhan berdasarkan Impact vs Gap',
      badge: 'SUB-MENU ASSESSMENT',
      isSubMenu: true,
    },
    recommendations: {
      title: 'Action Plan & Rekomendasi Peningkatan',
      sub: activeAssessment
        ? `Daftar langkah perbaikan konkret dengan status checklist & PIC • Proyek: ${activeAssessment.name}`
        : 'Daftar langkah perbaikan konkret dengan status checklist & PIC',
      badge: 'SUB-MENU ASSESSMENT',
      isSubMenu: true,
    },
    audit: {
      title: 'Audit Log & Riwayat Aktivitas',
      sub: 'Pencatatan rekam jejak audit sistem dan aktivitas pengguna secara transparan',
      badge: 'MENU UTAMA',
      isSubMenu: false,
    },
    settings: {
      title: 'Pengaturan Sistem',
      sub: 'Konfigurasi parameter sistem, retensi audit log, dan peran akun staf',
      badge: 'MENU UTAMA',
      isSubMenu: false,
    },
  };

  const currentMeta = pageTitles[activePage] || {
    title: 'Telkom DPGAP Platform',
    sub: 'Data Protection Gap Assessment Platform',
    badge: 'PLATFORM',
    isSubMenu: false,
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors shadow-xs">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Assessment Dropdown Breadcrumb for Sub-Menus */}
          {isAssessmentOpen && activeAssessment && currentMeta.isSubMenu && (
            <div className="relative">
              <button
                onClick={() => setShowAssessSelect(!showAssessSelect)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
                title="Ganti atau Tutup Assessment Aktif"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">Daftar Assessment</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showAssessSelect && (
                <div className="absolute left-0 mt-2 w-80 max-h-[80vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in duration-150">
                  <button
                    onClick={() => {
                      onCloseAssessment();
                      setShowAssessSelect(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Semua Daftar Assessment</span>
                  </button>

                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                  <div className="px-3.5 py-1.5 text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    <span>Ganti Assessment Aktif</span>
                  </div>

                  {assessments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        onSelectAssessment(a.id);
                        setShowAssessSelect(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                        a.id === activeAssessment.id
                          ? 'bg-red-50 dark:bg-red-950/60 font-extrabold text-red-700 dark:text-red-300 border-l-4 border-red-600'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="truncate pr-2">{a.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {a.criteria?.length || 0} kriteria
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{currentMeta.title}</span>
              </h1>

              {currentMeta.isSubMenu && activeAssessment ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
                  <span>PROYEK: {activeAssessment.name}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentMeta.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {currentMeta.sub}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Export Dropdown */}
          {activeAssessment && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Export Laporan</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in duration-150">
                  <button
                    onClick={() => {
                      onExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>Download PDF Report</span>
                  </button>
                </div>
              )}
            </div>
          )}


          {/* User Profile Badge */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black text-xs flex items-center justify-center shadow-md">
                {currentUser.fullname.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[130px]">
                  {currentUser.fullname}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>{currentUser.role} Telkom</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

