import { Student, VerificationStatus, QuotaType, AicteProgramIntake } from '../types';
import { apiClient, simulateLatency } from './apiClient';
import { maskApaarId, maskPhone } from '../utils/formatters';

export interface StudentBatchRow {
  apaar_id: string;
  passport_no?: string;
  student_name: string;
  dob: string;
  gender?: string;
  roll_number: string;
  department: string;
  quota?: string;
  category?: string;
  nationality?: string;
  college?: string;
  program_level?: string;
  approved_intake?: string;
  approved_supernumerary?: string;
}

// The directory is populated by successful batch ingestion, not fixture data.
let localStudents: Student[] = [];
const localProgramIntake = new Map<string, AicteProgramIntake>();

const normalizeInstitutionName = (value: string): string => value
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]/g, '');

export interface StudentFilterParams {
  institutionName?: string;
  search?: string;
  status?: string;
  department?: string;
  quota?: string;
  page?: number;
  pageSize?: number;
  sortBy?: keyof Student;
  sortOrder?: 'asc' | 'desc';
}

interface BackendStudent {
  id: number;
  apaar_id: string | null;
  institution_id: number;
  course_id: number;
  student_code: string;
  full_name: string;
  dob: string | null;
  gender: string;
  category: string;
  quota_type: string;
  nationality: string;
  admission_date: string | null;
  status: string;
  course_name?: string;
  branch?: string;
  institution_name?: string;
  aicte_code?: string;
}

const toFrontendStudent = (student: BackendStudent): Student => {
  const apaarId = student.apaar_id || '';
  const quota = student.quota_type === 'regular'
    ? 'AICTE Sanctioned'
    : student.quota_type === 'nri' || student.quota_type === 'oci' || student.quota_type === 'fn'
      ? 'Management Quota'
      : 'State Quota';
  const verificationStatus: VerificationStatus = student.status === 'valid'
    ? 'VERIFIED'
    : student.status === 'flagged'
      ? 'DISCREPANCY_FLAGGED'
      : 'PENDING';

  return {
    id: String(student.id),
    apaarId,
    maskedApaarId: maskApaarId(apaarId),
    name: student.full_name,
    aadhaarName: student.full_name,
    dob: student.dob || '',
    gender: (student.gender || 'Other') as Student['gender'],
    email: '',
    phone: '',
    maskedPhone: maskPhone(''),
    rollNumber: student.student_code,
    institutionId: String(student.institution_id),
    institutionName: student.institution_name || '',
    aictePermanentId: student.aicte_code || '',
    program: student.course_name || student.branch || '',
    department: student.branch || student.course_name || '',
    batchYear: '',
    currentSemester: 0,
    quota: quota as Student['quota'],
    verificationStatus,
    aadhaarLinked: Boolean(apaarId),
    digiLockerSynced: verificationStatus === 'VERIFIED',
    abcAccountId: '',
    abcCreditsEarned: 0,
    verificationTimestamp: '',
    avatarSeed: student.full_name.toLowerCase().replace(/\s+/g, '')
  };
};

export const studentService = {
  ingestBatch(rows: StudentBatchRow[]): void {
    const imported = rows.map((row, index): Student => {
      const apaarId = row.apaar_id.trim();
      const quota = row.quota || 'regular';
      const studentId = `UPLOAD-${Date.now()}-${index}`;
      return {
        id: studentId,
        apaarId,
        maskedApaarId: maskApaarId(apaarId),
        name: row.student_name,
        aadhaarName: row.student_name,
        dob: row.dob,
        gender: (row.gender || 'Other') as Student['gender'],
        email: '',
        phone: '',
        maskedPhone: maskPhone(''),
        rollNumber: row.roll_number,
        institutionId: 'UPLOADED',
        institutionName: row.college || 'Uploaded institution',
        aictePermanentId: '',
        program: row.program_level || row.department,
        department: row.department,
        batchYear: '',
        currentSemester: 0,
        quota: quota as Student['quota'],
        verificationStatus: 'VERIFIED',
        aadhaarLinked: false,
        digiLockerSynced: false,
        abcAccountId: '',
        abcCreditsEarned: 0,
        verificationTimestamp: new Date().toISOString(),
        avatarSeed: row.student_name.toLowerCase().replace(/\s+/g, '')
      };
    });

    const importedKeys = new Set(imported.map((student) => `${student.institutionName}|${student.rollNumber}|${student.department}`));
    localStudents = [
      ...localStudents.filter((student) => !importedKeys.has(`${student.institutionName}|${student.rollNumber}|${student.department}`)),
      ...imported
    ];

    rows.forEach((row) => {
      const institutionName = row.college || 'Uploaded institution';
      const programCode = row.department;
      const key = `${institutionName}|${programCode}`;
      const current = localProgramIntake.get(key) || {
        programCode,
        programName: `${row.program_level ? `${row.program_level} ` : ''}${row.department}`,
        sanctionedIntake: Number(row.approved_intake) || 0,
        actualEnrolled: 0,
        apaarVerified: 0,
        pendingVerification: 0,
        discrepanciesCount: 0
      };
      current.actualEnrolled += 1;
      current.apaarVerified += 1;
      current.discrepanciesCount = Math.max(0, current.actualEnrolled - current.sanctionedIntake);
      localProgramIntake.set(key, current);
    });
    window.dispatchEvent(new Event('student-data-updated'));
  },

  getLocalInstitutionPrograms(institutionName: string): AicteProgramIntake[] {
    return [...localProgramIntake.entries()]
      .filter(([key]) => key.startsWith(`${institutionName}|`))
      .map(([, program]) => ({ ...program }));
  },

  async getStudents(params: StudentFilterParams = {}): Promise<{
    data: Student[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    await simulateLatency(250);

    const {
      institutionName = '',
      search = '',
      status = 'ALL',
      department = 'ALL',
      quota = 'ALL',
      page = 1,
      pageSize = 10,
      sortBy = 'name',
      sortOrder = 'asc'
    } = params;

    let sourceStudents = localStudents;
    let loadedFromBackend = false;
    try {
      const response = await apiClient.get<BackendStudent[]>('/students', {
        params: search ? { q: search } : undefined
      });
      sourceStudents = response.data.map(toFrontendStudent);
      loadedFromBackend = true;
    } catch {
      // Use locally ingested rows when the backend is unavailable or the
      // current session is still using the demo token.
    }

    let filtered = sourceStudents.filter((stu) => {
      // Institution-admin API responses are already scoped to the logged-in
      // institution. For fallback/demo data, compare normalized names so
      // punctuation such as &, commas, and parenthesis cannot empty a valid
      // directory when the frontend and backend label a college differently.
      const matchesInstitution = loadedFromBackend || !institutionName ||
        normalizeInstitutionName(stu.institutionName) === normalizeInstitutionName(institutionName);
      const q = search.toLowerCase();
      const matchesSearch =
        stu.name.toLowerCase().includes(q) ||
        stu.apaarId.includes(q) ||
        (stu.maskedApaarId && stu.maskedApaarId.includes(q)) ||
        stu.rollNumber.toLowerCase().includes(q) ||
        stu.email.toLowerCase().includes(q);

      const matchesStatus = status === 'ALL' || stu.verificationStatus === status;
      const matchesDept = department === 'ALL' || stu.department === department;
      const matchesQuota = quota === 'ALL' || stu.quota === quota;

      return matchesInstitution && matchesSearch && matchesStatus && matchesDept && matchesQuota;
    });

    // Sort
    filtered.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1
    };
  },

  async getStudentById(id: string): Promise<Student | null> {
    await simulateLatency(150);
    return localStudents.find((s) => s.id === id) || null;
  },

  async createStudent(studentData: Omit<Student, 'id' | 'maskedApaarId' | 'maskedPhone'>): Promise<Student> {
    await simulateLatency(300);
    const newStudent: Student = {
      ...studentData,
      id: `STU-2026-${String(localStudents.length + 1).padStart(3, '0')}`,
      maskedApaarId: maskApaarId(studentData.apaarId),
      maskedPhone: maskPhone(studentData.phone)
    };
    localStudents = [newStudent, ...localStudents];
    return newStudent;
  },

  async updateStudentStatus(id: string, status: VerificationStatus, note?: string): Promise<Student> {
    await simulateLatency(250);
    const index = localStudents.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Student not found');
    localStudents[index] = {
      ...localStudents[index],
      verificationStatus: status,
      discrepancyReason: note || localStudents[index].discrepancyReason
    };
    return localStudents[index];
  },

  exportStudentsCsv(data: Student[]): void {
    const headers = ['Student ID', 'Masked APAAR ID', 'Name', 'Department', 'Roll Number', 'Quota', 'ABC Credits', 'Status'];
    const rows = data.map((s) => [
      s.id,
      s.maskedApaarId,
      `"${s.name}"`,
      `"${s.department}"`,
      s.rollNumber,
      `"${s.quota}"`,
      s.abcCreditsEarned,
      s.verificationStatus
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aicte_students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
