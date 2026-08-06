import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, BadgeCheck, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { User } from '../../../shared/types';

interface AuthPageProps {
  onLogin: (email: string, pass: string, captchaToken: string) => Promise<void>;
  onRegister: (fullname: string, employeeId: string, email: string, pass: string, role: string) => Promise<any>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onVerifyOtp }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<'Admin' | 'Assessor'>('Assessor');
  
  // Security States
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isOtpStep, setIsOtpStep] = useState(false); // Mode Input OTP
  const [otpCode, setOtpCode] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Login dengan reCAPTCHA
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!captchaToken) {
      setErrorMsg('Harap selesaikan verifikasi reCAPTCHA terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      await onLogin(email.trim(), password, captchaToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register Tahap 1 (Kirim OTP ke Email)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onRegister(fullname.trim(), employeeId.trim(), email.trim(), password, role);
      setIsOtpStep(true); // Pindah ke layar ketik OTP
      setSuccessMsg(`Kode OTP telah dikirim ke ${email}. Periksa kotak masuk Anda.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim OTP pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verifikasi OTP Tahap 2 (Autentikasi Non-Robot)
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onVerifyOtp(email.trim(), otpCode.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Kode OTP salah atau sudah kadaluarsa.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setActiveTab('login');
    setIsOtpStep(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
            DP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white">DPGAP</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Enterprise Security
              </span>
            </div>
            <p className="text-xs text-slate-400">Telkom Hub · Data Protection Division</p>
          </div>
        </div>

        {/* Tab Switcher (Hanya muncul jika tidak sedang di step OTP) */}
        {!isOtpStep && (
          <div className="flex p-1 bg-slate-950/80 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Masuk System
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daftar Karyawan
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* KONDISI 1: FORM LOGIN + RECAPTCHA */}
        {activeTab === 'login' && !isOtpStep && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Kerja Karyawan</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@telkomhub.co.id"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Google reCAPTCHA Widget */}
            <div className="flex justify-center my-3">
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                onChange={(token) => setCaptchaToken(token)}
                theme="dark"
                size="compact"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <span>Memproses...</span> : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk ke DPGAP Platform</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* KONDISI 2A: FORM REGISTRASI TAHAP 1 */}
        {activeTab === 'register' && !isOtpStep && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="cth. Rafael Ahmad"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ID Karyawan (NIK/NIP)</label>
              <div className="relative">
                <BadgeCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="cth. EMP-1042"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Pilih Role Akses</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Admin' | 'Assessor')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="Assessor">Assessor (Penilai Kepatuhan)</option>
                <option value="Admin">Admin (Kelola Sistem & Role)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Kerja Resmi</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@telkomhub.co.id"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Domain wajib <code className="text-indigo-400">@telkomhub.co.id</code> atau <code className="text-indigo-400">@telkom.co.id</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 Karakter"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <span>Mengirim OTP...</span> : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Daftar & Kirim Kode OTP Email</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* KONDISI 2B: FORM VERIFIKASI OTP TAHAP 2 (Autentikasi Non-Robot) */}
        {isOtpStep && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            <div className="p-3 bg-indigo-950/50 border border-indigo-800/60 rounded-xl text-center space-y-1">
              <KeyRound className="w-8 h-8 text-indigo-400 mx-auto mb-1" />
              <h4 className="text-xs font-bold text-white">Autentikasi Non-Robot (OTP)</h4>
              <p className="text-[11px] text-slate-300">
                Masukkan 6 digit kode rahasia yang telah dikirimkan ke email <strong className="text-indigo-300">{email}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">Ketik Ulang Kode OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full py-3 rounded-xl bg-slate-950 border border-indigo-500/50 text-white text-center text-xl tracking-[0.5em] font-black focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <span>Memverifikasi...</span> : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verifikasi & Selesaikan Pendaftaran</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setIsOtpStep(false); setSuccessMsg(''); }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mt-2"
            >
              <ArrowLeft className="w-3 h-3" /> Kembali ke form sebelumnya
            </button>
          </form>
        )}

        {/* Quick Demo Access Box (Hanya di tab login & non-otp) */}
        {activeTab === 'login' && !isOtpStep && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] font-bold text-slate-400 mb-2">Akses Cepat Demo Akun:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@telkomhub.co.id', 'admin123')}
                className="px-2 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[11px] font-semibold hover:bg-indigo-900 transition-colors"
              >
                👑 Admin Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('assessor@telkomhub.co.id', 'assessor123')}
                className="px-2 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-900 transition-colors"
              >
                🔍 Assessor Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};