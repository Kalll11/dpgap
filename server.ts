import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import initSqlJs, { Database } from 'sql.js';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import {
  INITIAL_USERS,
  INITIAL_DOMAINS,
  DEFAULT_TEMPLATE_40_CRITERIA,
  INITIAL_AUDIT_LOGS,
  createInitialAssessments,
} from './src/data/initialData.js';
import { Assessment, User, AuditLog, Criterion, Snapshot, Role } from './src/types.js';

const PORT = 3000;
const ALLOWED_DOMAINS = ['telkomhub.co.id', 'telkom.co.id'];
const DB_FILE = path.join(process.cwd(), 'dpgap_db.sqlite');
const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET belum diset, pakai secret sementara. Set di .env sebelum deploy.');
  return generated;
})();

// ====== Enkripsi Database (AES-256-GCM) ======
// File dpgap_db.sqlite dienkripsi secara utuh di disk. Format file terenkripsi:
// [12 byte MAGIC "DPGAPENCv1__"][12 byte IV][16 byte AuthTag][ciphertext...]
const ENC_MAGIC = Buffer.from('DPGAPENCv1__', 'utf8'); // 12 bytes
const DB_ENCRYPTION_KEY: Buffer = (() => {
  const fromEnv = process.env.DB_ENCRYPTION_KEY;
  if (fromEnv && /^[0-9a-fA-F]{64}$/.test(fromEnv)) {
    return Buffer.from(fromEnv, 'hex');
  }
  const generated = crypto.randomBytes(32);
  console.warn(
    '⚠️ DB_ENCRYPTION_KEY belum diset (atau formatnya salah, harus 64 karakter hex). ' +
      'Memakai kunci enkripsi sementara — data TIDAK BISA dibuka lagi setelah server restart. ' +
      'Generate dengan `openssl rand -hex 32` dan simpan permanen di .env sebelum deploy.'
  );
  return generated;
})();

function encryptDbBuffer(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DB_ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([ENC_MAGIC, iv, authTag, ciphertext]);
}

function decryptDbBuffer(fileBuf: Buffer): Buffer {
  const iv = fileBuf.subarray(12, 24);
  const authTag = fileBuf.subarray(24, 40);
  const ciphertext = fileBuf.subarray(40);
  const decipher = crypto.createDecipheriv('aes-256-gcm', DB_ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function isEncryptedDbFile(fileBuf: Buffer): boolean {
  return fileBuf.length > 40 && fileBuf.subarray(0, 12).equals(ENC_MAGIC);
}

// ====== Email (SMTP via nodemailer) ======
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const mailTransporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

if (!SMTP_CONFIGURED) {
  console.warn(
    '⚠️ SMTP belum dikonfigurasi (SMTP_HOST/SMTP_USER/SMTP_PASS kosong). ' +
      'Email (OTP & notifikasi) tidak akan benar-benar terkirim — kode OTP akan ditampilkan di log server sebagai gantinya.'
  );
}

async function sendEmail(to: string, subject: string, html: string, fallbackLogLabel: string): Promise<boolean> {
  if (!mailTransporter) {
    console.warn(`✉️  [EMAIL TIDAK DIKIRIM - SMTP belum diset] Tujuan: ${to} | ${fallbackLogLabel}`);
    return false;
  }
  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'DPGAP Telkom Hub <no-reply@telkomhub.co.id>',
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`✉️  Gagal mengirim email ke ${to}:`, err);
    return false;
  }
}

let db: Database;

// State in memory synced with SQLite
let usersState: User[] = [];
let assessmentsState: Assessment[] = [];
let auditLogsState: AuditLog[] = [];
let auditRetentionMonths = 6;
let foundationalDomainsState: string[] = [
  'Legal Basis Processing',
  'Access Control',
  'Encryption',
  'Incident Response',
];

// Extended Request with Auth User
interface AuthRequest extends express.Request {
  user?: User;
}

// Default passwords map for initial seed users
function resolveSeedPassword(envVar: string, email: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;
  const generated = crypto.randomBytes(6).toString('base64url');
  console.warn(`⚠️ ${envVar} belum diset — password sementara ${email}: ${generated}`);
  return generated;
}
const DEFAULT_PASSWORDS: Record<string, string> = {
  'admin@telkomhub.co.id': resolveSeedPassword('SEED_ADMIN_PASSWORD', 'admin@telkomhub.co.id'),
  'assessor@telkomhub.co.id': resolveSeedPassword('SEED_ASSESSOR_PASSWORD', 'assessor@telkomhub.co.id'),
};

function sanitizeUser(u: User): User {
  const { passwordHash, ...rest } = u;
  return rest as User;
}

function saveDatabase() {
  if (db) {
    try {
      const data = db.export();
      const plainBuffer = Buffer.from(data);
      const encryptedBuffer = encryptDbBuffer(plainBuffer);
      fs.writeFileSync(DB_FILE, encryptedBuffer);
    } catch (err) {
      console.error('Error saving SQLite database:', err);
    }
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    if (isEncryptedDbFile(fileBuffer)) {
      try {
        const plainBuffer = decryptDbBuffer(fileBuffer);
        db = new SQL.Database(plainBuffer);
      } catch (err) {
        throw new Error(
          '❌ Gagal mendekripsi dpgap_db.sqlite. DB_ENCRYPTION_KEY di .env tidak cocok dengan kunci yang ' +
            'dipakai saat data ini disimpan. Pastikan DB_ENCRYPTION_KEY sama persis dengan sebelumnya.'
        );
      }
    } else {
      // File lama belum terenkripsi (migrasi dari versi sebelumnya) — muat apa adanya,
      // lalu akan otomatis dienkripsi pada penyimpanan (saveDatabase) berikutnya.
      console.warn('⚠️ dpgap_db.sqlite belum terenkripsi, akan dienkripsi otomatis (AES-256-GCM) pada penyimpanan berikutnya.');
      db = new SQL.Database(fileBuffer);
    }
  } else {
    db = new SQL.Database();
  }

  // Schema creation
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullname TEXT,
      employee_id TEXT,
      email TEXT UNIQUE,
      role TEXT,
      created_at TEXT,
      password_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      template_type TEXT,
      status TEXT,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      criteria_json TEXT,
      snapshots_json TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT,
      detail TEXT,
      timestamp TEXT
    );
  `);

  // Migrate users table if password_hash column is missing from previous versions
  try {
    db.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
  } catch (_e) {
    // Column already exists
  }

  // Load or Seed Users
  const resUsers = db.exec('SELECT * FROM users');
  if (resUsers.length > 0 && resUsers[0].values.length > 0) {
    usersState = resUsers[0].values.map((row: any) => ({
      id: row[0],
      fullname: row[1],
      employeeId: row[2],
      email: row[3],
      role: row[4],
      createdAt: row[5],
      passwordHash: row[6] || bcrypt.hashSync(DEFAULT_PASSWORDS[row[3]] || 'telkom123', 10),
    }));
  } else {
    usersState = INITIAL_USERS.map((u) => ({
      ...u,
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORDS[u.email] || 'telkom123', 10),
    }));
    persistUsers();
  }

  // Load or Seed Assessments
  const resAssess = db.exec('SELECT * FROM assessments ORDER BY updated_at DESC');
  if (resAssess.length > 0 && resAssess[0].values.length > 0) {
    assessmentsState = resAssess[0].values.map((row: any) => ({
      id: row[0],
      name: row[1],
      description: row[2],
      templateType: row[3],
      status: row[4],
      createdBy: row[5],
      createdAt: row[6],
      updatedAt: row[7],
      criteria: JSON.parse(row[8] || '[]'),
      snapshots: JSON.parse(row[9] || '[]'),
    }));
  } else {
    assessmentsState = createInitialAssessments();
    persistAssessments();
  }

  // Load or Seed Settings
  const resSettings = db.exec('SELECT value_json FROM settings WHERE key = "audit_retention"');
  if (resSettings.length > 0 && resSettings[0].values.length > 0) {
    try {
      auditRetentionMonths = JSON.parse(resSettings[0].values[0][0] as string);
    } catch (_) {}
  } else {
    db.run('INSERT OR REPLACE INTO settings VALUES (?, ?)', ['audit_retention', JSON.stringify(auditRetentionMonths)]);
  }

  const resFoundational = db.exec('SELECT value_json FROM settings WHERE key = "foundational_domains"');
  if (resFoundational.length > 0 && resFoundational[0].values.length > 0) {
    try {
      const parsed = JSON.parse(resFoundational[0].values[0][0] as string);
      if (Array.isArray(parsed)) foundationalDomainsState = parsed;
    } catch (_) {}
  } else {
    db.run('INSERT OR REPLACE INTO settings VALUES (?, ?)', ['foundational_domains', JSON.stringify(foundationalDomainsState)]);
  }

  // Load or Seed Audit Logs
  const resLogs = db.exec('SELECT * FROM audit_logs ORDER BY timestamp DESC');
  if (resLogs.length > 0 && resLogs[0].values.length > 0) {
    auditLogsState = resLogs[0].values.map((row: any) => ({
      id: row[0],
      userId: row[1],
      userName: row[2],
      action: row[3],
      detail: row[4],
      timestamp: row[5],
    }));
  } else {
    auditLogsState = [...INITIAL_AUDIT_LOGS];
    persistAuditLogs();
  }

  saveDatabase();
}

function persistUsers() {
  db.run('DELETE FROM users');
  const stmt = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)');
  usersState.forEach((u) => stmt.run([u.id, u.fullname, u.employeeId, u.email, u.role, u.createdAt, u.passwordHash || '']));
  stmt.free();
  saveDatabase();
}

function persistAssessments() {
  db.run('DELETE FROM assessments');
  const stmt = db.prepare('INSERT INTO assessments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  assessmentsState.forEach((a) =>
    stmt.run([
      a.id,
      a.name,
      a.description || '',
      a.templateType,
      a.status,
      a.createdBy,
      a.createdAt,
      a.updatedAt,
      JSON.stringify(a.criteria || []),
      JSON.stringify(a.snapshots || []),
    ])
  );
  stmt.free();
  saveDatabase();
}

function persistAuditLogs() {
  db.run('DELETE FROM audit_logs');
  const stmt = db.prepare('INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?)');
  auditLogsState.forEach((l) => stmt.run([l.id, l.userId, l.userName, l.action, l.detail, l.timestamp]));
  stmt.free();
  saveDatabase();
}

function addAudit(userId: string, userName: string, action: string, detail: string) {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    userName,
    action,
    detail,
    timestamp: new Date().toISOString(),
  };
  auditLogsState.unshift(log);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - auditRetentionMonths);
  auditLogsState = auditLogsState.filter((l) => new Date(l.timestamp) >= cutoff);
  persistAuditLogs();
}

// Authentication Middleware
function authenticateToken(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Akses ditolak: Token autentikasi tidak ditemukan. Silakan login.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role };
    const user = usersState.find((u) => u.id === decoded.id);
    if (!user) {
      res.status(401).json({ error: 'Sesi pengguna tidak ditemukan' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.' });
    return;
  }
}

// RBAC Middleware
function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Akses Ditolak: Peran '${req.user?.role || 'Guest'}' tidak memiliki izin untuk tindakan ini. (Diperlukan: ${allowedRoles.join(', ')})`,
      });
      return;
    }
    next();
  };
}

// Rate limiter for Auth endpoints
const authAttemptsMap = new Map<string, { count: number; resetAt: number }>();

function rateLimitAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 20;

  const current = authAttemptsMap.get(ip);
  if (!current || now > current.resetAt) {
    authAttemptsMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= maxAttempts) {
    res.status(429).json({ error: 'Terlalu banyak percobaan akses. Silakan coba lagi dalam 15 menit.' });
    return;
  }

  current.count += 1;
  next();
}

// Helper email validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ====== Registrasi via OTP Email (autentikasi non-robot) ======
interface PendingRegistration {
  fullname: string;
  employeeId: string;
  email: string;
  passwordHash: string;
  otpHash: string;
  attempts: number;
  expiresAt: number;
}
const pendingRegistrations = new Map<string, PendingRegistration>(); // key: email lowercase
const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit
const OTP_MAX_ATTEMPTS = 5;

function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashOtp(code: string, email: string): string {
  return crypto.createHash('sha256').update(`${code}:${email.toLowerCase()}`).digest('hex');
}

// ====== CAPTCHA math sederhana (non-robot check untuk login) ======
interface CaptchaEntry {
  answer: number;
  expiresAt: number;
}
const captchaStore = new Map<string, CaptchaEntry>();
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 menit

function createCaptcha(): { captchaId: string; question: string } {
  const a = crypto.randomInt(1, 10);
  const b = crypto.randomInt(1, 10);
  const useAdd = crypto.randomInt(0, 2) === 0;
  const answer = useAdd ? a + b : a + b + 3; // keep it trivially simple but non-guessable format-wise
  const question = useAdd ? `${a} + ${b}` : `${a} + ${b} + 3`;
  const captchaId = crypto.randomBytes(16).toString('hex');
  captchaStore.set(captchaId, { answer, expiresAt: Date.now() + CAPTCHA_TTL_MS });
  return { captchaId, question: `${question} = ?` };
}

function verifyAndConsumeCaptcha(captchaId: string | undefined, answer: any): { ok: boolean; error?: string } {
  if (!captchaId || answer === undefined || answer === null || answer === '') {
    return { ok: false, error: 'Verifikasi captcha wajib diisi.' };
  }
  const entry = captchaStore.get(captchaId);
  captchaStore.delete(captchaId); // one-time use, regardless of outcome
  if (!entry) {
    return { ok: false, error: 'Captcha tidak valid atau sudah kedaluwarsa. Silakan muat ulang captcha.' };
  }
  if (Date.now() > entry.expiresAt) {
    return { ok: false, error: 'Captcha sudah kedaluwarsa. Silakan muat ulang captcha.' };
  }
  const numericAnswer = typeof answer === 'number' ? answer : parseInt(String(answer), 10);
  if (Number.isNaN(numericAnswer) || numericAnswer !== entry.answer) {
    return { ok: false, error: 'Jawaban captcha salah. Silakan coba lagi.' };
  }
  return { ok: true };
}

// Cleanup periodik untuk entri OTP & captcha yang kedaluwarsa
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingRegistrations) {
    if (now > val.expiresAt) pendingRegistrations.delete(key);
  }
  for (const [key, val] of captchaStore) {
    if (now > val.expiresAt) captchaStore.delete(key);
  }
}, 60 * 1000);

function otpEmailHtml(fullname: string, code: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#4338ca">DPGAP · Telkom Hub</h2>
      <p>Halo <b>${fullname}</b>,</p>
      <p>Gunakan kode verifikasi berikut untuk menyelesaikan pendaftaran akun DPGAP Anda:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#eef2ff;color:#3730a3;padding:12px 16px;border-radius:8px;text-align:center">${code}</p>
      <p>Kode berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai admin.</p>
      <p style="color:#64748b;font-size:12px">Jika Anda tidak merasa melakukan pendaftaran ini, abaikan email ini.</p>
    </div>`;
}

function welcomeEmailHtml(fullname: string, employeeId: string, email: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#4338ca">DPGAP · Telkom Hub</h2>
      <p>Halo <b>${fullname}</b>,</p>
      <p>Pendaftaran akun DPGAP Anda berhasil diverifikasi. Berikut ringkasan akun Anda:</p>
      <ul>
        <li>Nama: ${fullname}</li>
        <li>ID Karyawan: ${employeeId}</li>
        <li>Email: ${email}</li>
        <li>Role awal: Assessor</li>
      </ul>
      <p>Anda sekarang dapat masuk ke platform DPGAP menggunakan email dan password yang telah didaftarkan.</p>
    </div>`;
}

function adminNotifyEmailHtml(fullname: string, employeeId: string, email: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#4338ca">DPGAP · Notifikasi Pendaftaran Karyawan Baru</h2>
      <p>Seorang karyawan baru saja terdaftar di sistem DPGAP:</p>
      <ul>
        <li>Nama: ${fullname}</li>
        <li>ID Karyawan: ${employeeId}</li>
        <li>Email: ${email}</li>
        <li>Role awal: Assessor</li>
      </ul>
    </div>`;
}

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  // 1. Auth & Users

  // Captcha non-robot untuk login
  app.get('/api/auth/captcha', (_req, res) => {
    res.json(createCaptcha());
  });

  app.post('/api/auth/login', rateLimitAuth, (req, res) => {
    const { email, password, captchaId, captchaAnswer } = req.body;

    const captchaCheck = verifyAndConsumeCaptcha(captchaId, captchaAnswer);
    if (!captchaCheck.ok) {
      res.status(400).json({ error: captchaCheck.error });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi' });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Format email tidak valid' });
      return;
    }

    const user = usersState.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ error: 'Email atau password salah' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullname: user.fullname },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    addAudit(user.id, user.fullname, 'Login', `${user.fullname} (${user.role}) berhasil masuk ke sistem`);
    res.json({ user: sanitizeUser(user), token });
  });

  // Langkah 1 pendaftaran: validasi data & kirim kode OTP ke email karyawan
  app.post('/api/auth/register/otp', rateLimitAuth, async (req, res) => {
    const { fullname, employeeId, email, password } = req.body;
    if (!fullname || !employeeId || !email || !password) {
      res.status(400).json({ error: 'Seluruh kolom pendaftaran wajib diisi' });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Format email tidak valid' });
      return;
    }

    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password minimal terdiri dari 6 karakter' });
      return;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      res.status(403).json({
        error: `Registrasi khusus karyawan resmi Telkom Hub dengan domain: @${ALLOWED_DOMAINS.join(', @')}`,
      });
      return;
    }

    if (usersState.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
      return;
    }

    const emailKey = email.toLowerCase();
    const code = generateOtpCode();
    pendingRegistrations.set(emailKey, {
      fullname,
      employeeId,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      otpHash: hashOtp(code, email),
      attempts: 0,
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    const sent = await sendEmail(
      email,
      'Kode Verifikasi Pendaftaran DPGAP',
      otpEmailHtml(fullname, code),
      `Kode OTP registrasi untuk ${email}: ${code}`
    );

    res.status(200).json({
      message: sent
        ? 'Kode verifikasi telah dikirim ke email Anda.'
        : 'Kode verifikasi dibuat, namun email tidak dapat dikirim (SMTP belum dikonfigurasi). Cek log server.',
      emailSent: sent,
      expiresInSeconds: OTP_TTL_MS / 1000,
    });
  });

  // Langkah 2 pendaftaran: verifikasi kode OTP lalu buat akun
  app.post('/api/auth/register', rateLimitAuth, async (req, res) => {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      res.status(400).json({ error: 'Email dan kode verifikasi wajib diisi' });
      return;
    }

    const emailKey = String(email).toLowerCase();
    const pending = pendingRegistrations.get(emailKey);
    if (!pending) {
      res.status(400).json({ error: 'Sesi pendaftaran tidak ditemukan atau sudah kedaluwarsa. Silakan minta kode baru.' });
      return;
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(emailKey);
      res.status(400).json({ error: 'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.' });
      return;
    }

    pending.attempts += 1;
    if (pending.attempts > OTP_MAX_ATTEMPTS) {
      pendingRegistrations.delete(emailKey);
      res.status(429).json({ error: 'Terlalu banyak percobaan kode salah. Silakan minta kode baru.' });
      return;
    }

    if (hashOtp(String(otpCode).trim(), pending.email) !== pending.otpHash) {
      res.status(400).json({ error: `Kode verifikasi salah. Sisa percobaan: ${OTP_MAX_ATTEMPTS - pending.attempts}.` });
      return;
    }

    // Cek ulang duplikasi email (jaga-jaga race condition)
    if (usersState.some((u) => u.email.toLowerCase() === emailKey)) {
      pendingRegistrations.delete(emailKey);
      res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      fullname: pending.fullname,
      employeeId: pending.employeeId,
      email: pending.email,
      role: 'Assessor', // default role
      createdAt: new Date().toISOString(),
      passwordHash: pending.passwordHash,
    };

    usersState.push(newUser);
    persistUsers();
    pendingRegistrations.delete(emailKey);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, fullname: newUser.fullname },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    addAudit(newUser.id, newUser.fullname, 'Registrasi Karyawan', `Karyawan baru terdaftar: ${newUser.fullname} (${newUser.employeeId})`);

    // Notifikasi email (tidak menghalangi response jika gagal terkirim)
    sendEmail(
      newUser.email,
      'Pendaftaran DPGAP Berhasil',
      welcomeEmailHtml(newUser.fullname, newUser.employeeId, newUser.email),
      `Notifikasi selamat datang untuk ${newUser.email}`
    ).catch(() => {});
    if (process.env.NOTIFY_ADMIN_EMAIL) {
      sendEmail(
        process.env.NOTIFY_ADMIN_EMAIL,
        'Notifikasi: Karyawan Baru Mendaftar di DPGAP',
        adminNotifyEmailHtml(newUser.fullname, newUser.employeeId, newUser.email),
        `Notifikasi admin: pendaftaran baru ${newUser.email}`
      ).catch(() => {});
    }

    res.status(201).json({ user: sanitizeUser(newUser), token });
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
    if (req.user) {
      res.json({ user: sanitizeUser(req.user) });
    } else {
      res.status(401).json({ error: 'Tidak diautentikasi' });
    }
  });

  app.get('/api/users', authenticateToken, (req: AuthRequest, res) => {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: 'Tidak diautentikasi' });
      return;
    }

    // Viewer role has been removed — Admin and Assessor have equal standing
    // and both receive complete employee metadata.
    res.json(usersState.map(sanitizeUser));
  });

  app.patch('/api/users/:id/role', authenticateToken, requireRoles('Admin'), (req: AuthRequest, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = usersState.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const VALID_ROLES: Role[] = ['Admin', 'Assessor'];
    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ error: `Role tidak valid. Harus: ${VALID_ROLES.join(', ')}` });
      return;
    }

    // Protection against leaving zero active Admins in the system
    if (user.role === 'Admin' && role !== 'Admin') {
      const remainingAdmins = usersState.filter((u) => u.role === 'Admin' && u.id !== id);
      if (remainingAdmins.length === 0) {
        res.status(400).json({ error: 'Akses ditolak: Sistem harus memiliki minimal 1 Administrator aktif.' });
        return;
      }
    }

    user.role = role;
    persistUsers();
    addAudit(req.user?.id || 'admin', req.user?.fullname || 'Admin', 'Ubah Role User', `Mengubah role ${user.fullname} menjadi ${role}`);
    res.json(sanitizeUser(user));
  });

  app.post('/api/users/reset-roles', authenticateToken, requireRoles('Admin'), (req: AuthRequest, res) => {
    INITIAL_USERS.forEach((initUser) => {
      const existing = usersState.find((u) => u.email === initUser.email || u.id === initUser.id);
      if (existing) {
        existing.role = initUser.role;
      }
    });
    persistUsers();
    addAudit(req.user?.id || 'admin', req.user?.fullname || 'Admin', 'Reset Role User', 'Mereset role seluruh akun default ke konfigurasi awal');
    res.json(usersState.map(sanitizeUser));
  });

  // 2. Assessments
  app.get('/api/assessments', authenticateToken, (_req, res) => {
    res.json(assessmentsState);
  });

  app.post('/api/assessments', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const { name, description, templateType } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nama assessment wajib diisi' });
      return;
    }
    if (assessmentsState.length >= 10) {
      res.status(400).json({ error: 'Maksimal 10 assessment aktif sekaligus' });
      return;
    }

    const isBlank = templateType === 'blank';
    const initialCriteria: Criterion[] = isBlank
      ? []
      : DEFAULT_TEMPLATE_40_CRITERIA.map((item, idx) => ({
          ...item,
          id: `crit-${Date.now()}-${idx + 1}`,
          currentLevel: 0,
          targetLevel: 0,
          actionStatus: 'Not Started',
          actionProgress: 0,
          actionNotes: '',
          evidenceName: '',
          evidenceUrl: '',
        }));

    const newAssessment: Assessment = {
      id: `assess-${Date.now()}`,
      name,
      description: description || '',
      templateType: isBlank ? 'blank' : 'template',
      status: 'In Progress',
      createdBy: req.user ? `${req.user.fullname} (${req.user.role})` : 'DPO Telkom Hub',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      criteria: initialCriteria,
      snapshots: [],
    };

    assessmentsState.unshift(newAssessment);
    persistAssessments();
    addAudit(req.user?.id || 'user', req.user?.fullname || 'User', 'Buat Assessment', `Membuat assessment baru "${name}" (${isBlank ? 'Kosong' : 'Template'})`);
    res.status(201).json(newAssessment);
  });

  app.get('/api/assessments/:id', authenticateToken, (req, res) => {
    const assessment = assessmentsState.find((a) => a.id === req.params.id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment tidak ditemukan' });
      return;
    }
    res.json(assessment);
  });

  app.put('/api/assessments/:id', authenticateToken, requireRoles('Admin', 'Assessor'), (req, res) => {
    const { id } = req.params;
    const index = assessmentsState.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Assessment tidak ditemukan' });
      return;
    }
    assessmentsState[index] = {
      ...assessmentsState[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    persistAssessments();
    res.json(assessmentsState[index]);
  });

  app.delete('/api/assessments/:id', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const { id } = req.params;
    const assessment = assessmentsState.find((a) => a.id === id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment tidak ditemukan' });
      return;
    }
    assessmentsState = assessmentsState.filter((a) => a.id !== id);
    persistAssessments();
    addAudit(req.user?.id || 'user', req.user?.fullname || 'User', 'Hapus Assessment', `Menghapus assessment "${assessment.name}"`);
    res.json({ success: true, id });
  });

  // 3. Criteria CRUD inside Assessment
  app.post('/api/assessments/:id/criteria', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const assessment = assessmentsState.find((a) => a.id === req.params.id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment tidak ditemukan' });
      return;
    }
    const newCriterion: Criterion = {
      ...req.body,
      id: `crit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    assessment.criteria.push(newCriterion);
    assessment.updatedAt = new Date().toISOString();
    persistAssessments();
    addAudit(req.user?.id || 'user', req.user?.fullname || 'User', 'Tambah Kriteria', `[${assessment.name}] Menambahkan: ${newCriterion.checklist.slice(0, 50)}...`);
    res.status(201).json(newCriterion);
  });

  app.put('/api/criteria/:id', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const { id } = req.params;
    let updated: Criterion | null = null;
    let targetAssessmentName = '';

    for (const a of assessmentsState) {
      const idx = a.criteria.findIndex((c) => c.id === id);
      if (idx !== -1) {
        a.criteria[idx] = { ...a.criteria[idx], ...req.body };
        updated = a.criteria[idx];
        a.updatedAt = new Date().toISOString();
        targetAssessmentName = a.name;
        break;
      }
    }

    if (!updated) {
      res.status(404).json({ error: 'Kriteria tidak ditemukan' });
      return;
    }

    persistAssessments();
    addAudit(req.user?.id || 'user', req.user?.fullname || 'User', 'Edit Kriteria', `[${targetAssessmentName}] Perbarui kriteria: ${updated.checklist.slice(0, 50)}...`);
    res.json(updated);
  });

  app.delete('/api/criteria/:id', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const { id } = req.params;
    let deleted = false;
    let targetAssessmentName = '';

    for (const a of assessmentsState) {
      const idx = a.criteria.findIndex((c) => c.id === id);
      if (idx !== -1) {
        a.criteria.splice(idx, 1);
        a.updatedAt = new Date().toISOString();
        targetAssessmentName = a.name;
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      res.status(404).json({ error: 'Kriteria tidak ditemukan' });
      return;
    }

    persistAssessments();
    addAudit(req.user?.id || 'user', req.user?.fullname || 'User', 'Hapus Kriteria', `[${targetAssessmentName}] Menghapus kriteria ID ${id}`);
    res.json({ success: true, id });
  });

  // 4. Snapshots
  app.post('/api/assessments/:id/snapshots', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const assessment = assessmentsState.find((a) => a.id === req.params.id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment tidak ditemukan' });
      return;
    }
    const { avgGap, avgPriorityScore, overallCompliance, riskLevel, note } = req.body;
    const snapshot: Snapshot = {
      id: `snap-${Date.now()}`,
      assessmentId: assessment.id,
      avgGap: avgGap || 0,
      avgPriorityScore: avgPriorityScore || 0,
      overallCompliance: overallCompliance || 0,
      riskLevel: riskLevel || 'Rendah',
      createdAt: new Date().toISOString(),
      note: note || `Snapshot ${assessment.snapshots.length + 1}`,
    };
    assessment.snapshots.push(snapshot);
    persistAssessments();
    addAudit(req.user?.id || 'user', req.user?.fullname || 'User', 'Simpan Snapshot', `[${assessment.name}] Snapshot disimpan — Rata-rata Gap: ${snapshot.avgGap}`);
    res.status(201).json(snapshot);
  });

  // 5. Settings & Foundational Domains
  app.get('/api/foundational-domains', authenticateToken, (_req, res) => {
    res.json({ domains: foundationalDomainsState });
  });

  app.put('/api/foundational-domains', authenticateToken, requireRoles('Admin', 'Assessor'), (req: AuthRequest, res) => {
    const { domains } = req.body;
    if (!Array.isArray(domains) || !domains.every((d) => typeof d === 'string')) {
      res.status(400).json({ error: 'Format data domain fondasional tidak valid. Harus berupa array string.' });
      return;
    }

    foundationalDomainsState = domains;
    db.run('INSERT OR REPLACE INTO settings VALUES (?, ?)', ['foundational_domains', JSON.stringify(foundationalDomainsState)]);
    saveDatabase();

    addAudit(
      req.user?.id || 'user',
      req.user?.fullname || 'User',
      'Ubah Domain Fondasional',
      `Memperbarui daftar domain fondasional (${domains.length} domain aktif)`
    );

    res.json({ domains: foundationalDomainsState });
  });

  app.get('/api/settings', authenticateToken, (_req, res) => {
    res.json({ retentionMonths: auditRetentionMonths });
  });

  app.get('/api/settings/impact-weights', authenticateToken, (_req, res) => {
    res.json({ retentionMonths: auditRetentionMonths });
  });

  app.put('/api/settings', authenticateToken, requireRoles('Admin'), (req: AuthRequest, res) => {
    const { retentionMonths } = req.body;
    if (typeof retentionMonths === 'number') {
      auditRetentionMonths = retentionMonths;
      db.run('INSERT OR REPLACE INTO settings VALUES (?, ?)', ['audit_retention', JSON.stringify(auditRetentionMonths)]);
      saveDatabase();
      addAudit(
        req.user?.id || 'admin',
        req.user?.fullname || 'Admin',
        'Ubah Retensi Audit Log',
        `Masa retensi audit log diperbarui menjadi ${retentionMonths} bulan`
      );
    }
    res.json({ retentionMonths: auditRetentionMonths });
  });

  app.put('/api/settings/impact-weights', authenticateToken, requireRoles('Admin'), (req: AuthRequest, res) => {
    const { retentionMonths } = req.body;
    if (typeof retentionMonths === 'number') {
      auditRetentionMonths = retentionMonths;
      db.run('INSERT OR REPLACE INTO settings VALUES (?, ?)', ['audit_retention', JSON.stringify(auditRetentionMonths)]);
      saveDatabase();
      addAudit(
        req.user?.id || 'admin',
        req.user?.fullname || 'Admin',
        'Ubah Retensi Audit Log',
        `Masa retensi audit log diperbarui menjadi ${retentionMonths} bulan`
      );
    }
    res.json({ retentionMonths: auditRetentionMonths });
  });

  // 6. Audit Logs
  app.get('/api/audit-logs', authenticateToken, requireRoles('Admin'), (_req, res) => {
    res.json({ logs: auditLogsState, retentionMonths: auditRetentionMonths });
  });

  app.delete('/api/audit-logs', authenticateToken, requireRoles('Admin'), (req: AuthRequest, res) => {
    auditLogsState = [];
    addAudit(req.user?.id || 'admin', req.user?.fullname || 'Admin', 'Reset Audit Log', 'Audit log dikosongkan secara manual');
    res.json({ success: true });
  });

  // Vite Middleware in dev, Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DPGAP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
