import { Student, VerificationStatus, QuotaType } from '../types';
import { INITIAL_STUDENTS } from '../data/mockData';
import { simulateLatency } from './apiClient';
import { maskApaarId, maskPhone } from '../utils/formatters';

let localStudents: Student[] = [...INITIAL_STUDENTS];

export interface StudentFilterParams {
  search?: string;
  status?: string;
  department?: string;
  quota?: string;
  page?: number;
  pageSize?: number;
  sortBy?: keyof Student;
  sortOrder?: 'asc' | 'desc';
}

export const studentService = {
  async getStudents(params: StudentFilterParams = {}): Promise<{
    data: Student[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    await simulateLatency(250);

    const {
      search = '',
      status = 'ALL',
      department = 'ALL',
      quota = 'ALL',
      page = 1,
      pageSize = 10,
      sortBy = 'name',
      sortOrder = 'asc'
    } = params;

    let filtered = localStudents.filter((stu) => {
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

      return matchesSearch && matchesStatus && matchesDept && matchesQuota;
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
