import { UploadBatchSummary, UploadRowError } from '../types';
import { maskApaarId } from '../utils/formatters';
import { apiClient } from './apiClient';

const MAX_FILE_SIZE_MB = 10;
type CsvRow = Record<string, string>;

const HEADER_ALIASES: Record<string, string> = {
  apaar: 'apaar_id', apaar_id: 'apaar_id', 'apaar id': 'apaar_id',
  full_name: 'student_name', name: 'student_name', student_name: 'student_name',
  dob: 'dob', date_of_birth: 'dob', roll_no: 'roll_number', roll_number: 'roll_number',
  student_code: 'roll_number', department: 'department', branch: 'department',
  course: 'department', course_name: 'department', quota: 'quota', quota_type: 'quota',
  program_level: 'program_level', approved_intake: 'approved_intake',
  approved_supernumerary: 'approved_supernumerary',
  passport: 'passport_no', passport_no: 'passport_no',
};

// Verhoeff tables are the algorithm definition, not fixture data.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV must contain a header and at least one data row.');
  const headers = rows[0].map((header) => {
    const normalized = header.toLowerCase().replace(/\s+/g, '_');
    return HEADER_ALIASES[normalized] || normalized;
  });
  return rows.slice(1).map((values) => headers.reduce<CsvRow>((record, header, index) => {
    record[header] = values[index] || '';
    return record;
  }, {}));
}

function isValidVerhoeff(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) return false;
  let checksum = 0;
  digits.split('').reverse().map(Number).forEach((digit, index) => {
    checksum = VERHOEFF_D[checksum][VERHOEFF_P[index % 8][digit]];
  });
  return checksum === 0;
}

function makeError(row: CsvRow, rowNumber: number, ruleViolated: string, severity: 'CRITICAL' | 'WARNING', description: string): UploadRowError {
  const apaarId = row.apaar_id.trim();
  return { rowNumber, studentName: row.student_name || '—', apaarId, maskedApaarId: maskApaarId(apaarId), rollNumber: row.roll_number || '—', department: row.department || '—', quota: row.quota || '—', ruleViolated, severity, description, status: 'FLAGGED' };
}

function validateRows(rows: CsvRow[]) {
  const errors: UploadRowError[] = [];
  const seen = new Map<string, number>();
  const ruleCounts = new Map<string, number>();
  const add = (error: UploadRowError) => { errors.push(error); ruleCounts.set(error.ruleViolated, (ruleCounts.get(error.ruleViolated) || 0) + 1); };
  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const apaarId = row.apaar_id.trim();
    const isForeignQuota = ['nri', 'oci', 'fn'].includes((row.quota || '').trim().toLowerCase());
    const missingRequiredField = !row.student_name.trim() || !row.roll_number.trim() || !row.department.trim();
    if (missingRequiredField) add(makeError(row, rowNumber, 'Required Student Fields', 'CRITICAL', 'Student name, roll number, and department are required.'));
    else if (isForeignQuota) {
      if (!/^[A-Z][0-9]{7}$/.test((row.passport_no || '').trim().toUpperCase())) add(makeError(row, rowNumber, 'Passport Format', 'CRITICAL', 'A valid passport number is required for foreign-quota rows.'));
    } else if (!apaarId) add(makeError(row, rowNumber, 'APAAR Required', 'CRITICAL', 'APAAR ID is required for non-foreign-quota rows.'));
    else if (!isValidVerhoeff(apaarId)) add(makeError(row, rowNumber, 'APAAR Verhoeff Checksum', 'CRITICAL', 'APAAR identifier is not a valid 12-digit Verhoeff value.'));
    if (apaarId && seen.has(apaarId)) add(makeError(row, rowNumber, 'Duplicate APAAR in Upload', 'CRITICAL', `APAAR ID is also present in row ${seen.get(apaarId)} of this file.`));
    else if (apaarId) seen.set(apaarId, rowNumber);
    if (!row.dob.trim() || Number.isNaN(new Date(row.dob).getTime())) add(makeError(row, rowNumber, 'Date of Birth Format', 'WARNING', 'Date of birth is missing or cannot be parsed as a valid date.'));
  });
  const rulesEvaluated = [...ruleCounts.entries()].map(([name, violatorCount]) => ({ name, passed: false, violatorCount }));
  if (!rulesEvaluated.length) rulesEvaluated.push({ name: 'Row data validation', passed: true, violatorCount: 0 });
  return { errors, rulesEvaluated };
}

export const uploadService = {
  getTemplateCsv(): string { return 'apaar_id,student_name,dob,gender,roll_number,department,quota\n'; },
  downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob([this.getTemplateCsv()], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'apaar_student_batch_template.csv'; link.click(); URL.revokeObjectURL(url);
  },
  async processUpload(file: File, onProgress: (pct: number, stage: string) => void): Promise<UploadBatchSummary> {
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) throw new Error(`File size (${fileSizeMb.toFixed(1)} MB) exceeds the maximum allowed 10 MB limit.`);
    if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Please upload a CSV or Excel file so its rows can be validated.');
    onProgress(20, 'Uploading rows to the institutional validation service...');
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<{
      upload_id: number;
      total: number;
      valid: number;
      errors: number;
      warnings: number;
      by_rule: Record<string, number>;
    }>('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (event) => {
        if (event.total) onProgress(Math.min(55, Math.round((event.loaded / event.total) * 55)), 'Uploading rows to the institutional validation service...');
      }
    });
    onProgress(75, 'Checking APAAR registry and cross-institution duplicates...');
    const result = response.data;
    const rulesEvaluated = Object.entries(result.by_rule || {}).map(([name, violatorCount]) => ({
      name,
      passed: false,
      violatorCount
    }));
    if (!rulesEvaluated.length) rulesEvaluated.push({ name: 'Row data validation', passed: true, violatorCount: 0 });
    onProgress(100, 'Batch processing complete.');
    return {
      fileName: file.name,
      fileSizeMb: parseFloat(fileSizeMb.toFixed(2)),
      totalRecords: result.total,
      passedRecords: result.valid,
      criticalErrors: result.errors,
      warningFlags: result.warnings,
      duplicateSuspects: result.by_rule?.DUP_CROSS_INSTITUTION || 0,
      rulesEvaluated,
      errors: []
    };
  },
  exportErrorsCsv(errors: UploadRowError[]): void {
    const headers = ['Row Number', 'Student Name', 'Masked APAAR ID', 'Roll Number', 'Department', 'Rule Violated', 'Severity', 'Description'];
    const rows = errors.map((error) => [error.rowNumber, `"${error.studentName}"`, error.maskedApaarId, error.rollNumber, `"${error.department}"`, `"${error.ruleViolated}"`, error.severity, `"${error.description.replace(/"/g, '""')}"`]);
    const url = URL.createObjectURL(new Blob([[headers.join(','), ...rows.map((row) => row.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `apaar_batch_validation_errors_${Date.now()}.csv`; link.click(); URL.revokeObjectURL(url);
  },
};
