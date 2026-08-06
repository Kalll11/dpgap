import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, BadgeCheck, AlertCircle, KeyRound, RefreshCw } from 'lucide-react';
import { fetchCaptcha } from '../api/apiClient';

interface AuthPageProps {
  onLogin: (email: string, pass: string, captchaId: string, captchaAnswer: string) => Promise<void>;
  onRequestOtp: (
    fullname: string,
    employeeId: string,
    email: string,
    pass: string
  ) => Promise<{ message: string; emailSent: boolean; expiresInSeconds: number }>;
  onRegister: (email: string, otpCode: string) => Promise<void>;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRequestOtp, onRegister }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Captcha (non-robot check) untuk login
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Registrasi 2 langkah: isi form -> kirim OTP ke email -> verifikasi kode
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpInfo, setOtpInfo] = useState('');

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer('');
    try {
      const c = await fetchCaptcha();
      setCaptchaId(c.captchaId);
      setCaptchaQuestion(c.question);
    } catch (_err) {
      setCaptchaQuestion('');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onLogin(email.trim(), password, captchaId, captchaAnswer.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login. Periksa email dan password.');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await onRequestOtp(fullname.trim(), employeeId.trim(), email.trim(), password);
      setOtpInfo(res.message);
      setRegisterStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim kode verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onRegister(email.trim(), otpCode.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal registrasi.');
    } finally {
      setLoading(false);
    }
  };

  const resetRegisterFlow = () => {
    setRegisterStep('form');
    setOtpCode('');
    setOtpInfo('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-red-600/30">
            TLK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white">DPGAP</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/30">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400">Telkom Hub · Data Protection Division</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950/80 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              loadCaptcha();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Masuk System
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              resetRegisterFlow();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daftar Karyawan
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email Kerja Karyawan
              </label>
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

            {/* Non-robot check: math captcha */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Verifikasi Non-Robot
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-200 select-none">
                    {captchaLoading ? 'Memuat...' : captchaQuestion || 'Gagal memuat captcha'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadCaptcha}
                  title="Muat ulang captcha"
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                required
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Masukkan hasil jawaban"
                className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || captchaLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk ke DPGAP Platform</span>
                </>
              )}
            </button>
          </form>
        ) : registerStep === 'form' ? (
          /* Registration Form — Langkah 1: isi data & kirim OTP */
          <form onSubmit={handleSendOtp} className="space-y-3.5">
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ID Karyawan (NIK/NIP)
              </label>
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email Kerja Resmi
              </label>
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
                Khusus karyawan resmi domain <code className="text-indigo-400">@telkomhub.co.id</code> atau <code className="text-indigo-400">@telkom.co.id</code>. Kode verifikasi akan dikirim ke email ini.
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
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Mengirim kode verifikasi...</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Kirim Kode Verifikasi ke Email</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Registration Form — Langkah 2: verifikasi kode OTP dari email */
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-3.5">
            {otpInfo && (
              <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-200 text-[11px]">
                {otpInfo}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Kode Verifikasi (6 digit)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm tracking-[0.3em] font-mono text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Dikirim ke <span className="text-indigo-400">{email}</span>. Kode berlaku 5 menit.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Verifikasi & Selesaikan Pendaftaran</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetRegisterFlow}
              className="w-full text-[11px] text-slate-400 hover:text-slate-200 font-semibold"
            >
              ← Ubah data pendaftaran / kirim ulang kode
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
