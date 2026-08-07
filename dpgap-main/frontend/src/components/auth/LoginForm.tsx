import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import SliderCaptcha from './SliderCaptcha';

// Akun dummy/percobaan — kredensial tetap, di-seed di backend (lihat DEFAULT_PASSWORDS
// di server.ts & INITIAL_USERS di shared/data/initialData.ts). Role SELALU Assessor.
// Tujuannya supaya bisa langsung "cicip" menu utama tanpa proses registrasi/OTP.
const DEMO_CREDENTIALS = {
  email: 'demo@telkomhub.co.id',
  password: 'Demo@12345',
};

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

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
  const [demoLoading, setDemoLoading] = useState(false);

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

  const handleDemoLogin = async () => {
    setErrorMsg('');
    setDemoLoading(true);
    try {
      // Tombol demo sengaja langsung memanggil onLogin (skip slider captcha) —
      // ini cuma jalan pintas UX untuk mencoba menu utama, bukan celah keamanan
      // (akun demo memang publik & selalu role Assessor).
      await onLogin(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, `demo-quick-login-${Date.now()}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk dengan akun demo.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
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
      </motion.div>

      <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
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
      </motion.div>

      <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Verifikasi Keamanan
        </label>
        <SliderCaptcha resetSignal={sliderResetSignal} onVerify={setCaptchaVerified} />
      </motion.div>

      <motion.div
        custom={3}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between text-sm"
      >
        <label className="flex items-center gap-2 text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          Ingat saya
        </label>
      </motion.div>

      <motion.button
        custom={4}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: loading || !captchaVerified ? 1 : 1.015 }}
        whileTap={{ scale: loading || !captchaVerified ? 1 : 0.98 }}
        type="submit"
        disabled={loading || !captchaVerified}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#AA040E] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/25 transition hover:bg-[#8F040C] disabled:cursor-not-allowed disabled:opacity-60"      >
        {loading ? 'Memproses...' : 'Masuk ke DPGAP Platform'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </motion.button>

      <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible" className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">atau</span>
        <div className="h-px flex-1 bg-slate-200" />
      </motion.div>

      <motion.button
        custom={6}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: demoLoading ? 1 : 1.015 }}
        whileTap={{ scale: demoLoading ? 1 : 0.98 }}
        type="button"
        onClick={handleDemoLogin}
        disabled={demoLoading || loading}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-red-300 bg-red-50/60 px-6 py-3.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        {demoLoading ? 'Menyiapkan akun demo...' : 'Masuk Cepat sebagai Demo (Assessor)'}
      </motion.button>
      <p className="text-center text-[11px] text-slate-400">
        Akun percobaan untuk langsung mencoba menu utama — role selalu Assessor, bukan Admin.
      </p>

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
