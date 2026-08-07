import React, { useState } from 'react';
import { UserCheck, BadgeCheck, Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { getPasswordStrength, validatePasswordStrength } from '../../utils/authValidation';
import SliderCaptcha from './SliderCaptcha';

interface RegisterFormProps {
  onRegister: (fullname: string, employeeId: string, email: string, pass: string, role: string) => Promise<any>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
  onSwitchToLogin: () => void;
}

const strengthBarTone = (score: number) => {
  if (score <= 1) return 'bg-red-500';
  if (score <= 3) return 'bg-amber-500';
  if (score === 4) return 'bg-emerald-500';
  return 'bg-green-600';
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onVerifyOtp, onSwitchToLogin }) => {
  const [fullname, setFullname] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Assessor'>('Assessor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [sliderResetSignal, setSliderResetSignal] = useState(0);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.ok) {
      setErrorMsg(passwordCheck.error || 'Password tidak aman.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (!captchaVerified) {
      setErrorMsg('Selesaikan verifikasi slider terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      await onRegister(fullname.trim(), employeeId.trim(), email.trim(), password, role);
      setSuccessMsg(`Kode OTP telah dikirim ke ${email}. Periksa kotak masuk Anda.`);
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim OTP pendaftaran.');
      setCaptchaVerified(false);
      setSliderResetSignal((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

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

  const resetFlow = () => {
    setStep('form');
    setOtpCode('');
    setSuccessMsg('');
    setErrorMsg('');
  };

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
        {successMsg && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <KeyRound className="mx-auto mb-2 h-7 w-7 text-red-500" />
          <h4 className="text-sm font-bold text-slate-900">Autentikasi Non-Robot (OTP)</h4>
          <p className="mt-1 text-xs text-slate-500">
            Masukkan 6 digit kode yang dikirim ke <span className="font-semibold text-red-600">{email}</span>
          </p>
        </div>

        <div>
          <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Kode Verifikasi
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-center text-2xl font-black tracking-[0.4em] text-slate-900 outline-none focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading || otpCode.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#AA040E] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/25 transition hover:bg-[#8F040C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Memverifikasi...' : (
            <>
              <ShieldCheck className="h-4 w-4" /> Verifikasi & Selesaikan Pendaftaran
            </>
          )}
        </button>
        <button
          type="button"
          onClick={resetFlow}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Ubah data pendaftaran / kirim ulang kode
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegisterSubmit} className="space-y-5">
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      )}

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Nama Lengkap
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-red-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">
          <UserCheck className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            required
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Masukkan Nama Anda"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          ID Karyawan (NIK/NIP)
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-red-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">
          <BadgeCheck className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            required
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Masukkan ID Karyawan"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Pilih Role Akses
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'Admin' | 'Assessor')}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
        >
          <option value="Assessor">Assessor (Penilai Kepatuhan)</option>
          <option value="Admin">Admin (Kelola Sistem & Role)</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Email Kerja Resmi
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-red-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">
          <Mail className="h-4 w-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@telkomhub.co.id"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Domain wajib <span className="font-medium text-red-600">@telkomhub.co.id</span> atau{' '}
          <span className="font-medium text-red-600">@telkom.co.id</span>.
        </p>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Buat kata sandi"
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
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Kekuatan password</span>
            <span className={`font-semibold ${passwordStrength.color}`}>{passwordStrength.label}</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((index) => {
              const active = index <= passwordStrength.score;
              return (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-colors ${
                    active ? strengthBarTone(passwordStrength.score) : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            Minimal 8 karakter, kombinasi huruf besar/kecil, angka, dan karakter khusus.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Konfirmasi Kata Sandi
        </label>
        <div
          className={`flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 focus-within:bg-white focus-within:ring-2 ${
            passwordsMatch
              ? 'border-slate-200 focus-within:border-red-300 focus-within:ring-red-100'
              : 'border-red-300 focus-within:ring-red-100'
          }`}
        >
          <Lock className="h-4 w-4 text-slate-400" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi kata sandi"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="text-slate-400 transition hover:text-slate-600"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {!passwordsMatch && <p className="mt-2 text-[11px] text-red-600">Konfirmasi kata sandi tidak cocok.</p>}
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Verifikasi Keamanan
        </label>
        <SliderCaptcha resetSignal={sliderResetSignal} onVerify={setCaptchaVerified} />
      </div>

      <button
        type="submit"
        disabled={loading || !captchaVerified}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Mengirim OTP...' : (
          <>
            <UserCheck className="h-4 w-4" /> Daftar & Kirim Kode OTP
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500">
        Sudah punya akun?{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-red-600 hover:text-red-700">
          Masuk sekarang
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;
