export interface PasswordStrengthResult {
  score: number;
  label: 'Lemah' | 'Sedang' | 'Kuat' | 'Sangat Kuat';
  color: string;
}

/**
 * Validasi kekuatan password di sisi klien. Backend saat ini hanya mewajibkan
 * minimal 6 karakter (lihat backend/server.ts /api/auth/register), tapi untuk
 * platform Data Protection kita dorong standar yang lebih ketat di UI sebagai
 * praktik keamanan yang baik — tanpa mengubah kontrak/validasi backend.
 */
export function validatePasswordStrength(password: string): { ok: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Password wajib berupa string.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return { ok: false, error: 'Password harus mengandung huruf besar dan kecil.' };
  }
  if (!/\d/.test(password)) {
    return { ok: false, error: 'Password harus mengandung angka.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { ok: false, error: 'Password harus mengandung karakter khusus.' };
  }
  return { ok: true };
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: 'Lemah', color: 'text-slate-400' };
  }
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;

  if (score <= 1) return { score, label: 'Lemah', color: 'text-red-400' };
  if (score <= 3) return { score, label: 'Sedang', color: 'text-amber-400' };
  if (score <= 4) return { score, label: 'Kuat', color: 'text-emerald-400' };
  return { score, label: 'Sangat Kuat', color: 'text-green-400' };
}
