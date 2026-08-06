import React, { useState, useEffect } from 'react';
import { User, Assessment, Criterion, AuditLog, Role } from '../../shared/types';
import {
  fetchAssessments,
  createAssessmentApi,
  deleteAssessmentApi,
  addCriterionApi,
  updateCriterionApi,
  deleteCriterionApi,
  saveSnapshotApi,
  fetchSettingsApi,
  updateSettingsApi,
  fetchAuditLogsApi,
  resetAuditLogsApi,
  verifyOtpApi,
  loginUser,
  registerUser,
  fetchUsers,
  fetchCurrentUser,
  updateUserRoleApi,
} from './api/apiClient';
import { INITIAL_USERS, INITIAL_DOMAINS, createInitialAssessments, INITIAL_AUDIT_LOGS } from "../../shared/data/initialData";
import { ToastContainer, ToastMessage } from './components/Toast';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ModalCriterion } from './components/ModalCriterion';
import { AuthPage } from './pages/AuthPage';
import { AssessmentsListPage } from './pages/AssessmentsListPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssessmentWorkspacePage } from './pages/AssessmentWorkspacePage';
import { GapMatrixPage } from './pages/GapMatrixPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  exportAssessmentToExcel,
  exportAssessmentToPDF,
  exportAuditLogsToExcel,
  exportAuditLogsToPDF,
} from './utils/exporter';
import { calculateOverallCompliance, calculateOverallRisk, syncFoundationalDomainsFromServer } from './utils/scoring';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('dpgap_user');
    const token = localStorage.getItem('dpgap_token');
    if (savedUser && token) {
      try {
        return JSON.parse(savedUser);
      } catch (_) {
        return null;
      }
    }
    return null;
  });

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('dpgap_theme') === 'dark';
  });

  // App Data States
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [retentionMonths, setRetentionMonths] = useState<number>(6);

  // Navigation & UI States
  const [activePage, setActivePage] = useState<string>('assessments');
  const [isAssessmentOpen, setIsAssessmentOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleOpenAssessment = (id: string) => {
    setActiveAssessmentId(id);
    setIsAssessmentOpen(true);
    setActivePage('dashboard');
    const target = assessments.find((a) => a.id === id);
    if (target) {
      addToast(`Membuka assessment "${target.name}"`, 'info');
    }
  };

  const handleCloseAssessment = () => {
    setIsAssessmentOpen(false);
    setActivePage('assessments');
  };

  // Modal State for Criterion
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);

  // Helper toast
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync Theme with HTML class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dpgap_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dpgap_theme', 'light');
    }
  }, [isDarkMode]);

  // Handle Unauthorized 401 Event from API Client
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      localStorage.removeItem('dpgap_user');
      localStorage.removeItem('dpgap_token');
      addToast('Sesi telah berakhir atau tidak valid. Silakan login kembali.', 'error');
    };
    window.addEventListener('dpgap_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dpgap_auth_unauthorized', handleUnauthorized);
  }, []);

  // Verify Restored Token Session on Startup
  useEffect(() => {
    const token = localStorage.getItem('dpgap_token');
    if (token) {
      fetchCurrentUser()
        .then((res) => {
          setCurrentUser(res.user);
          localStorage.setItem('dpgap_user', JSON.stringify(res.user));
        })
        .catch((err) => {
          console.warn('Sesi tidak valid saat inisialisasi:', err.message);
          setCurrentUser(null);
          localStorage.removeItem('dpgap_user');
          localStorage.removeItem('dpgap_token');
        });
    } else {
      setCurrentUser(null);
      localStorage.removeItem('dpgap_user');
      localStorage.removeItem('dpgap_token');
    }
  }, []);

  // Initial Data Fetching from Express API with fallback
  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedAssessments = await fetchAssessments();
        setAssessments(fetchedAssessments);
        if (fetchedAssessments.length > 0 && !activeAssessmentId) {
          setActiveAssessmentId(fetchedAssessments[0].id);
        }
      } catch (err: any) {
        console.warn('API connection fallback to local initial state:', err.message);
        setAssessments(createInitialAssessments());
        setActiveAssessmentId('assess-1');
      }

      try {
        await syncFoundationalDomainsFromServer();
      } catch (err) {
        // fallback
      }

      try {
        const settings = await fetchSettingsApi();
        setRetentionMonths(settings.retentionMonths);
      } catch (err) {
        // fallback retention
      }

      try {
        const audit = await fetchAuditLogsApi();
        setAuditLogs(audit.logs);
      } catch (err) {
        setAuditLogs(INITIAL_AUDIT_LOGS);
      }

      try {
        const uList = await fetchUsers();
        setUsers(uList);
      } catch (err) {
        setUsers(INITIAL_USERS);
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const activeAssessment = assessments.find((a) => a.id === activeAssessmentId) || null;
  const availableDomains = INITIAL_DOMAINS;

  const handleLogin = async (email: string, pass: string, captchaToken: string) => {
  try {
    const res = await loginUser(email, pass, captchaToken);
    setCurrentUser(res.user);
    addToast(`Selamat datang, ${res.user.fullname}! (${res.user.role})`, 'success');
    setActivePage('assessments');
  } catch (err: any) {
    throw new Error(err.message || 'Gagal login. Periksa email dan password.');
  }
};

const handleRegister = async (fullname: string, employeeId: string, email: string, pass: string, role: string) => {
  try {
    await registerUser(fullname, employeeId, email, pass, role);
    // Sengaja tidak setCurrentUser di sini — user baru resmi terdaftar
    // setelah OTP diverifikasi. AuthPage otomatis pindah ke step OTP
    // begitu promise ini resolve tanpa error (lihat handleRegisterSubmit di AuthPage.tsx).
  } catch (err: any) {
    throw new Error(err.message || 'Gagal registrasi.');
  }
};

const handleVerifyOtp = async (email: string, otp: string) => {
  try {
    const res = await verifyOtpApi(email, otp);
    setCurrentUser(res.user);
    addToast(`Registrasi berhasil! Selamat datang, ${res.user.fullname}.`, 'success');
    setActivePage('assessments');
  } catch (err: any) {
    throw new Error(err.message || 'Verifikasi OTP gagal.');
  }
};

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dpgap_user');
    localStorage.removeItem('dpgap_token');
    addToast('Anda telah keluar dari sistem.', 'info');
  };

  // Assessment CRUD
  // PERBAIKAN ERROR 2322: Menyamakan pengetikan templateType
  const handleCreateAssessment = async (
    name: string,
    description: string,
    templateType: 'template' | 'blank' 
  ) => {
    try {
      const newA = await createAssessmentApi(
        name,
        description,
        templateType,
        currentUser ? currentUser.fullname : 'System'
      );
      setAssessments((prev) => [newA, ...prev]);
      setActiveAssessmentId(newA.id);
      setIsAssessmentOpen(true);
      addToast(`Assessment "${newA.name}" berhasil dibuat!`, 'success');
      setActivePage('workspace');
    } catch (err: any) {
      addToast(err.message || 'Gagal membuat assessment', 'error');
    }
  };

  const handleImportAssessment = async (
    name: string,
    description: string,
    importedCriteria: Criterion[]
  ) => {
    try {
      const newA = await createAssessmentApi(
        name,
        description,
        'blank',
        currentUser ? currentUser.fullname : 'System'
      );
      newA.criteria = importedCriteria;
      setAssessments((prev) => [newA, ...prev]);
      setActiveAssessmentId(newA.id);
      setIsAssessmentOpen(true);
      addToast(`Assessment "${newA.name}" berhasil diimpor dengan ${importedCriteria.length} kriteria!`, 'success');
      setActivePage('workspace');
    } catch (err: any) {
      addToast(err.message || 'Gagal mengimpor assessment', 'error');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    const target = assessments.find((a) => a.id === id);
    if (!target) return;

    try {
      await deleteAssessmentApi(id);
    } catch (err) {
      console.warn('API delete assessment fallback:', err);
    }

    setAssessments((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      if (activeAssessmentId === id) {
        setActiveAssessmentId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) {
          setIsAssessmentOpen(false);
          setActivePage('assessments');
        }
      }
      return remaining;
    });

    addToast(`Assessment "${target.name}" berhasil dihapus.`, 'success');
  };

  // Criterion CRUD inside Assessment
  const handleSaveCriterion = async (criterionData: Omit<Criterion, 'id'>, id?: string) => {
    if (!activeAssessment) return;

    if (id) {
      // Update existing
      try {
        await updateCriterionApi(id, criterionData);
      } catch (e) {
        console.warn('API update fallback to local state');
      }

      setAssessments((prev) =>
        prev.map((a) => {
          if (a.id === activeAssessment.id) {
            return {
              ...a,
              criteria: a.criteria.map((c) => (c.id === id ? { ...criterionData, id } : c)),
            };
          }
          return a;
        })
      );
      addToast('Kriteria berhasil diperbarui.', 'success');
    } else {
      // Add new
      let createdCriterion: Criterion;
      try {
        createdCriterion = await addCriterionApi(activeAssessment.id, criterionData);
      } catch (e) {
        createdCriterion = { ...criterionData, id: `crit-${Date.now()}` };
      }

      setAssessments((prev) =>
        prev.map((a) => {
          if (a.id === activeAssessment.id) {
            return { ...a, criteria: [...a.criteria, createdCriterion] };
          }
          return a;
        })
      );
      addToast('Kriteria baru ditambahkan.', 'success');
    }

    setIsCriterionModalOpen(false);
    setEditingCriterion(null);
  };

  const handleUpdateCriterionPartial = async (id: string, updates: Partial<Criterion>) => {
    if (!activeAssessment) return;

    setAssessments((prev) =>
      prev.map((a) => {
        if (a.id === activeAssessment.id) {
          return {
            ...a,
            criteria: a.criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          };
        }
        return a;
      })
    );

    try {
      await updateCriterionApi(id, updates);
    } catch (e) {
      // quiet fallback
    }
  };

  const handleDeleteCriterion = async (id: string) => {
    if (!activeAssessment) return;

    setAssessments((prev) =>
      prev.map((a) => {
        if (a.id === activeAssessment.id) {
          return {
            ...a,
            criteria: a.criteria.filter((c) => c.id !== id),
          };
        }
        return a;
      })
    );

    try {
      await deleteCriterionApi(id);
    } catch (e) {
      // quiet fallback
    }
    addToast('Kriteria berhasil dihapus.', 'success');
  };

  // Snapshot Saving
  const handleSaveSnapshot = async () => {
    if (!activeAssessment) return;
    const criteria = activeAssessment.criteria || [];
    if (criteria.length === 0) {
      addToast('Assessment masih kosong. Tambahkan kriteria terlebih dahulu.', 'error');
      return;
    }

    const avgGap = +(
      criteria.reduce((s, c) => s + Math.max(0, c.targetLevel - c.currentLevel), 0) / criteria.length
    ).toFixed(1);
    const compliance = calculateOverallCompliance(criteria);
    const riskInfo = calculateOverallRisk(criteria);

    try {
      const snap = await saveSnapshotApi(activeAssessment.id, {
        avgGap,
        avgPriorityScore: riskInfo.avgPriorityScore,
        overallCompliance: compliance,
        riskLevel: riskInfo.label,
        note: `Snapshot Evaluasi Tanggal ${new Date().toLocaleDateString('id-ID')}`,
      });

      setAssessments((prev) =>
        prev.map((a) => {
          if (a.id === activeAssessment.id) {
            return { ...a, snapshots: [...a.snapshots, snap] };
          }
          return a;
        })
      );
    } catch (e) {
      const localSnap = {
        id: `snap-${Date.now()}`,
        assessmentId: activeAssessment.id,
        avgGap,
        avgPriorityScore: riskInfo.avgPriorityScore,
        overallCompliance: compliance,
        riskLevel: riskInfo.label,
        createdAt: new Date().toISOString(),
        note: `Snapshot Evaluasi Tanggal ${new Date().toLocaleDateString('id-ID')}`,
      };
      setAssessments((prev) =>
        prev.map((a) => {
          if (a.id === activeAssessment.id) {
            return { ...a, snapshots: [...a.snapshots, localSnap] };
          }
          return a;
        })
      );
    }

    addToast('Snapshot historis berhasil disimpan!', 'success');
  };

  // Settings & Audit Handlers
  const handleSaveRetention = async (newRetention: number) => {
    setRetentionMonths(newRetention);
    try {
      await updateSettingsApi(newRetention);
    } catch (e) {
      // quiet fallback
    }
    addToast('Pengaturan Retensi Audit Log disimpan.', 'success');
  };

  const handleChangeUserRole = async (userId: string, newRole: Role) => {
    try {
      const updated = await updateUserRoleApi(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updated);
        localStorage.setItem('dpgap_user', JSON.stringify(updated));
      }
      addToast(`Role pengguna ${updated.fullname} diperbarui menjadi ${newRole}.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal mengubah role user', 'error');
    }
  };

  const handleResetAuditLogs = async () => {
    setAuditLogs([]);
    try {
      await resetAuditLogsApi();
    } catch (e) {
      // quiet
    }
    addToast('Audit log berhasil dikosongkan.', 'success');
  };

  // If not logged in, render Auth screen
  if (!currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <AuthPage onLogin={handleLogin} onRegister={handleRegister} onVerifyOtp={handleVerifyOtp} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          if (page === 'assessments') {
            handleCloseAssessment();
          } else {
            setActivePage(page);
          }
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeAssessment={activeAssessment}
        isAssessmentOpen={isAssessmentOpen}
        onCloseAssessment={handleCloseAssessment}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header
          currentUser={currentUser}
          activeAssessment={activeAssessment}
          assessments={assessments}
          onSelectAssessment={(id) => {
            if (id) {
              setActiveAssessmentId(id);
              setIsAssessmentOpen(true);
              addToast('Assessment aktif diganti', 'info');
            }
          }}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          onExportExcel={() => {
            if (activeAssessment) {
              // PERBAIKAN NAMA FILE: Kita lempar nama assessment ke fungsi export
              exportAssessmentToExcel(activeAssessment, currentUser.fullname);
              addToast('Laporan Excel berhasil diunduh.', 'success');
            }
          }}
          onExportPDF={() => {
            if (activeAssessment) {
              exportAssessmentToPDF(activeAssessment, currentUser.fullname);
              addToast('Laporan PDF berhasil diunduh.', 'success');
            }
          }}
          activePage={activePage}
          isAssessmentOpen={isAssessmentOpen}
          onCloseAssessment={handleCloseAssessment}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activePage === 'assessments' && (
            <AssessmentsListPage
              assessments={assessments}
              currentUser={currentUser}
              onOpenAssessment={handleOpenAssessment}
              onCreateAssessment={handleCreateAssessment}
              onDeleteAssessment={handleDeleteAssessment}
              onImportAssessment={handleImportAssessment}
            />
          )}

          {activePage === 'dashboard' && activeAssessment && (
            <DashboardPage
              assessment={activeAssessment}
              onSaveSnapshot={handleSaveSnapshot}
            />
          )}

          {/* PERBAIKAN ERROR 2367: Hapus blok limitasi Viewer */}
          {activePage === 'workspace' && activeAssessment && (
            <AssessmentWorkspacePage
              assessment={activeAssessment}
              currentUser={currentUser}
              onUpdateCriterion={handleUpdateCriterionPartial}
              onDeleteCriterion={handleDeleteCriterion}
              onOpenAddModal={() => {
                setEditingCriterion(null);
                setIsCriterionModalOpen(true);
              }}
              onOpenEditModal={(criterion) => {
                setEditingCriterion(criterion);
                setIsCriterionModalOpen(true);
              }}
            />
          )}

          {/* PERBAIKAN ERROR 2367: Hapus blok limitasi Viewer */}
          {activePage === 'gap' && activeAssessment && (
            <GapMatrixPage assessment={activeAssessment} />
          )}

          {/* PERBAIKAN ERROR 2367: Hapus blok limitasi Viewer */}
          {activePage === 'recommendations' && activeAssessment && (
            <RecommendationsPage
              assessment={activeAssessment}
              currentUser={currentUser}
              onUpdateCriterion={handleUpdateCriterionPartial}
            />
          )}

          {activePage === 'audit' && (
            <AuditLogPage
              logs={auditLogs}
              currentUser={currentUser}
              retentionMonths={retentionMonths}
              onResetLogs={handleResetAuditLogs}
              // PERBAIKAN ERROR 2741: Passing onNavigate ke AuditLogPage
              onNavigate={(page) => setActivePage(page)}
              onExportExcel={() => {
                exportAuditLogsToExcel(auditLogs);
                addToast('Audit Log Excel diunduh.', 'success');
              }}
              onExportPDF={() => {
                exportAuditLogsToPDF(auditLogs, currentUser.fullname);
                addToast('Audit Log PDF diunduh.', 'success');
              }}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              retentionMonths={retentionMonths}
              users={users}
              currentUser={currentUser}
              onSaveRetention={handleSaveRetention}
              onChangeUserRole={handleChangeUserRole}
              isDarkMode={isDarkMode}
              onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            />
          )}
        </main>

        <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          Data Protection Gap Assessment Platform (DPGAP) — Telkom Hub · Output Kuliah Praktik
        </footer>
      </div>

      {/* Modal Add/Edit Criterion */}
      <ModalCriterion
        isOpen={isCriterionModalOpen}
        onClose={() => setIsCriterionModalOpen(false)}
        onSave={handleSaveCriterion}
        editingCriterion={editingCriterion}
        domains={availableDomains}
      />
    </div>
  );
}