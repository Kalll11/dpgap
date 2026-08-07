import { Assessment, User, AuditLog, Criterion, Snapshot, Role } from '../../../shared/types';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('dpgap_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * @param emitUnauthorizedOn401 - Set `false` untuk endpoint auth (login, register, verify-otp,
 * /auth/me saat init) di mana 401 berarti "kredensial salah" / "belum login" — BUKAN "sesi habis".
 * Hanya endpoint data terproteksi (assessments, users, dll) yang boleh memicu event global
 * 'dpgap_auth_unauthorized' + toast "Sesi telah berakhir...".
 */
async function handleResponse<T>(
  res: Response,
  defaultErrMsg: string,
  emitUnauthorizedOn401: boolean = true
): Promise<T> {
  if (!res.ok) {
    let errMsg = defaultErrMsg;
    try {
      const errJson = await res.json();
      if (errJson.error) {
        errMsg = errJson.error;
      }
    } catch (_) {
      // fallback to default
    }

    if (res.status === 401) {
      // Session expired or invalid
      localStorage.removeItem('dpgap_token');
      localStorage.removeItem('dpgap_user');
      if (emitUnauthorizedOn401) {
        window.dispatchEvent(new Event('dpgap_auth_unauthorized'));
      }
    }

    throw new Error(errMsg);
  }
  return res.json();
}

export async function loginUser(email: string, pass: string, captchaToken: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, captchaToken }),
  });
  // emitUnauthorizedOn401 = false: 401 di sini berarti "email/password salah", bukan sesi habis.
  const data = await handleResponse<{ user: User; token: string }>(res, 'Gagal login', false);
  if (data.token) {
    localStorage.setItem('dpgap_token', data.token);
    localStorage.setItem('dpgap_user', JSON.stringify(data.user));
  }
  return data;
}

export async function registerUser(
  fullname: string,
  employeeId: string,
  email: string,
  pass: string,
  role: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullname, employeeId, email, password: pass, role }),
  });
  return handleResponse<{ message: string }>(res, 'Gagal mendaftar', false);
}

export async function verifyOtpApi(email: string, otp: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await handleResponse<{ user: User; token: string }>(res, 'Gagal verifikasi OTP', false);
  if (data.token) {
    localStorage.setItem('dpgap_token', data.token);
    localStorage.setItem('dpgap_user', JSON.stringify(data.user));
  }
  return data;
}

export async function fetchCurrentUser(): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  // emitUnauthorizedOn401 = false: ini pengecekan sesi diam-diam saat app pertama kali dibuka.
  // 401 di sini normal untuk pengunjung yang belum login — tidak boleh memicu toast "sesi habis".
  return handleResponse<{ user: User }>(res, 'Gagal memverifikasi sesi', false);
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<User[]>(res, 'Gagal mengambil data user');
}

export async function updateUserRoleApi(userId: string, role: Role): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  return handleResponse<User>(res, 'Gagal mengubah role user');
}

export async function fetchAssessments(): Promise<Assessment[]> {
  const res = await fetch(`${API_BASE}/assessments`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Assessment[]>(res, 'Gagal mengambil daftar assessment');
}

export async function createAssessmentApi(
  name: string,
  description: string,
  templateType: string,
  createdBy: string
): Promise<Assessment> {
  const res = await fetch(`${API_BASE}/assessments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description, templateType, createdBy }),
  });
  return handleResponse<Assessment>(res, 'Gagal membuat assessment');
}

export async function deleteAssessmentApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/assessments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await handleResponse<{ success: boolean }>(res, 'Gagal menghapus assessment');
}

export async function addCriterionApi(assessmentId: string, criterion: Omit<Criterion, 'id'>): Promise<Criterion> {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/criteria`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(criterion),
  });
  return handleResponse<Criterion>(res, 'Gagal menambah kriteria');
}

export async function updateCriterionApi(id: string, updates: Partial<Criterion>): Promise<Criterion> {
  const res = await fetch(`${API_BASE}/criteria/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse<Criterion>(res, 'Gagal memperbarui kriteria');
}

export async function deleteCriterionApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/criteria/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await handleResponse<{ success: boolean }>(res, 'Gagal menghapus kriteria');
}

export async function saveSnapshotApi(
  assessmentId: string,
  snapshotData: { avgGap: number; avgPriorityScore: number; overallCompliance: number; riskLevel: string; note?: string }
): Promise<Snapshot> {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/snapshots`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(snapshotData),
  });
  return handleResponse<Snapshot>(res, 'Gagal menyimpan snapshot');
}

export async function fetchFoundationalDomainsApi(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/foundational-domains`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ domains: string[] }>(res, 'Gagal mengambil data domain fondasional');
  return data.domains;
}

export async function updateFoundationalDomainsApi(domains: string[]): Promise<string[]> {
  const res = await fetch(`${API_BASE}/foundational-domains`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ domains }),
  });
  const data = await handleResponse<{ domains: string[] }>(res, 'Gagal memperbarui domain fondasional');
  return data.domains;
}

export async function fetchSettingsApi(): Promise<{ retentionMonths: number }> {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<{ retentionMonths: number }>(res, 'Gagal mengambil pengaturan');
}

export async function updateSettingsApi(
  retentionMonths: number
): Promise<{ retentionMonths: number }> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ retentionMonths }),
  });
  return handleResponse<{ retentionMonths: number }>(res, 'Gagal menyimpan pengaturan');
}

export async function fetchAuditLogsApi(): Promise<{ logs: AuditLog[]; retentionMonths: number }> {
  const res = await fetch(`${API_BASE}/audit-logs`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<{ logs: AuditLog[]; retentionMonths: number }>(res, 'Gagal mengambil audit log');
}

export async function resetAuditLogsApi(): Promise<void> {
  const res = await fetch(`${API_BASE}/audit-logs`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await handleResponse<{ success: boolean }>(res, 'Gagal mereset audit log');
}
