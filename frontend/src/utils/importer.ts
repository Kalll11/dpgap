import * as XLSX from 'xlsx';
import { Assessment, Criterion, LifecycleStage, FocusArea } from '../types';

export interface ParseExcelResult {
  assessmentName: string;
  description: string;
  criteria: Criterion[];
}

/**
 * Parses an Excel file (.xlsx, .xls) exported from DPGAP or built using standard DPGAP headers
 */
export function parseAssessmentExcel(fileBuffer: ArrayBuffer): ParseExcelResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  
  // Prefer sheet 'Detail Framework Checklist' if present, otherwise use first worksheet
  const sheetName =
    workbook.SheetNames.find((s) => s.toLowerCase().includes('checklist') || s.toLowerCase().includes('detail')) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Sheet tidak ditemukan dalam file Excel');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let assessmentName = 'Imported Excel Assessment';
  let description = 'Assessment diimpor dari file Excel';

  // Check top summary metadata rows if present
  if (rawRows.length > 0 && rawRows[0]?.[0]) {
    const title = String(rawRows[0][0]);
    if (title.includes('DPGAP') || title.includes('TELKOM')) {
      // Look for project name in row 1 or row 4
      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r];
        if (!row) continue;
        const col0 = String(row[0] || '').toLowerCase();
        if (col0.includes('nama assessment') || col0.includes('proyek')) {
          if (row[1]) assessmentName = String(row[1]);
        }
        if (col0.includes('deskripsi')) {
          if (row[1]) description = String(row[1]);
        }
      }
    }
  }

  // Find header row containing 'Tahap' or 'Domain' or 'Checklist'
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row) continue;
    const rowStr = row.map((cell) => String(cell || '').toLowerCase()).join(' ');
    if (
      rowStr.includes('domain') ||
      rowStr.includes('checklist') ||
      rowStr.includes('tahap')
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Baris header tidak ditemukan. Pastikan file Excel memiliki kolom Domain/Checklist/Tahap.');
  }

  const headers = rawRows[headerRowIndex].map((h) => String(h || '').trim());

  // Helper column index finder
  const findCol = (...keywords: string[]) => {
    return headers.findIndex((h) => {
      const lower = h.toLowerCase();
      return keywords.some((kw) => lower.includes(kw.toLowerCase()));
    });
  };

  const stageCol = findCol('tahap', 'lifecycle');
  const domainCol = findCol('domain');
  const focusCol = findCol('focus', 'area');
  const dimensiCol = findCol('dimensi');
  const activityCol = findCol('aktivitas', 'activity');
  const checklistCol = findCol('checklist', 'pertanyaan', 'kriteria');
  const evidenceCol = findCol('evident', 'bukti', 'evidence');
  const picCol = findCol('pic lead', 'pic');
  const targetCol = findCol('target level', 'target');
  const currentCol = findCol('current level', 'current');
  const uuPdpCol = findCol('uu pdp', 'pdp');
  const nistCol = findCol('nist');
  const pbdCol = findCol('privacy by design', 'pbd');
  const statusCol = findCol('status remediasi', 'action status');
  const progressCol = findCol('progress remediasi', 'action progress');
  const actionPicCol = findCol('pic remediasi', 'action pic');
  const deadlineCol = findCol('target deadline', 'deadline');
  const notesCol = findCol('catatan', 'notes');

  const criteria: Criterion[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const checklistText = checklistCol !== -1 && row[checklistCol] ? String(row[checklistCol]).trim() : '';
    const domainText = domainCol !== -1 && row[domainCol] ? String(row[domainCol]).trim() : '';

    if (!checklistText && !domainText) continue;

    const targetVal = targetCol !== -1 ? parseInt(String(row[targetCol]), 10) || 5 : 5;
    const currentVal = currentCol !== -1 ? parseInt(String(row[currentCol]), 10) || 1 : 1;

    let stageVal: LifecycleStage = 'Collection';
    if (stageCol !== -1 && row[stageCol]) {
      const rawStg = String(row[stageCol]).trim();
      const stgMatches: LifecycleStage[] = [
        'Collection',
        'Storage',
        'Use / Processing',
        'Sharing',
        'Retention',
        'Disposal',
        'Seluruh Tahap',
      ];
      const match = stgMatches.find((s) => s.toLowerCase() === rawStg.toLowerCase());
      if (match) stageVal = match;
    }

    const cItem: Criterion = {
      id: `crit-imp-${Date.now()}-${r}`,
      stage: stageVal,
      domain: domainText || 'Keamanan Umum & Privasi',
      focusArea: focusCol !== -1 && row[focusCol] ? (String(row[focusCol]).trim() as FocusArea) : 'Pengendalian Pemrosesan Data Pribadi',
      dimensi: dimensiCol !== -1 && row[dimensiCol] ? String(row[dimensiCol]).trim() : 'Process',
      activity: activityCol !== -1 && row[activityCol] ? String(row[activityCol]).trim() : checklistText,
      checklist: checklistText || 'Kriteria Assessment Keamanan Data',
      evidence: evidenceCol !== -1 && row[evidenceCol] ? String(row[evidenceCol]).trim() : '-',
      pic: picCol !== -1 && row[picCol] ? String(row[picCol]).trim() : 'Team IT',
      targetLevel: Math.min(5, Math.max(1, targetVal)),
      currentLevel: Math.min(5, Math.max(1, currentVal)),
      uuPdpRef: uuPdpCol !== -1 && row[uuPdpCol] ? String(row[uuPdpCol]).trim() : 'Pasal 39',
      nistRef: nistCol !== -1 && row[nistCol] ? String(row[nistCol]).trim() : 'PR.DS',
      pbdRef: pbdCol !== -1 && row[pbdCol] ? String(row[pbdCol]).trim() : 'End-to-End Security',
      actionStatus: statusCol !== -1 && row[statusCol] ? (String(row[statusCol]).trim() as any) : 'Not Started',
      actionProgress: progressCol !== -1 ? parseInt(String(row[progressCol]).replace('%', ''), 10) || 0 : 0,
      actionPic: actionPicCol !== -1 && row[actionPicCol] ? String(row[actionPicCol]).trim() : '',
      actionDeadline: deadlineCol !== -1 && row[deadlineCol] ? String(row[deadlineCol]).trim() : '',
      actionNotes: notesCol !== -1 && row[notesCol] ? String(row[notesCol]).trim() : '',
    };

    criteria.push(cItem);
  }

  if (criteria.length === 0) {
    throw new Error('Tidak ada kriteria valid yang dapat dibaca dari file Excel');
  }

  return {
    assessmentName,
    description,
    criteria,
  };
}
