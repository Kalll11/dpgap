import React, { useState, useEffect } from 'react';
import {
  Save,
  Users,
  Clock,
  Moon,
  Sun,
  AlertTriangle,
  Lock,
  Eye,
  ShieldCheck,
  UserCheck,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { User, Role } from '../types';
import { INITIAL_DOMAINS } from '../data/initialData';
import {
  getFoundationalDomains,
  setFoundationalDomains,
  isFoundationalDomain,
} from '../utils/scoring';

interface SettingsPageProps {
  retentionMonths: number;
  users: User[];
  currentUser: User | null;
  onSaveRetention: (newRetention: number) => void;
  onChangeUserRole: (userId: string, newRole: Role) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  retentionMonths,
  users,
  currentUser,
  onSaveRetention,
  onChangeUserRole,
  isDarkMode,
  onToggleTheme,
}) => {
  const [localRetention, setLocalRetention] = useState<number>(retentionMonths);
  const [foundationalList, setFoundationalList] = useState<string[]>(getFoundationalDomains());

  const isViewer = currentUser?.role === 'Viewer';
  const isAssessor = currentUser?.role === 'Assessor';
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    const handleChanged = () => {
      setFoundationalList(getFoundationalDomains());
    };
    window.addEventListener('dpgap_foundational_changed', handleChanged);
    return () => window.removeEventListener('dpgap_foundational_changed', handleChanged);
  }, []);

  const handleToggleFoundational = async (domainName: string) => {
    if (isViewer) return;
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

  const handleRetentionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    onSaveRetention(localRetention);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Pengaturan Sistem DPGAP
            </h2>
            {isViewer && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>Mode Viewer</span>
              </span>
            )}
            {isAssessor && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Mode Assessor</span>
              </span>
            )}
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mode Admin</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {isViewer
              ? 'Tampilan khusus akun Viewer — Anda dapat mengatur preferensi tema dan melihat struktur domain fondasional serta matriks hak akses RBAC.'
              : isAssessor
              ? 'Pengaturan untuk Assessor — Anda dapat mengatur tema interface dan konfigurasi flag Domain Fondasional evaluasi.'
              : 'Pengaturan penuh Administrator — Kelola tema, flag domain fondasional, periode retensi audit log, dan otorisasi user RBAC.'}
          </p>
        </div>

        {/* Profile Card Summary */}
        <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow">
            {currentUser?.fullname ? currentUser.fullname.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900 dark:text-white leading-tight">{currentUser?.fullname}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{currentUser?.email}</p>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">Role: {currentUser?.role}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Preference Theme (Tersedia untuk Semua Role) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Tema Tampilan Interface</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pilih antara mode terang (Light) atau mode gelap (Dark) sesuai kenyamanan visual Anda.</p>
        </div>

        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          <span>{isDarkMode ? 'Mode Terang (Light)' : 'Mode Gelap (Dark)'}</span>
        </button>
      </div>

      {/* Section 2: Foundational Domains Configuration */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Penentuan Flag Domain Fondasional</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Domain fondasional diprioritaskan utama di posisi paling atas pada Matriks Gap dan Rekomendasi Tindakan.
            </p>
          </div>

          {isViewer && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
              <Lock className="w-3.5 h-3.5" />
              <span>Tampilan Read-Only (Viewer)</span>
            </span>
          )}
        </div>

        {isViewer && (
          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Sebagai <strong>Viewer</strong>, Anda hanya dapat melihat status domain fondasional. Pengubahan flag ini membutuhkan hak akses <strong>Assessor</strong> atau <strong>Admin</strong>.</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {INITIAL_DOMAINS.map((dom) => {
            const isFound = isFoundationalDomain(dom);
            return (
              <button
                key={dom}
                type="button"
                onClick={() => handleToggleFoundational(dom)}
                disabled={isViewer}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isFound
                    ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-600 font-extrabold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                } ${isViewer ? 'cursor-default opacity-85 hover:border-slate-200 dark:hover:border-slate-700' : 'hover:border-amber-400'}`}
              >
                <span>{isFound ? '⚠️' : '⚪'}</span>
                <span>{dom}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">
                  {isFound ? 'Fondasional' : 'Standar'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Audit Log Retention (Khusus Admin / Informasi untuk Assessor & Viewer) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Pengaturan Retensi Audit Log</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Batas waktu penyimpanan log riwayat aktivitas pengguna sistem
            </p>
          </div>

          {isAdmin ? (
            <button
              onClick={handleRetentionSubmit}
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Retensi</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Dikelola oleh Administrator</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Masa Retensi Audit Log Aktif
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Aktivitas log yang lebih tua dari batas bulan ini akan dibersihkan secara otomatis demi efisiensi dan privasi data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={localRetention}
                  onChange={(e) => setLocalRetention(parseInt(e.target.value, 10) || 1)}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center text-xs"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bulan</span>
              </>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                {retentionMonths} Bulan (Aktif)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Role-Based Access Control (RBAC) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Manajemen User &amp; Matriks Hak Akses RBAC</span>
            </h3>
            {isViewer && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Ringkasan Otorisasi User</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Informasi daftar pengguna terdaftar dan struktur otorisasi peran (Admin, Assessor, Viewer).
          </p>
        </div>

        {/* RBAC Rights Comparison Matrix Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Matriks Otorisasi Peran Sistem DPGAP</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${isAdmin ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">1. Admin (Akses Penuh)</span>
                {isAdmin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">Role Anda</span>}
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-3">
                <li>Membuat, mengedit &amp; menghapus assessment.</li>
                <li>Mengubah tingkat kepatuhan &amp; target level.</li>
                <li>Mengubah hak akses (Role) pengguna lain.</li>
                <li>Mengatur retensi log &amp; flag domain fondasional.</li>
              </ul>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${isAssessor ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">2. Assessor (Auditor/Evaluator)</span>
                {isAssessor && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">Role Anda</span>}
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-3">
                <li>Membuat &amp; melakukan penilaian assessment.</li>
                <li>Mengisi bukti pendukung (evidence) &amp; justifikasi.</li>
                <li>Membuat &amp; memperbarui Action Plan perbaikan.</li>
                <li>Mengatur flag domain fondasional.</li>
              </ul>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${isViewer ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-700 dark:text-amber-300">3. Viewer (Read-Only)</span>
                {isViewer && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-600 text-white">Role Anda</span>}
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-3">
                <li>Membaca Dashboard Ringkasan &amp; Laporan Executive Brief.</li>
                <li>Melihat daftar assessment &amp; audit log aktivitas.</li>
                <li>Mengunduh Laporan PDF &amp; Excel.</li>
                <li><span className="text-amber-700 dark:text-amber-400 font-semibold">Tidak dapat mengubah data / skor assessment.</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* User List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3">Nama Karyawan</th>
                {!isViewer && <th className="p-3">ID (NIK/NIP)</th>}
                {!isViewer && <th className="p-3">Email Kerja</th>}
                <th className="p-3">Role Hak Akses</th>
                <th className="p-3">Tanggal Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSelf ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{u.fullname}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                            (Anda)
                          </span>
                        )}
                      </div>
                    </td>
                    {!isViewer && (
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{u.employeeId}</td>
                    )}
                    {!isViewer && (
                      <td className="p-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    )}
                    <td className="p-3">
                      {isAdmin ? (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value as Role;
                            onChangeUserRole(u.id, newRole);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Assessor">Assessor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          u.role === 'Admin'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : u.role === 'Assessor'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {u.role === 'Admin' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {u.role === 'Assessor' && <UserCheck className="w-3.5 h-3.5" />}
                          {u.role === 'Viewer' && <Eye className="w-3.5 h-3.5" />}
                          <span>{u.role}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString('id-ID')}
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

