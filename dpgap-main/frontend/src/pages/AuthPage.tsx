import React, { useState } from 'react';
import { ShieldCheck, Lock, UserPlus2 } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

interface AuthPageProps {
  onLogin: (email: string, pass: string, captchaToken: string) => Promise<void>;
  onRegister: (fullname: string, employeeId: string, email: string, pass: string, role: string) => Promise<any>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
}

type AuthTab = 'login' | 'register';

/**
 * AuthPage — kontainer split-screen 50:50.
 *
 * Sisi kiri (branding Telkom Hub) bersifat statis/persisten: hanya di-render SEKALI
 * di sini dan tidak pernah remount saat tab berganti, sehingga tidak ada layout shift
 * atau reset animasi. Sisi kanan hanya menukar komponen form (LoginForm / RegisterForm)
 * di dalam kartu yang sama.
 */
export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onVerifyOtp }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-100 md:flex-row">
      {/* ============ SISI KIRI — Hero / Branding (statis, tidak pernah remount) ============ */}
      <div className="relative hidden w-full flex-shrink-0 overflow-hidden bg-slate-950 md:flex md:w-1/2 md:flex-col md:justify-center md:px-16 lg:px-20">
        {/* Radial glow merah Telkom */}
        <div
          className="pointer-events-none absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(227,6,19,0.28) 0%, rgba(227,6,19,0) 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-16 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(227,6,19,0.18) 0%, rgba(227,6,19,0) 70%)' }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 max-w-xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-sm font-black text-white shadow-lg shadow-red-600/30">
              TLK
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.24em] text-white">DPGAP</div>
              <div className="text-xs text-rose-200/70">Telkom Hub &middot; Data Protection Division</div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-200 backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            Data Protection Gap Assessment
          </div>

          <h1 className="text-3xl font-semibold leading-snug text-white sm:text-4xl">
            Satu platform untuk memetakan, memantau, dan menuntaskan kepatuhan UU&nbsp;PDP di seluruh unit Telkom
            Group.
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Kelola self-assessment, gap analysis, dan rekomendasi step-up kepatuhan Perlindungan Data Pribadi secara
            terpusat, terukur, dan dapat diaudit.
          </p>

          <div className="grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-8">
            <div>
              <div className="text-2xl font-bold text-white">40+</div>
              <div className="mt-1 text-xs text-slate-400">Kriteria per assessment</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">13</div>
              <div className="mt-1 text-xs text-slate-400">Fokus area kepatuhan</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">6</div>
              <div className="mt-1 text-xs text-slate-400">Tahap siklus data</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ SISI KANAN — Kontainer Form ============ */}
      <div className="flex h-screen w-full flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-100 p-6 md:p-10">
        <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl">
          {/* Badge ringkas untuk layar kecil (sisi kiri disembunyikan di mobile) */}
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-[10px] font-black text-white">
              TLK
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900">DPGAP</div>
              <div className="text-[11px] text-slate-500">Telkom Hub</div>
            </div>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-red-50 p-2.5 text-red-600">
              {activeTab === 'login' ? <Lock className="h-5 w-5" /> : <UserPlus2 className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-red-500">DPGAP Access</div>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                {activeTab === 'login' ? 'Selamat datang kembali' : 'Pendaftaran Akun Baru'}
              </h2>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="mb-7 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'login' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Masuk System
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'register' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Daftar Karyawan
            </button>
          </div>

          {activeTab === 'login' ? (
            <LoginForm onLogin={onLogin} onSwitchToRegister={() => setActiveTab('register')} />
          ) : (
            <RegisterForm onRegister={onRegister} onVerifyOtp={onVerifyOtp} onSwitchToLogin={() => setActiveTab('login')} />
          )}
        </div>
      </div>
    </div>
  );
};
