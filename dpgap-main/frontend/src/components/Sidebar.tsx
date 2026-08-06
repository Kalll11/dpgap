import React from 'react';
import {
  FolderKanban,
  LayoutDashboard,
  ClipboardCheck,
  BarChart2,
  FileCheck2,
  Receipt,
  Settings,
  LogOut,
  X,
  ArrowLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { User, Assessment } from '../../../shared/types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  activeAssessment: Assessment | null;
  isAssessmentOpen: boolean;
  onCloseAssessment: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  currentUser,
  onLogout,
  isOpen,
  onClose,
  activeAssessment,
  isAssessmentOpen,
  onCloseAssessment,
}) => {
  // Pengecekan Admin
  const isAdmin = currentUser?.role === 'Admin';

  // Sub menu items under Daftar Assessment — Admin & Assessor have equal access
  const assessmentSubItems = [
    { id: 'dashboard', label: 'Dashboard Ringkasan', icon: LayoutDashboard },
    { id: 'workspace', label: 'Checklist Workspace', icon: ClipboardCheck },
    { id: 'gap', label: 'Gap Matrix Prioritas', icon: BarChart2 },
    { id: 'recommendations', label: 'Action Plan Perbaikan', icon: FileCheck2 },
  ];

  // Independent main menu items
  // PERUBAHAN: Audit Log hanya akan dimasukkan ke dalam array jika User adalah Admin.
  const mainNavItems: { id: string; label: string; icon: typeof Settings; badge?: string }[] = [
    // Menggunakan spread operator untuk memasukkan Audit Log hanya untuk Admin
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Log System', icon: Receipt }] : []),
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const isSubPageActive = assessmentSubItems.some((s) => s.id === activePage);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container - Solid White in Light Mode */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen max-h-screen overflow-hidden w-64 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-4 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Header & Scrollable Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-2">
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white font-black text-xs flex items-center justify-center shadow-md shadow-red-600/30">
                TLK
              </div>
              <div>
                <div className="font-black text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>DPGAP Telkom</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold border border-red-500/30">
                    PDP
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Telkom Indonesia · Privacy Hub
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Assessment Banner - Only visible when an assessment is open */}
          {isAssessmentOpen && activeAssessment && (
            <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-red-500/30 dark:border-red-900/50 text-xs text-slate-700 dark:text-slate-200 shadow-xs space-y-2">
              <div className="text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3 text-red-500" />
                  <span>Assessment Terbuka</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white truncate text-xs">{activeAssessment.name}</div>
              
              <button
                type="button"
                onClick={() => {
                  onCloseAssessment();
                  onClose();
                }}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Tutup / Kembali Ke Daftar</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {/* PARENT MENU: Daftar Assessment */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onCloseAssessment();
                  onNavigate('assessments'); // PERBAIKAN: Menavigasi ke halaman assessments jika list diklik
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  activePage === 'assessments'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-l-4 border-red-600 font-extrabold'
                    : isSubPageActive
                    ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/80'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderKanban className={`w-4 h-4 ${activePage === 'assessments' ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                  <span>Daftar Assessment</span>
                </div>
                {isAssessmentOpen && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800/60 font-bold">
                    Aktif
                  </span>
                )}
              </button>

              {/* SUB MENU ITEMS under Daftar Assessment - Only shown AFTER clicking "Buka Assessment" */}
              {isAssessmentOpen && activeAssessment && (
                <div className="ml-3 pl-2 border-l-2 border-red-500/30 dark:border-red-900/40 space-y-1 my-1 animate-in fade-in duration-150">
                  <div className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sub Menu Assessment
                  </div>
                  {assessmentSubItems.map((sub) => {
                    const Icon = sub.icon;
                    const isActive = activePage === sub.id;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          onNavigate(sub.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold border-l-2 border-red-500 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3 h-3 text-red-600 dark:text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

            {/* MAIN INDEPENDENT NAV ITEMS */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                    isActive
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-l-4 border-red-600 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile & Logout */}
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          {currentUser && (
            <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {currentUser.fullname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.fullname}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.role}</div>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-white bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
};