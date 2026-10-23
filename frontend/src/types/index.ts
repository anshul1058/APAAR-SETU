export type UserRole = 
  | 'institution_admin' 
  | 'aicte_officer' 
  | 'aicte_admin' 
  | 'verifier';

export type VerificationStatus = 
  | 'VERIFIED' 
  | 'DISCREPANCY_FLAGGED' 
  | 'DUPLICATE_SUSPECT' 
  | 'PENDING' 
  | 'REJECTED'
  | 'TAMPER_ALERT';

export type QuotaType = 
  | 'AICTE Sanctioned' 
  | 'State Quota' 
  | 'Management Quota' 
  | 'PMSSS (J&K Special)' 
  | 'Lateral Entry' 
  | 'EWS Quota';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionName: string;
  aicteId: string;
  avatarSeed?: string;
}

export interface Student {
  id: string;
  apaarId: string; // Full 12-digit format: XXXX-XXXX-XXXX
  maskedApaarId?: string; // Masked: XXXX-****-XXXX
  name: string;
  aadhaarName?: string;
  dob: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  phone: string;
  maskedPhone?: string;
  rollNumber: string;
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  program: string;
  department: string;
  batchYear: string;
  currentSemester: number;
  quota: QuotaType;
  verificationStatus: VerificationStatus;
  aadhaarLinked: boolean;
  digiLockerSynced: boolean;
  abcAccountId: string;
  abcCreditsEarned: number;
  verificationTimestamp: string;
  discrepancyReason?: string;
  anomalyScore?: number;
  avatarSeed: string;
}

export interface DuplicateCase {
  id: string;
  studentName: string;
  apaarId: string;
  maskedApaarId: string;
  primaryInstitution: {
    id: string;
    name: string;
    course: string;
    admissionYear: number;
    state: string;
    aicteId: string;
  };
  conflictingInstitution: {
    id: string;
    name: string;
    course: string;
    admissionYear: number;
    state: string;
    aicteId: string;
  };
  flagType: 'SIMULTANEOUS_FULLTIME_ENROLLMENT' | 'NAME_DOB_MISMATCH' | 'GHOST_STUDENT_SUSPECT' | 'CREDIT_LEAKAGE';
  anomalyScore: number;
  detectionDate: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'UNDER_REVIEW' | 'SHOW_CAUSE_ISSUED' | 'NOC_REQUESTED' | 'RESOLVED_CANCELLED' | 'RESOLVED_VERIFIED';
  actionHistory: {
    date: string;
    action: string;
    performedBy: string;
    notes: string;
  }[];
}

export interface AicteProgramIntake {
  programCode: string;
  programName: string;
  sanctionedIntake: number;
  actualEnrolled: number;
  apaarVerified: number;
  pendingVerification: number;
  discrepanciesCount: number;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  aictePermanentId: string;
  region: string;
  state: string;
  city: string;
  category: string;
  totalSanctionedIntake: number;
  totalEnrolled: number;
  apaarVerifiedCount: number;
  verificationRate: number;
  anomalyScore: number;
  anomalySummary: string;
  duplicateAlerts?: number;
  complianceStatus: 'COMPLIANT' | 'NEEDS_INSPECTION' | 'CRITICAL_REVIEW';
  facultyStudentRatio: string;
  programs: AicteProgramIntake[];
}

export interface UploadRowError {
  rowNumber: number;
  studentName: string;
  apaarId: string;
  maskedApaarId: string;
  rollNumber: string;
  department: string;
  quota: string;
  ruleViolated: string;
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  status: 'FLAGGED' | 'RESOLVED' | 'IGNORED';
}

export interface UploadBatchSummary {
  fileName: string;
  fileSizeMb: number;
  totalRecords: number;
  passedRecords: number;
  criticalErrors: number;
  warningFlags: number;
  duplicateSuspects: number;
  rulesEvaluated: {
    name: string;
    passed: boolean;
    violatorCount: number;
  }[];
  errors: UploadRowError[];
}

export interface VerificationSession {
  apaarId: string;
  maskedApaarId: string;
  studentName?: string;
  phone?: string;
  consentId?: number;
  smsSent?: boolean;
  demoOtp?: string;
  step: 'INPUT' | 'DIGILOCKER' | 'PHONE_WAIT' | 'OTP_WAIT' | 'SUCCESS' | 'FAILED' | 'TAMPERED' | 'NOT_FOUND';
  attemptsLeft: number;
  otpCountdown: number;
  sessionToken: string;
  result?: {
    verified: boolean;
    tamperReason?: string;
    payload?: {
      apaar_id: string;
      institution: string;
      course: string;
      academic_year: string;
      status: string;
      issued_at: string;
    };
    signature?: string;
    qrDataUrl?: string;
    timestamp: string;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  targetApaarId: string;
  studentName?: string;
  performedBy: string;
  role: string;
  status: 'SUCCESS' | 'FLAGGED' | 'WARNING';
  sha256Hash: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  category?: 'validation_flag' | 'dashboard_query' | 'report_summary';
  relatedEntityId?: string;
}
