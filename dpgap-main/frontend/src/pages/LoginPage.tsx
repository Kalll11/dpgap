// Lokasi: src/pages/LoginPage.tsx
import React, { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return alert('Silakan selesaikan Captcha terlebih dahulu!');

    // Panggil API Backend /api/login, kirimkan juga captchaToken
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    // Lanjut proses login...
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Login Sistem DPGAP</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl" required />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl" required />
        
        {/* Widget Google reCAPTCHA v2 */}
        <div className="flex justify-center my-4">
          <ReCAPTCHA
            sitekey="LETAKKAN_SITE_KEY_GOOGLE_ANDA_DISINI"
            onChange={(token) => setCaptchaToken(token)}
          />
        </div>

        <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Masuk</button>
      </form>
    </div>
  );
};