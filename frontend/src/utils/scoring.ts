import { Criterion } from '../../../shared/types';
import { fetchFoundationalDomainsApi, updateFoundationalDomainsApi } from '../api/apiClient';

export const MAX_GAP = 4;

/**
 * 4 Domain Fondasional (Flag Biner):
 * Secara hukum/struktural tidak bisa ditunda meski skor Gap-nya kecil.
 */
export const DEFAULT_FOUNDATIONAL_DOMAINS = [
  'Legal Basis Processing',
  'Access Control',
  'Encryption',
  'Incident Response',
];

export const FOUNDATIONAL_DOMAINS = DEFAULT_FOUNDATIONAL_DOMAINS;

// In-memory cache synced with server DB
let foundationalDomainsCache: string[] = DEFAULT_FOUNDATIONAL_DOMAINS;

/**
 * Synchronizes active foundational domains from server API
 */
export async function syncFoundationalDomainsFromServer(): Promise<string[]> {
  try {
    const serverDomains = await fetchFoundationalDomainsApi();
    if (Array.isArray(serverDomains)) {
      foundationalDomainsCache = serverDomains;
      try {
        localStorage.setItem('dpgap_foundational_domains', JSON.stringify(serverDomains));
      } catch (_) {}
      window.dispatchEvent(new Event('dpgap_foundational_changed'));
    }
  } catch (e) {
    console.error('Error syncing foundational domains from server:', e);
    // Fallback to local storage if offline or not logged in yet
    try {
      const saved = localStorage.getItem('dpgap_foundational_domains');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) foundationalDomainsCache = parsed;
      }
    } catch (_) {}
  }
  return foundationalDomainsCache;
}

/**
 * Gets active foundational domains array from memory cache
 */
export function getFoundationalDomains(): string[] {
  return foundationalDomainsCache;
}

/**
 * Saves active foundational domains array to server DB with RBAC enforcement
 */
export async function setFoundationalDomains(domains: string[]): Promise<string[]> {
  try {
    const updated = await updateFoundationalDomainsApi(domains);
    foundationalDomainsCache = updated;
    try {
      localStorage.setItem('dpgap_foundational_domains', JSON.stringify(updated));
    } catch (_) {}
    window.dispatchEvent(new Event('dpgap_foundational_changed'));
    return updated;
  } catch (e) {
    console.error('Error saving foundational domains to server:', e);
    throw e;
  }
}

export const FOUNDATIONAL_DOMAIN_JUSTIFICATIONS: Record<string, string> = {
  'Legal Basis Processing':
    'Tanpa dasar pemrosesan yang sah, SELURUH aktivitas pemrosesan data jadi tidak sah secara hukum — bukan satu kontrol, tapi fondasi legalitas semuanya.',
  'Access Control':
    'Kontrol preventif inti terhadap akses tidak sah — kegagalannya membuka jalan langsung ke pelanggaran data.',
  'Encryption':
    'Sama seperti Access Control — eksplisit disebut UU PDP Ps. 39 & GDPR Art. 32(1)(a) sebagai langkah keamanan wajib.',
  'Incident Response':
    'Terikat tenggat hukum eksplisit (UU PDP Ps. 46: 3×24 jam / GDPR Art. 33-34: 72 jam) dengan sanksi administratif langsung.',
  'Governance':
    'Struktur tata kelola dan penunjukan DPO menjamin akuntabilitas pengawasan dan penanganan kepatuhan secara menyeluruh.',
  'Classification':
    'Pengelompokan dan inventarisasi tingkat sensitivitas data menentukan tingkat perlindungan teknis yang tepat.',
  'Tokenization':
    'Pseudonimisasi dan tokenisasi data sensitif mengurangi risiko langsung paparan data mentah.',
  'Audit Logging':
    'Rekam jejak dan pembuatan log audit wajib untuk akuntabilitas dan pemenuhan prinsip transparansi.',
  'Monitoring & Oversight':
    'Pemantauan berkelanjutan memastikan deteksi dini anomali dan celah keamanan.',
  'Data Masking':
    'Penyembunyian tampilan data melindungi kerahasiaan saat pengujian dan operasional harian.',
  'Retention Policy':
    'Batas waktu penyimpanan mencegah retensi berlebihan yang melanggar prinsip minimisasi data.',
  'Awareness & Training':
    'Pelatihan karyawan meminimalisir risiko human-error yang menjadi sumber utama kebocoran data.',
  'Data Subject Rights':
    'Pemenuhan hak subjek data (akses, koreksi, penghapusan) wajib secara hukum.',
  'Vendor Risk':
    'Pengawasan pihak ketiga menjamin kerahasiaan data yang diproses oleh mitra luar.',
};

/**
 * Checks if a domain string matches one of the active Foundational Domains
 */
export function isFoundationalDomain(domain?: string): boolean {
  if (!domain) return false;
  const list = getFoundationalDomains();
  const normalized = domain.trim().toLowerCase();
  return list.some((fd) => fd.toLowerCase() === normalized);
}

/**
 * Gets the justification for a foundational domain if applicable
 */
export function getFoundationalJustification(domain?: string): string | null {
  if (!domain) return null;
  const matchKeys = Object.keys(FOUNDATIONAL_DOMAIN_JUSTIFICATIONS);
  const matched = matchKeys.find(
    (k) => k.toLowerCase() === domain.trim().toLowerCase()
  );
  if (matched) return FOUNDATIONAL_DOMAIN_JUSTIFICATIONS[matched];
  return `Domain ${domain} ditetapkan sebagai fondasional oleh organisasi karena memiliki dampak struktural & hukum yang krusial.`;
}

export interface PriorityCategory {
  label: 'Selesai' | 'Minor' | 'Sedang' | 'Tinggi' | 'Kritis';
  color: string;
  badgeBg: string;
  badgeText: string;
}

export interface RiskLevelInfo {
  label: 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';
  color: string;
  badgeBg: string;
  badgeText: string;
  avgPriorityScore: number;
}

/**
 * Calculates the Priority Score (0 - 100%) based purely on Gap (Target - Current)
 * Formula: (Gap / 4) * 100%
 * - Gap 4 (e.g. Target 5, Current 1) = 100% (Kritis / High Urgency)
 * - Gap 3 (e.g. Target 5, Current 2) = 75% (Tinggi)
 * - Gap 2 (e.g. Target 5, Current 3) = 50% (Sedang)
 * - Gap 1 (e.g. Target 5, Current 4) = 25% (Minor)
 * - Gap 0 (Target <= Current) = 0% (Selesai)
 */
export function calculatePriorityScore(target: number, current: number): number {
  if (!target || target <= 0) return 0;
  const curr = current || 0;
  const gap = Math.max(0, target - curr);
  if (gap <= 0) return 0;
  return Math.round((gap / MAX_GAP) * 100);
}

/**
 * Gets the priority category for a given priority score (clean 1-term per level)
 */
export function getPriorityCategory(score: number): PriorityCategory {
  if (score <= 0) {
    return {
      label: 'Selesai',
      color: '#10B981',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
    };
  }
  if (score <= 25) {
    return {
      label: 'Minor',
      color: '#059669',
      badgeBg: 'bg-green-100 dark:bg-green-950/60',
      badgeText: 'text-green-800 dark:text-green-300',
    };
  }
  if (score <= 50) {
    return {
      label: 'Sedang',
      color: '#D97706',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
    };
  }
  if (score <= 75) {
    return {
      label: 'Tinggi',
      color: '#EA580C',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
      badgeText: 'text-orange-800 dark:text-orange-300',
    };
  }
  return {
    label: 'Kritis',
    color: '#DC2626',
    badgeBg: 'bg-red-100 dark:bg-red-950/60',
    badgeText: 'text-red-800 dark:text-red-300',
  };
}

/**
 * Priority sorting comparator:
 * 1. Items with gap > 0 in Foundational domains are pinned FIRST at the top
 * 2. Secondary sort by Priority Score descending (100% -> 75% -> 50% -> 25% -> 0%)
 * 3. Tertiary sort by raw gap descending
 */
export function compareCriteriaPriority(a: Criterion, b: Criterion): number {
  const gapA = Math.max(0, a.targetLevel - a.currentLevel);
  const gapB = Math.max(0, b.targetLevel - b.currentLevel);
  const scoreA = calculatePriorityScore(a.targetLevel, a.currentLevel);
  const scoreB = calculatePriorityScore(b.targetLevel, b.currentLevel);

  const isFoundA = isFoundationalDomain(a.domain) && gapA > 0;
  const isFoundB = isFoundationalDomain(b.domain) && gapB > 0;

  if (isFoundA && !isFoundB) return -1;
  if (!isFoundA && isFoundB) return 1;

  if (scoreB !== scoreA) return scoreB - scoreA;
  if (gapB !== gapA) return gapB - gapA;

  return (a.checklist || '').localeCompare(b.checklist || '');
}

/**
 * Sorts criteria array by priority (Foundational pinned first, then Priority Score desc)
 */
export function sortCriteriaByPriority(criteria: Criterion[]): Criterion[] {
  return [...criteria].sort(compareCriteriaPriority);
}

/**
 * Calculates overall risk rating for an assessment
 */
export function calculateOverallRisk(criteria: Criterion[]): RiskLevelInfo {
  if (!criteria || criteria.length === 0) {
    return {
      label: 'Rendah',
      color: '#10B981',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-600 dark:text-slate-300',
      avgPriorityScore: 0,
    };
  }

  const scores = criteria.map((c) =>
    calculatePriorityScore(c.targetLevel, c.currentLevel)
  );
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg <= 15) {
    return {
      label: 'Rendah',
      color: '#10B981',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      avgPriorityScore: Math.round(avg * 10) / 10,
    };
  }
  if (avg <= 35) {
    return {
      label: 'Sedang',
      color: '#D97706',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
      avgPriorityScore: Math.round(avg * 10) / 10,
    };
  }
  if (avg <= 60) {
    return {
      label: 'Tinggi',
      color: '#EA580C',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
      badgeText: 'text-orange-800 dark:text-orange-300',
      avgPriorityScore: Math.round(avg * 10) / 10,
    };
  }
  return {
    label: 'Kritis',
    color: '#DC2626',
    badgeBg: 'bg-red-100 dark:bg-red-950/60',
    badgeText: 'text-red-800 dark:text-red-300',
    avgPriorityScore: Math.round(avg * 10) / 10,
  };
}

/**
 * Calculates overall compliance percentage (0 - 100%)
 */
export function calculateOverallCompliance(criteria: Criterion[]): number {
  if (!criteria || criteria.length === 0) return 0;

  // Memfilter kriteria yang targetnya terpenuhi DAN nilainya tidak 0
  const compliantCriteria = criteria.filter(
    (c) => c.targetLevel > 0 && c.currentLevel > 0 && c.currentLevel >= c.targetLevel
  ).length;

  return Math.round((compliantCriteria / criteria.length) * 100) || 0;
}

/**
 * Level labels for Impact Weight (1 - 5)
 */
export function getImpactLabel(weight: number): { label: string; color: string; badgeClass: string } {
  if (weight >= 5) {
    return {
      label: '🔴 Very High',
      color: '#DC2626',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    };
  }
  if (weight === 4) {
    return {
      label: '🟠 High',
      color: '#EA580C',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    };
  }
  if (weight === 3) {
    return {
      label: '🟡 Medium',
      color: '#D97706',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    };
  }
  if (weight === 2) {
    return {
      label: '🟢 Low',
      color: '#059669',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    };
  }
  return {
    label: '⚪ Very Low',
    color: '#64748B',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  };
}

/**
 * Calculates recommendation progress percentage across action items
 */
export function calculateRecommendationProgress(criteria: Criterion[]): number {
  if (!criteria || criteria.length === 0) return 0;
  const itemsWithGap = criteria.filter((c) => c.targetLevel > c.currentLevel);
  if (itemsWithGap.length === 0) return 100;
  const totalProgress = itemsWithGap.reduce((sum, c) => sum + (c.actionProgress || 0), 0);
  return Math.round(totalProgress / itemsWithGap.length);
}

/**
 * Level names according to IAPP Privacy Maturity Model
 */
export const IAPP_LEVEL_NAMES: Record<number, string> = {
  0: 'Level 0 — Belum Diisi / Unassessed',
  1: 'Level 1 — Ad Hoc (Tidak ada standar & PIC)',
  2: 'Level 2 — Repeatable (Ada standar & PIC namun belum konsisten)',
  3: 'Level 3 — Defined (Standar & PIC konsisten)',
  4: 'Level 4 — Managed (Dengan otomatisasi tool & sistem)',
  5: 'Level 5 — Optimized (Review berkala & berkesinambungan)',
};

/**
 * Concrete actionable remediation suggestion generator based on domain & UU PDP reference
 */
export function getRemediationSuggestion(item: Criterion): string {
  const domain = item.domain?.trim().toLowerCase() || '';
  const ref = item.uuPdpRef ? ` (rujuk ${item.uuPdpRef})` : '';

  if (domain.includes('legal basis') || domain.includes('dasar pemrosesan')) {
    return `Dokumentasikan dasar pemrosesan tertulis (Persetujuan/Kontrak/Kewajiban Hukum) per kategori data pribadi${ref}. Pastikan mekanisme persetujuan eksplisit dan tersimpan pada log consent audit.`;
  }
  if (domain.includes('access control') || domain.includes('akses')) {
    return `Terapkan kebijakan Least Privilege & Role-Based Access Control (RBAC)${ref}. Lakukan audit berkala hak akses dan batasi privilege staf pengelola.`;
  }
  if (domain.includes('encryption') || domain.includes('enkripsi')) {
    return `Implementasikan enkripsi standar industri (AES-256 at-rest & TLS 1.3 in-transit) pada database dan transmisi data pribadi${ref}, serta kelola kunci enkripsi dengan KMS aman.`;
  }
  if (domain.includes('incident response') || domain.includes('insiden')) {
    return `Susun dan simulasikan SOP Penanganan Insiden Kebocoran Data Pribadi${ref} mencakup alur eskalasi internal dan kewajiban notifikasi 3x24 jam ke BSSN/Lembaga PDP.`;
  }
  if (domain.includes('governance') || domain.includes('tata kelola')) {
    return `Tetapkan struktur Organisasi Privasi Data (DPO/Petugas PDP), susun pedoman tata kelola internal, serta gelar evaluasi kepatuhan berkala${ref}.`;
  }
  if (domain.includes('classification') || domain.includes('klasifikasi')) {
    return `Lakukan inventarisasi dan pemetaan data (data mapping) untuk mengklasifikasikan data pribadi umum vs spesifik/sensitif${ref}.`;
  }
  if (domain.includes('data subject rights') || domain.includes('hak subjek')) {
    return `Sediakan portal atau alur kerja operasional terstruktur untuk melayani permintaan Hak Subjek Data (Akses, Koreksi, Penghapusan, Penarikan Consent)${ref}.`;
  }
  if (domain.includes('vendor risk') || domain.includes('vendor')) {
    return `Kaji ulang kontrak vendor/pihak ketiga dengan klausul Data Processing Agreement (DPA) dan jaminan kepatuhan UU PDP${ref}.`;
  }
  if (domain.includes('audit logging') || domain.includes('log')) {
    return `Aktifkan pencatatan log audit immutable untuk seluruh aktivitas pemrosesan & akses data pribadi${ref} serta amankan integritas penyimpanan log.`;
  }
  if (domain.includes('retention') || domain.includes('retensi')) {
    return `Tetapkan jadwal retensi dan mekanisme pemusnahan/penghapusan data pribadi otomatis setelah masa retensi berakhir${ref}.`;
  }
  if (domain.includes('awareness') || domain.includes('pelatihan')) {
    return `Gelar program sosialisasi & pelatihan kepatuhan Pelindungan Data Pribadi secara berkala bagi seluruh karyawan pengelola data${ref}.`;
  }
  if (domain.includes('masking') || domain.includes('tokenization')) {
    return `Terapkan teknik penyamaran (masking / tokenisasi) pada lingkungan testing/non-produksi dan tampilan antarmuka (UI)${ref}.`;
  }

  return `Implementasikan kontrol teknis dan dokumentasi operasional terstruktur sesuai standar UU PDP ${item.uuPdpRef ? `(${item.uuPdpRef})` : ''} untuk meningkatkan tingkat maturitas dari Level ${item.currentLevel} ke Level ${item.targetLevel}.`;
}
