import React, { useState } from 'react';

export const RegisterPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Assessor' });
  const [otp, setOtp] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Panggil API backend /api/register
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (response.ok) setStep(2); // Pindah ke tahap ketik ulang OTP
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    // Panggil API backend /api/verify-otp
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, otp }),
    });
    if (response.ok) alert('Pendaftaran Berhasil! Silakan Login.');
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Pendaftaran Akun Baru</h2>
      
      {step === 1 ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" placeholder="Nama Lengkap" onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl" required />
          <input type="email" placeholder="Email Telkom" onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border rounded-xl" required />
          <input type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-xl" required />
          
          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border rounded-xl">
            <option value="Assessor">Assessor</option>
            <option value="Admin">Admin</option>
          </select>

          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Daftar & Kirim Kode OTP</button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-xl text-sm">
            Kode OTP telah dikirim ke email <b>{formData.email}</b>. Ketik ulang kode tersebut untuk autentikasi (Non-Robot).
          </div>
          <input type="text" placeholder="Masukkan 6 Digit OTP" value={otp} onChange={e => setOtp(e.target.value)} className="w-full p-3 border rounded-xl text-center text-xl tracking-[0.5em] font-bold" required />
          <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Verifikasi OTP</button>
        </form>
      )}
    </div>
  );
};