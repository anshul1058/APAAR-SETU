import { UploadBatchSummary, UploadRowError } from '../types';
import { maskApaarId } from '../utils/formatters';
import { simulateLatency } from './apiClient';

const MAX_FILE_SIZE_MB = 10;

export const uploadService = {
  getTemplateCsv(): string {
    return `apaar_id,student_name,dob,gender,roll_number,department,quota
9042-3819-5502,Aarav Sharma,2004-04-12,Male,2023/CSE/042,Computer Science & Engineering,AICTE Sanctioned
9124-5820-1928,Rohan Verma,2003-11-28,Male,2024/CSE/118,Computer Science & Engineering,AICTE Sanctioned
7829-1049-3829,Priyanka Nair,2004-08-19,Female,2023/ECE/089,Electronics & Communication,State Quota
8491-2940-1092,Devendra Singh,2005-01-14,Male,2024/AIDS/023,Computer Science & Engineering,PMSSS (J&K Special)
8021-4912-7401,Ananya Sundaram,2003-06-25,Female,2022/ME/015,Mechanical Engineering,AICTE Sanctioned`;
  },

  downloadTemplate(): void {
    const csv = this.getTemplateCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aicte_apaar_student_batch_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async processUpload(
    file: File,
    onProgress: (pct: number, stage: string) => void
  ): Promise<UploadBatchSummary> {
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      throw new Error(`File size (${fileSizeMb.toFixed(1)} MB) exceeds the maximum allowed 10 MB limit.`);
    }

    onProgress(15, 'Inspecting file structure and parsing tabular rows...');
    await simulateLatency(400);

    onProgress(45, 'Executing Rule 1: Mathematical Verhoeff Checksum calculation...');
    await simulateLatency(400);

    onProgress(70, 'Executing Rule 2 & 3: Querying Central Registry for Concurrent Enrollments & Quotas...');
    await simulateLatency(400);

    onProgress(95, 'Synthesizing row-level discrepancy report...');
    await simulateLatency(300);

    onProgress(100, 'Batch processing complete!');

    const errors: UploadRowError[] = [
      {
        rowNumber: 14,
        studentName: 'Rohan Aditya Verma',
        apaarId: '9124-5820-1928',
        maskedApaarId: maskApaarId('9124-5820-1928'),
        rollNumber: '2024/CSE/118',
        department: 'Computer Science & Engineering',
        quota: 'AICTE Sanctioned',
        ruleViolated: 'Rule 3: Concurrent Multi-Institute Enrollment',
        severity: 'CRITICAL',
        description: 'Student is actively enrolled in B.Tech IT at SRM Institute Chennai (AICTE ID: 1-901849201).',
        status: 'FLAGGED'
      },
      {
        rowNumber: 28,
        studentName: 'Devendra Pratap Singh',
        apaarId: '8491-2940-1092',
        maskedApaarId: maskApaarId('8491-2940-1092'),
        rollNumber: '2024/AIDS/023',
        department: 'Computer Science & Engineering',
        quota: 'PMSSS (J&K Special)',
        ruleViolated: 'Rule 5: DOB & Aadhaar Consistency',
        severity: 'WARNING',
        description: 'Date of Birth (14-01-2005) differs from DigiLocker Aadhaar KYC (14-01-2004).',
        status: 'FLAGGED'
      },
      {
        rowNumber: 73,
        studentName: 'Amit Suresh Patil',
        apaarId: '1234-5678-9999',
        maskedApaarId: maskApaarId('1234-5678-9999'),
        rollNumber: '2024/ME/081',
        department: 'Mechanical Engineering',
        quota: 'Management Quota',
        ruleViolated: 'Rule 1: Verhoeff Checksum Accuracy',
        severity: 'CRITICAL',
        description: 'Dihedral group check digit calculation failed. Malformed APAAR identifier.',
        status: 'FLAGGED'
      },
      {
        rowNumber: 104,
        studentName: 'Mohd. Faisal Khan',
        apaarId: '7392-1049-5829',
        maskedApaarId: maskApaarId('7392-1049-5829'),
        rollNumber: '2023/EE/044',
        department: 'Electrical Engineering',
        quota: 'EWS Quota',
        ruleViolated: 'Rule 4: Valid Quota & Income Certificate',
        severity: 'WARNING',
        description: 'EWS income certificate validity period has lapsed. Resubmission required.',
        status: 'FLAGGED'
      }
    ];

    const summary: UploadBatchSummary = {
      fileName: file.name,
      fileSizeMb: parseFloat(fileSizeMb.toFixed(2)),
      totalRecords: 150,
      passedRecords: 146,
      criticalErrors: 2,
      warningFlags: 2,
      duplicateSuspects: 1,
      rulesEvaluated: [
        { name: 'Rule 1: Verhoeff Checksum Accuracy', passed: false, violatorCount: 1 },
        { name: 'Rule 2: AICTE Sanctioned Intake Cap', passed: true, violatorCount: 0 },
        { name: 'Rule 3: Concurrent Multi-Institute Check', passed: false, violatorCount: 1 },
        { name: 'Rule 4: Valid Quota / PMSSS Scheme', passed: false, violatorCount: 1 },
        { name: 'Rule 5: DOB & Aadhaar Consistency', passed: false, violatorCount: 1 }
      ],
      errors
    };

    return summary;
  },

  exportErrorsCsv(errors: UploadRowError[]): void {
    const headers = ['Row Number', 'Student Name', 'Masked APAAR ID', 'Roll Number', 'Department', 'Rule Violated', 'Severity', 'Description'];
    const rows = errors.map((e) => [
      e.rowNumber,
      `"${e.studentName}"`,
      e.maskedApaarId,
      e.rollNumber,
      `"${e.department}"`,
      `"${e.ruleViolated}"`,
      e.severity,
      `"${e.description.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `apaar_batch_validation_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
