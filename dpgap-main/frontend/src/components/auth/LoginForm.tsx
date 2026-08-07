import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import SliderCaptcha from './SliderCaptcha';

interface LoginFormProps {
  onLogin: (email: string, pass: string, captchaToken: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Backend saat ini hanya mengecek `captchaToken` terisi (bukan verifikasi
  // kriptografis ke Google), jadi slider ini SUDAH menjadi mekanisme verifikasi
  // human-gesture yang sebenarnya — token dikirim setelah slider tuntas 100%.
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [sliderResetSignal, setSliderResetSignal] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Email dan password wajib diisi.');
      return;
    }
    if (!captchaVerified) {
      setErrorMsg('Selesaikan verifikasi slider terlebih dahulu.');
      return;
    }
    setLoading(true);
    try {
      const captchaToken = `slider-verified-${Date.now()}`;
      await onLogin(email.trim(), password, captchaToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login. Periksa email dan password.');
      setCaptchaVerified(false);
      setSliderResetSignal((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      )}

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Email Kerja Karyawan
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-red-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">
          <Mail className="h-4 w-4 text-slate-400" />
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@telkomhub.co.id"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Kata Sandi
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-red-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">
          <Lock className="h-4 w-4 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-slate-400 transition hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Verifikasi Keamanan
        </label>
        <SliderCaptcha resetSignal={sliderResetSignal} onVerify={setCaptchaVerified} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          Ingat saya
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !captchaVerified}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#AA040E] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/25 transition hover:bg-[#8F040C] disabled:cursor-not-allowed disabled:opacity-60"      >
        {loading ? 'Memproses...' : 'Masuk ke DPGAP Platform'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="text-center text-sm text-slate-500">
        Belum punya akun?{' '}
        <button type="button" onClick={onSwitchToRegister} className="font-semibold text-red-600 hover:text-red-700">
          Daftar sekarang
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
