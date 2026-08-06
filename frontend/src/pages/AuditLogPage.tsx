import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  FileSpreadsheet,
  FileText,
  Trash2,
  Clock,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { AuditLog, User } from '../types';

interface AuditLogPageProps {
  logs: AuditLog[];
  currentUser?: User | null;
  retentionMonths: number;
  onResetLogs: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onNavigate: (page: string) => void; // Menambahkan props onNavigate untuk melempar user
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({
  logs,
  currentUser,
  retentionMonths,
  onResetLogs,
  onExportExcel,
  onExportPDF,
  onNavigate, // Menangkap props onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // PERUBAHAN RBAC: Proteksi Halaman Audit Log
  // Efek ini akan berjalan setiap kali currentUser berubah.
  // Jika Role BUKAN Admin, maka langsung lempar user kembali ke halaman 'assessments'.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Admin') {
      onNavigate('assessments'); 
    }
  }, [currentUser, onNavigate]);

  // Jika bukan Admin, render null agar halaman kosong (tidak berkedip) sebelum dilempar pergi
  if (currentUser?.role !== 'Admin') {
    return null;
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.detail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
              System Audit
            </span>
            <span className="text-xs text-slate-400">• Retention: {retentionMonths} Bulan</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pencatatan Audit Log System
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Pencatatan otomatis seluruh aktivitas pengguna, pembaruan level assessment, ekspor dokumen, dan perubahan preferensi sistem.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          {/* Tombol Reset Log sekarang aman karena seluruh halaman ini milik Admin */}
          <button
            onClick={onResetLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:text-slate-300 dark:hover:text-red-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Log</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama user, aksi, atau detail..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan {filteredLogs.length} dari {logs.length} entri
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Waktu &amp; Tanggal</th>
                  <th className="p-3">User Pelaksana</th>
                  <th className="p-3">Aksi System</th>
                  <th className="p-3">Detail Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {log.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <p className="text-xs">Belum ada catatan log aktivitas yang tersimpan.</p>
          </div>
        )}
      </div>
    </div>
  );
};