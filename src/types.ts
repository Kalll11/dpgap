export type Role = 'Admin' | 'Assessor';

export type LifecycleStage =
  | 'Collection'
  | 'Storage'
  | 'Use / Processing'
  | 'Sharing'
  | 'Retention'
  | 'Disposal'
  | 'Seluruh Tahap';

export type FocusArea =
  | 'Dasar Pemrosesan Data Pribadi'
  | 'Pengendalian Akses Data Pribadi'
  | 'Akurasi, Keamanan dan Kerahasiaan Data Pribadi'
  | 'Pengendalian Pemrosesan Data Pribadi'
  | 'Pengawasan Pelindungan Data Pribadi'
  | 'Kerangka Kerja PIMS ISO 27701'
  | 'Pengelolaan Persetujuan & Notifikasi Privasi'
  | 'Privacy by Design & Pseudonymization'
  | 'Siklus Hidup & Retensi Data'
  | 'Pengendalian Akses IT Telkom'
  | 'Kriptografi & Manajemen Kunci'
  | 'Monitoring & SIEM Alerting'
  | 'Budaya Keamanan & Privasi'
  | (string & {});

export type ActionStatus = 'Not Started' | 'On Progress' | 'Under Review' | 'Completed';

export interface User {
  id: string;
  fullname: string;
  employeeId: string;
  email: string;
  role: Role;
  createdAt: string;
  passwordHash?: string;
}

export interface Criterion {
  id: string;
  stage: LifecycleStage;
  domain: string;
  focusArea: FocusArea;
  pic: string;
  checklist: string;
  dimensi?: string; // Process, Technology, People
  activity?: string; // Activity description from PDF
  evidence?: string; // Evidence document required
  targetLevel: number; // 1 to 5
  currentLevel: number; // 1 to 5
  justification?: string;
  riskIfFailed?: string;
  evidenceUrl?: string;
  evidenceName?: string;
  uuPdpRef?: string;
  nistRef?: string;
  pbdRef?: string;
  iappLevelName?: string;
  actionPic?: string;
  actionDeadline?: string;
  actionStatus?: ActionStatus;
  actionProgress?: number; // 0 to 100
  actionNotes?: string;
  actionChecklist?: { id: string; label: string; completed: boolean }[];
}

export interface Snapshot {
  id: string;
  assessmentId: string;
  avgGap: number;
  avgPriorityScore: number;
  overallCompliance: number;
  riskLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';
  createdAt: string;
  note?: string;
}

export interface Assessment {
  id: string;
  name: string;
  description?: string;
  templateType: 'template' | 'blank';
  status: 'Draft' | 'In Progress' | 'Under Review' | 'Completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  criteria: Criterion[];
  snapshots: Snapshot[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
  timestamp: string;
}
