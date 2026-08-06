import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Assessment, AuditLog } from '../../../shared/types'
import {
  calculateOverallCompliance,
  calculateOverallRisk,
  calculatePriorityScore,
  isFoundationalDomain,
  sortCriteriaByPriority,
} from './scoring';

/**
 * Export active Assessment to professional Excel workbook
 * Menyesuaikan dengan format Framework_matrix_REV_REV
 */
export function exportAssessmentToExcel(assessment: Assessment, userName: string) {
  const wb = XLSX.utils.book_new();

  const criteria = assessment.criteria || [];
  const compliance = calculateOverallCompliance(criteria);
  const riskInfo = calculateOverallRisk(criteria);

  // -------------------------------------------------------------
  // Sheet 1: Executive Summary (Ringkasan Eksekutif)
  // -------------------------------------------------------------
  const metCount = criteria.filter((c) => c.currentLevel >= c.targetLevel).length;
  const unmetCount = criteria.length - metCount;
  const avgGap = criteria.length > 0
    ? +(criteria.reduce((s, c) => s + Math.max(0, c.targetLevel - c.currentLevel), 0) / criteria.length).toFixed(2)
    : 0;

  const summaryAOA: any[][] = [
    ['TELKOM INDONESIA — DPGAP EXECUTIVE SUMMARY REPORT', ''],
    [`Laporan Evaluasi Kepatuhan PDP & Keamanan Informasi | Date: ${new Date().toLocaleDateString('id-ID')}`, ''],
    [],
    ['METRIK EVALUASI KEPATUHAN', 'NILAI / STATUS'],
    ['Nama Assessment Proyek', assessment.name],
    ['Deskripsi Proyek', assessment.description || '-'],
    ['Status Proyek', assessment.status],
    ['Total Kriteria Framework', `${criteria.length} Item Checklist`],
    ['Kriteria Memenuhi Target (Met)', `${metCount} Item`],
    ['Kriteria Belum Memenuhi (Unmet)', `${unmetCount} Item`],
    ['Tingkat Kepatuhan (Compliance %)', `${compliance}%`],
    ['Rata-rata Gap Level', `${avgGap} Level`],
    ['Rating Risiko Keseluruhan', `${riskInfo.label} (Score ${riskInfo.avgPriorityScore}/100)`],
    ['Dibuat Oleh / Lead Assessor', assessment.createdBy],
    ['Tanggal Export Laporan', new Date().toLocaleString('id-ID')],
    ['Operator Pengunduh', userName],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);

  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];

  wsSummary['!cols'] = [{ wch: 38 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

  // -------------------------------------------------------------
  // Sheet 2: Framework Matrix (Sesuai format Framework_Matrix_REV_REV.xlsx)
  // -------------------------------------------------------------
  // Header disesuaikan dengan struktur spesifik Framework_Matrix_REV_Final
  const criteriaHeader = [
    'Lifecycle',
    'Domain',
    'Dimensi',
    'Activity',
    'Evidence',
    'PIC',
    'NIST PF',
    'UU PDP',
    'Privacy by Design',
    'Checklist',
    'Target',
    'Current',
    'Gap',
    'Impact',
    'Priority',
    'Catatan'
  ];

  const criteriaDataRows = criteria.map((c) => {
    const gap = Math.max(0, c.targetLevel - c.currentLevel);
    const impact = c.targetLevel; // Mengikuti pola file lama: Impact diambil dari targetLevel
    const calculatedPriority = gap * impact; // Formula Priority dari Framework Matrix REV
    
    return [
      c.stage,
      c.domain,
      c.dimensi || 'Process',
      c.activity || c.checklist, // Activity default ke checklist jika kosong
      c.evidence || '-',
      c.pic || '-',
      c.nistRef || '-',
      c.uuPdpRef || '-',
      c.pbdRef || '-',
      c.checklist,
      c.targetLevel,
      c.currentLevel,
      gap,
      impact,
      calculatedPriority,
      c.actionNotes || '-' 
    ];
  });

  const criteriaAOA: any[][] = [
    ['Data Protection Gap Assessment Framework — Framework Matrix REV Final'],
    ['Ini versi final hasil rapi-rapi menyeluruh — kolom bertambah (Dimensi, PIC, Privacy by Design, Impact, Priority) dibanding versi sebelumnya. Sheet ini tetap jadi \'kontrak data\' proyek.'],
    [], 
    criteriaHeader,
    ...criteriaDataRows,
  ];

  const wsCriteria = XLSX.utils.aoa_to_sheet(criteriaAOA);

  wsCriteria['!cols'] = [
    { wch: 15 },  // Lifecycle
    { wch: 25 },  // Domain
    { wch: 15 },  // Dimensi
    { wch: 40 },  // Activity
    { wch: 35 },  // Evidence
    { wch: 20 },  // PIC
    { wch: 20 },  // NIST PF
    { wch: 35 },  // UU PDP
    { wch: 30 },  // Privacy by Design
    { wch: 60 },  // Checklist
    { wch: 10 },  // Target
    { wch: 10 },  // Current
    { wch: 10 },  // Gap
    { wch: 10 },  // Impact
    { wch: 12 },  // Priority
    { wch: 40 },  // Catatan
  ];

  wsCriteria['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: criteriaAOA.length - 1, c: criteriaHeader.length - 1 },
    }),
  };

  XLSX.utils.book_append_sheet(wb, wsCriteria, 'Framework Matrix');

  // -------------------------------------------------------------
  // Sheet 3: Action Plan & Prioritas Remediasi (Table Layout)
  // -------------------------------------------------------------
  const sortedGapCriteria = sortCriteriaByPriority(
    criteria.filter((c) => c.targetLevel > c.currentLevel)
  );

  const gapItems = sortedGapCriteria.map((c) => {
    const gap = c.targetLevel - c.currentLevel;
    const score = calculatePriorityScore(c.targetLevel, c.currentLevel);
    const isFoundational = isFoundationalDomain(c.domain);
    return { c, gap, score, isFoundational };
  });

  const actionHeader = [
    'Urutan Prioritas',
    'Domain Keamanan',
    'Flag Fondasional',
    'Focus Area',
    'Checklist / Kerentanan',
    'Current Lvl',
    'Target Lvl',
    'Besaran Gap',
    'Priority Score (%)',
    'Status Action Plan',
    'Progress (%)',
    'PIC Penanggung Jawab',
    'Target Deadline',
    'Catatan Tindak Lanjut & Langkah Remediasi',
  ];

  const actionDataRows = gapItems.map((item, idx) => [
    `P${idx + 1}`,
    item.c.domain,
    item.isFoundational ? '⚠️ Ya (Fondasional)' : 'Tidak',
    item.c.focusArea,
    item.c.checklist,
    item.c.currentLevel,
    item.c.targetLevel,
    `${item.gap} Level`,
    `${item.score}%`,
    item.c.actionStatus || 'Not Started',
    `${item.c.actionProgress || 0}%`,
    item.c.actionPic || item.c.pic || '-',
    item.c.actionDeadline || '-',
    item.c.actionNotes || '-',
  ]);

  const actionAOA: any[][] = [
    ['PRIORITAS ACTION PLAN & REMEDIASI GAP DPGAP', ...Array(actionHeader.length - 1).fill('')],
    [`Daftar ${gapItems.length} Kriteria Memiliki Gap Level > 0 (Urut Berdasarkan Priority Score)`, ...Array(actionHeader.length - 1).fill('')],
    [],
    actionHeader,
    ...(actionDataRows.length > 0
      ? actionDataRows
      : [['-', 'Semua kriteria telah memenuhi target (Gap = 0)', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']]),
  ];

  const wsAction = XLSX.utils.aoa_to_sheet(actionAOA);

  wsAction['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: actionHeader.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: actionHeader.length - 1 } },
  ];

  wsAction['!cols'] = [
    { wch: 18 }, // Urutan
    { wch: 34 }, // Domain
    { wch: 34 }, // Focus Area
    { wch: 55 }, // Checklist
    { wch: 14 }, // Current
    { wch: 14 }, // Target
    { wch: 16 }, // Gap
    { wch: 20 }, // Priority Score
    { wch: 20 }, // Status
    { wch: 16 }, // Progress
    { wch: 24 }, // PIC
    { wch: 18 }, // Deadline
    { wch: 45 }, // Catatan
  ];

  wsAction['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: actionAOA.length - 1, c: actionHeader.length - 1 },
    }),
  };

  XLSX.utils.book_append_sheet(wb, wsAction, 'Prioritas Action Plan');

  // -------------------------------------------------------------
  // Save File
  // PERBAIKAN: Nama file disesuaikan menjadi [Nama_Assessment]_Framework_Matrix_REV_REV.xlsx
  // -------------------------------------------------------------
  const cleanName = assessment.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanName}_Framework_Matrix_REV_REV.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export active Assessment to Executive PDF Report
 */
export function exportAssessmentToPDF(assessment: Assessment, userName: string) {
  const doc = new jsPDF({ orientation: 'landscape' }) as any;
  const criteria = assessment.criteria || [];
  const compliance = calculateOverallCompliance(criteria);
  const riskInfo = calculateOverallRisk(criteria);

  const getEffectiveStatus = (c: (typeof criteria)[number]): string => {
    const gap = Math.max(0, c.targetLevel - c.currentLevel);
    if (gap === 0) return 'Completed';
    return c.actionStatus || 'Not Started';
  };

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(30, 39, 97);
  doc.text('Data Protection Gap Assessment Platform (DPGAP)', 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Executive Summary Report — ${assessment.name}`, 14, 27);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')} | Otoritas: ${userName}`, 14, 33);

  // Executive Summary Table
  doc.setFontSize(13);
  doc.setTextColor(30, 39, 97);
  doc.text('1. Ringkasan Eksekutif & Compliance', 14, 44);

  autoTable(doc, {
    startY: 48,
    head: [['Metrik Evaluasi', 'Nilai / Status']],
    body: [
      ['Nama Proyek Assessment', assessment.name],
      ['Total Kriteria Evaluasi', `${criteria.length} Item Checklist`],
      ['Status Target Compliance', `${compliance}% Terpenuhi`],
      ['Rating Risiko Keseluruhan', `${riskInfo.label} (Score ${riskInfo.avgPriorityScore}/100)`],
      ['Penanggung Jawab Proyek', assessment.createdBy],
    ],
    headStyles: { fillColor: [30, 39, 97] },
    theme: 'grid',
    styles: { fontSize: 9 },
  });

  const finalY1 = (doc as any).lastAutoTable?.finalY || 100;

  // 2. Checklist Detail Table
  doc.setFontSize(13);
  doc.setTextColor(30, 39, 97);
  doc.text('2. Matriks Detail Evaluation & Status Checklist', 14, finalY1 + 12);

  const tableBody = criteria.map((c) => {
  const gap = Math.max(0, c.targetLevel - c.currentLevel);
  return [
    c.domain,
    c.checklist,
    c.targetLevel,
    c.currentLevel,
    gap,
    getEffectiveStatus(c),
    c.actionNotes || '-',
  ];
});

autoTable(doc, {
  startY: finalY1 + 16,
  head: [['Domain', 'Checklist', 'Tgt', 'Cur', 'Gap', 'Status', 'Catatan Tindak Lanjut']],
  body: tableBody,
  headStyles: { fillColor: [30, 39, 97] },
  theme: 'striped',
  styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
  columnStyles: {
    0: { cellWidth: 35 },  // Domain
    1: { cellWidth: 110 }, // Checklist
    2: { cellWidth: 14 },  // Tgt
    3: { cellWidth: 14 },  // Cur
    4: { cellWidth: 14 },  // Gap
    5: { cellWidth: 28 },  // Status
    6: { cellWidth: 50 },  // Catatan Tindak Lanjut
  },
});

  const finalY2 = (doc as any).lastAutoTable?.finalY || finalY1 + 60;

  // 3. Action Plan & Catatan Tindak Lanjut Remediasi Table
  doc.setFontSize(13);
  doc.setTextColor(30, 39, 97);
  doc.text('3. Rencana Aksi & Catatan Tindak Lanjut Remediasi (Action Plan)', 14, finalY2 + 12);

  const gapItemsForPdf = criteria.filter((c) => c.targetLevel > c.currentLevel);

  const actionPlanData = gapItemsForPdf.map((c, idx) => [
    idx + 1,
    `${c.domain}\n${c.checklist}`,
    c.actionPic || c.pic || '-',
    c.actionDeadline || '-',
    c.actionStatus || 'Not Started',
    `${c.actionProgress || 0}%`,
    c.actionNotes || '-',
  ]);

  autoTable(doc, {
    startY: finalY2 + 16,
    head: [['No', 'Domain & Item Checklist', 'PIC', 'Deadline', 'Status', 'Progress', 'Catatan Tindak Lanjut']],
    body:
      actionPlanData.length > 0
        ? actionPlanData
        : [['-', 'Semua kriteria telah memenuhi target (Gap = 0)', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [30, 39, 97] },
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 14 },  // No
      1: { cellWidth: 90 },  // Domain & Item Checklist
      2: { cellWidth: 30 },  // PIC
      3: { cellWidth: 28 },  // Deadline
      4: { cellWidth: 28 },  // Status
      5: { cellWidth: 22 },  // Progress
      6: { cellWidth: 55 },  // Catatan Tindak Lanjut
    },
  });

  const fileName = `${assessment.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Report_${Date.now()}.pdf`;
  doc.save(fileName);
}

/**
 * Export Audit Logs to Excel
 */
export function exportAuditLogsToExcel(logs: AuditLog[]) {
  const wb = XLSX.utils.book_new();

  const headers = ['No', 'Waktu & Tanggal', 'User Pelaksana', 'Aksi System', 'Detail Aktivitas'];
  const dataRows = logs.map((l, index) => [
    index + 1,
    new Date(l.timestamp).toLocaleString('id-ID'),
    l.userName,
    l.action,
    l.detail,
  ]);

  const aoa: any[][] = [
    ['DPGAP TELKOM HUB — SYSTEM AUDIT LOG', '', '', '', ''],
    [`Total Log Aktivitas: ${logs.length} Event | Export Date: ${new Date().toLocaleString('id-ID')}`, '', '', '', ''],
    [],
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];

  ws['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 25 },
    { wch: 30 },
    { wch: 60 },
  ];

  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: aoa.length - 1, c: 4 },
    }),
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Audit Log System');
  XLSX.writeFile(wb, `DPGAP_AuditLogs_${Date.now()}.xlsx`);
}

/**
 * Export Audit Logs to PDF
 */
export function exportAuditLogsToPDF(logs: AuditLog[], userName: string) {
  const doc = new jsPDF() as any;
  doc.setFontSize(16);
  doc.setTextColor(30, 39, 97);
  doc.text('DPGAP — System Audit Log', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Diekspor: ${new Date().toLocaleString('id-ID')} | Operator: ${userName}`, 14, 25);

  autoTable(doc, {
    startY: 30,
    head: [['Waktu & Tanggal', 'User Pelaksana', 'Aksi System', 'Detail Aktivitas']],
    body: logs.map((l) => [
      new Date(l.timestamp).toLocaleString('id-ID'),
      l.userName,
      l.action,
      l.detail,
    ]),
    headStyles: { fillColor: [30, 39, 97] },
    theme: 'striped',
    styles: { fontSize: 8 },
    columnStyles: { 3: { cellWidth: 80 } },
  });

  doc.save(`DPGAP_AuditLogs_${Date.now()}.pdf`);
}