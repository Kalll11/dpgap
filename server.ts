import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import initSqlJs, { Database } from 'sql.js';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_FILE, buffer);
    } catch (err) {
      console.error('Error saving SQLite database:', err);
    }
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
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

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  // 1. Auth & Users
  app.post('/api/auth/login', rateLimitAuth, (req, res) => {
    const { email, password } = req.body;
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

  app.post('/api/auth/register', rateLimitAuth, (req, res) => {
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

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser: User = {
      id: `u-${Date.now()}`,
      fullname,
      employeeId,
      email,
      role: 'Assessor', // default role
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    usersState.push(newUser);
    persistUsers();

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, fullname: newUser.fullname },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    addAudit(newUser.id, newUser.fullname, 'Registrasi Karyawan', `Karyawan baru terdaftar: ${fullname} (${employeeId})`);
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
