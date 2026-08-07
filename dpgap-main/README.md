# DPGAP — Data Protection Gap Assessment Platform

Aplikasi web internal **Telkom Hub · Data Protection Division** untuk melakukan
*self-assessment* kesenjangan (gap) kepatuhan **UU PDP No. 27/2022**, mengelola
rencana perbaikan (action plan), dan memantau progres kepatuhan lintas unit
secara terpusat dan dapat diaudit.

> Dibangun sebagai output Kerja Praktik (KP) — Institut Teknologi Sumatera (ITERA)
> di Telkom Hub, Data Protection Division.

---

## Daftar Isi

1. [Ringkasan Fitur](#ringkasan-fitur)
2. [Tumpukan Teknologi](#tumpukan-teknologi)
3. [Struktur Proyek](#struktur-proyek)
4. [Cara Menjalankan (Development)](#cara-menjalankan-development)
5. [Konfigurasi Environment Variable](#konfigurasi-environment-variable)
6. [Akun & Role](#akun--role)
7. [Alur Autentikasi](#alur-autentikasi)
8. [Ringkasan API Backend](#ringkasan-api-backend)
9. [Logika Skoring & Kepatuhan](#logika-skoring--kepatuhan)
10. [Ekspor Data](#ekspor-data)
11. [Known Limitations & Roadmap Sebelum Produksi](#known-limitations--roadmap-sebelum-produksi)

---

## Ringkasan Fitur

Menu utama aplikasi (sidebar) setelah login:

| Menu | Deskripsi |
|---|---|
| **Dashboard Ringkasan** | KPI kepatuhan, tingkat risiko gap, fokus perbaikan prioritas, progres action plan, radar chart & tren snapshot. |
| **Checklist Workspace** | Pengisian assessment per kriteria (40 kriteria standar): current level, target level, evidence, justifikasi. |
| **Gap Matrix Prioritas** | Visualisasi gap per domain/stage dalam bentuk bar chart untuk menentukan prioritas remediasi. |
| **Action Plan Perbaikan** | Checklist tugas remediasi per kriteria; *Current Level* terkunci sampai checklist action plan 100% selesai (mencegah "self-graded" tanpa bukti kerja). |
| **Audit Log System** *(khusus Admin)* | Riwayat aktivitas seluruh user (login, ubah role, ubah data assessment, dsb). |
| **Pengaturan** | Retention audit log, manajemen role user (Admin), dark mode. |

Assessment mencakup **40+ kriteria** pada **13 fokus area** kepatuhan, sepanjang
**6 tahap siklus hidup data** (Collection → Storage → Use/Processing → Sharing →
Retention → Disposal), dipetakan ke referensi UU PDP, NIST Privacy Framework,
dan Privacy by Design.

---

## Tumpukan Teknologi

**Frontend**
- React 19 + TypeScript, Vite
- Tailwind CSS v4
- `motion` (Framer Motion) — animasi UI
- Recharts — visualisasi data (radar, bar, pie, line chart)
- `xlsx`, `jspdf` + `jspdf-autotable` — ekspor Excel & PDF

**Backend**
- Express.js + TypeScript (`ts-node-dev` untuk development)
- `sql.js` — SQLite yang jalan di memory & di-*persist* ke file `dpgap_db.sqlite`
- `jsonwebtoken` — sesi login (JWT, 24 jam)
- `bcryptjs` — hashing password
- AES-256-CBC (Node `crypto`) — enkripsi data sensitif di database
- `nodemailer` — pengiriman kode OTP registrasi via email (fallback ke log
  server kalau kredensial email belum diset)

**Shared**
- `shared/types.ts` & `shared/data/initialData.ts` — tipe data dan seed data
  (user, domain, template 40 kriteria) yang dipakai bareng oleh frontend &
  backend.

---

## Struktur Proyek

```
dpgap-main/
├── backend/
│   ├── server.ts            # Semua route Express + logika bisnis
│   ├── dpgap_db.sqlite       # File database (auto-generated, ter-persist)
│   └── .env.example          # Contoh konfigurasi environment
├── frontend/
│   └── src/
│       ├── App.tsx           # Root component, routing internal & state global
│       ├── pages/            # Dashboard, Workspace, GapMatrix, Recommendations,
│       │                     # AuditLog, Settings, Auth, Login, Register
│       ├── components/
│       │   ├── auth/         # LoginForm, RegisterForm, SliderCaptcha
│       │   ├── Sidebar.tsx, Header.tsx, ModalCriterion.tsx, Toast.tsx
│       ├── utils/             # scoring.ts, exporter.ts, importer.ts, authValidation.ts
│       └── api/apiClient.ts  # Wrapper fetch ke backend
├── shared/
│   ├── types.ts               # Role, Criterion, Assessment, User, dll.
│   └── data/initialData.ts    # Seed users, seed domains, template 40 kriteria
└── package.json               # Script `dev` menjalankan backend+frontend bareng
```

---

## Cara Menjalankan (Development)

**Prasyarat:** Node.js 18+ dan npm.

```bash
# 1. Clone / extract project, lalu install semua dependency (root + backend + frontend)
npm run install:all

# 2. (Opsional tapi disarankan) siapkan .env backend
cp backend/.env.example backend/.env
# isi JWT_SECRET, SEED_ADMIN_PASSWORD, SEED_ASSESSOR_PASSWORD sesuai kebutuhan

# 3. Jalankan backend + frontend sekaligus (dari root folder)
npm run dev
```

Backend jalan di `http://localhost:3001`, frontend (Vite) di `http://localhost:5173`
(port default Vite — cek terminal untuk port aktual).

Kalau mau jalankan terpisah:

```bash
# Backend saja
cd backend && npm run dev

# Frontend saja
cd frontend && npm run dev
```

Build production:

```bash
cd backend && npm run build && npm start
cd frontend && npm run build   # hasil ada di frontend/dist
```

---

## Konfigurasi Environment Variable

Semua env variable backend didefinisikan di `backend/.env` (lihat
`backend/.env.example`):

| Variable | Wajib? | Keterangan |
|---|---|---|
| `JWT_SECRET` | Disarankan | Kunci penandatanganan token sesi. Kalau kosong, server generate secret acak setiap restart (artinya semua sesi lama otomatis invalid setiap restart). |
| `SEED_ADMIN_PASSWORD` | Opsional | Password awal akun `admin@telkomhub.co.id`. Kalau kosong, server generate password **acak** dan menampilkannya di log server saat start. |
| `SEED_ASSESSOR_PASSWORD` | Opsional | Password awal akun `assessor@telkomhub.co.id`. Sama seperti di atas. |
| `SEED_DEMO_PASSWORD` | Opsional | Password akun dummy/demo `demo@telkomhub.co.id`. Kalau kosong, fallback ke **`Demo@12345` (tetap, bukan acak)** — supaya tombol "Masuk Cepat sebagai Demo" di halaman login selalu bisa dipakai tanpa perlu cek log server. |
| `EMAIL_USER` / `EMAIL_PASS` | Opsional | Kredensial Gmail untuk mengirim OTP registrasi beneran. Kalau kosong, OTP tetap dibuat tapi cuma ditampilkan di log server (mode development). |
| `ENCRYPTION_KEY` | Opsional | Kunci AES-256 untuk enkripsi data sensitif di database. Kalau kosong, server generate acak setiap restart — **wajib diisi tetap sebelum produksi**, kalau tidak data lama jadi tidak bisa didekripsi setelah restart. |

---

## Akun & Role

Role di sistem cuma dua: **`Admin`** dan **`Assessor`**. Tidak ada role lain.

| Akun | Email | Role | Password |
|---|---|---|---|
| Admin (DPO) | `admin@telkomhub.co.id` | Admin | Dari `SEED_ADMIN_PASSWORD`, atau acak (cek log server) |
| Senior Assessor | `assessor@telkomhub.co.id` | Assessor | Dari `SEED_ASSESSOR_PASSWORD`, atau acak (cek log server) |
| **Akun Demo/Percobaan** | `demo@telkomhub.co.id` | Assessor | `Demo@12345` (default, atau dari `SEED_DEMO_PASSWORD`) |

**Aturan penting soal role:**

- **Registrasi mandiri (self-register) lewat halaman publik SELALU menghasilkan
  role `Assessor`.** Form registrasi tidak lagi menampilkan pilihan role — dan
  backend (`POST /api/auth/register`) mengabaikan/mengunci field `role` dari
  body request, apa pun yang dikirim, supaya tidak bisa diakali dari luar form.
- Akun **Admin** hanya bisa dibuat dengan cara **promosi role** oleh Admin yang
  sudah ada, lewat menu **Pengaturan → Kelola User** (`PATCH /api/users/:id/role`,
  butuh role Admin).
- **Akun demo** (`demo@telkomhub.co.id`) sengaja disediakan sebagai jalan pintas
  untuk langsung mencoba menu utama tanpa harus registrasi + verifikasi OTP.
  Di halaman login ada tombol **"Masuk Cepat sebagai Demo (Assessor)"** yang
  langsung login pakai akun ini. Role-nya selalu Assessor, kredensialnya
  publik/diketahui semua orang yang pegang source code ini — **jangan
  dipakai/diaktifkan di environment produksi**, hapus dari seed data atau
  nonaktifkan sebelum deploy.

---

## Alur Autentikasi

1. **Login** — email + password + slider captcha (verifikasi gestur manusia,
   bukan reCAPTCHA sungguhan) → dapat JWT (berlaku 24 jam), disimpan di
   `localStorage`.
2. **Register** — isi data diri (role otomatis Assessor) → sistem kirim OTP 6
   digit ke email (atau tampil di log server kalau `EMAIL_USER`/`EMAIL_PASS`
   belum diset) → verifikasi OTP → akun aktif & langsung login.
3. **Demo Login** — tombol khusus di halaman login yang langsung memanggil
   endpoint login dengan kredensial akun demo, tanpa perlu isi slider captcha
   manual (murni jalan pintas UX, bukan celah keamanan — kredensial akun demo
   memang publik).
4. Domain email yang diizinkan untuk registrasi: `@telkomhub.co.id` dan
   `@telkom.co.id`.

---

## Ringkasan API Backend

Semua endpoint (kecuali auth) butuh header `Authorization: Bearer <token>`.

**Auth**
- `POST /api/auth/login`
- `POST /api/auth/register` — role selalu dipaksa `Assessor`
- `POST /api/auth/verify-otp`
- `GET  /api/auth/me`

**User Management** *(butuh role Admin untuk aksi tulis)*
- `GET   /api/users`
- `PATCH /api/users/:id/role`
- `POST  /api/users/reset-roles`

**Assessment**
- `GET    /api/assessments`
- `POST   /api/assessments`
- `GET    /api/assessments/:id`
- `PUT    /api/assessments/:id`
- `DELETE /api/assessments/:id`
- `POST   /api/assessments/:id/criteria`
- `PUT    /api/criteria/:id`
- `DELETE /api/criteria/:id`
- `POST   /api/assessments/:id/snapshots`

**Konfigurasi Sistem**
- `GET/PUT /api/foundational-domains`
- `GET     /api/settings`
- `GET     /api/settings/impact-weights`
- `PUT     /api/settings` *(Admin)*
- `PUT     /api/settings/impact-weights` *(Admin)*

**Audit Log** *(Admin)*
- `GET    /api/audit-logs`
- `DELETE /api/audit-logs`

---

## Logika Skoring & Kepatuhan

- Sumber kebenaran tunggal untuk status "kriteria terpenuhi" ada di fungsi
  `isCriterionMet()` (`frontend/src/utils/scoring.ts`) — kriteria dianggap
  terpenuhi kalau `currentLevel >= targetLevel` **dan** `targetLevel > 0`.
- **Progres Action Plan (checklist remediasi) TIDAK ikut menentukan skor
  kepatuhan.** Skor kepatuhan murni dari perbandingan `currentLevel` vs
  `targetLevel` per kriteria.
- **`Current Level` sebuah kriteria terkunci (tidak bisa diedit langsung)**
  sampai checklist Action Plan kriteria tersebut selesai 100% — ini mencegah
  assessor menaikkan level kepatuhan tanpa bukti kerja remediasi yang selesai.
- Checklist Action Plan **selalu mulai dalam kondisi belum tercentang** setiap
  kali kriteria/assessment baru dibuat.

---

## Ekspor Data

- **Excel** — mengikuti template resmi perusahaan (`utils/exporter.ts`),
  termasuk seluruh kolom kriteria, evidence, dan action plan.
- **PDF** — laporan ringkas untuk assessment maupun audit log
  (`jspdf` + `jspdf-autotable`).

---

## Known Limitations & Roadmap Sebelum Produksi

Aplikasi ini dibuat untuk keperluan Kerja Praktik/demo internal. Sebelum
dipakai di environment produksi sungguhan, prioritaskan:

1. **Ganti seed password** — jangan andalkan password acak yang cuma tampil di
   log, dan **hapus/nonaktifkan akun demo** (`demo@telkomhub.co.id`).
2. **Normalisasi kolom JSON** di database (saat ini beberapa data disimpan
   sebagai JSON blob di kolom SQLite, sebaiknya dinormalisasi ke tabel relasi
   yang proper).
3. **Token revocation** — saat ini JWT tidak bisa di-*invalidate* sebelum
   expired (mis. saat logout paksa/reset password), perlu mekanisme blacklist
   atau refresh-token.
4. **Input validation** yang lebih ketat di semua endpoint tulis (saat ini
   sebagian validasi baru sebatas required-field check).
5. Set `JWT_SECRET` dan `ENCRYPTION_KEY` secara tetap (fixed) di environment
   produksi — jangan biarkan ter-generate acak setiap restart.
6. Konfigurasi `EMAIL_USER`/`EMAIL_PASS` yang valid supaya OTP registrasi
   benar-benar terkirim ke email, bukan cuma tampil di log server.

---

*Dokumen ini dibuat sebagai dokumentasi teknis internal DPGAP — Telkom Hub,
Data Protection Division.*
