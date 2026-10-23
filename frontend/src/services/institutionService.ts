import { Institution, DuplicateCase, ErpConfig, ErpCrossCheckReport } from '../types';
import { INITIAL_DUPLICATES } from '../data/mockData';
import { apiClient, simulateLatency } from './apiClient';

let localDuplicates: DuplicateCase[] = [...INITIAL_DUPLICATES];

interface InstitutionApiRecord {
  id: string;
  name: string;
  code: string;
  aicte_permanent_id: string;
  region: string;
  state: string;
  city: string | null;
  category: string;
  total_sanctioned_intake: number;
  total_enrolled: number;
  apaar_verified_count: number;
  verification_rate: number;
  anomaly_score: number;
  anomaly_summary: string;
  duplicate_alerts: number;
  compliance_status: Institution['complianceStatus'];
  faculty_student_ratio: string;
  programs: Array<{
    program_code: string;
    program_name: string;
    sanctioned_intake: number;
    additional_seats?: number;
    actual_enrolled: number;
    apaar_verified: number;
    pending_verification: number;
    discrepancies_count: number;
  }>;
}

/** Extract a human-readable message from an axios/FastAPI error. */
const errDetail = (err: unknown): string => {
  const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
  return anyErr?.response?.data?.detail || anyErr?.message || 'Request failed';
};

const toInstitution = (record: InstitutionApiRecord): Institution => ({
  id: record.id,
  name: record.name,
  code: record.code,
  aictePermanentId: record.aicte_permanent_id,
  region: record.region,
  state: record.state,
  city: record.city || record.state,
  category: record.category,
  totalSanctionedIntake: record.total_sanctioned_intake,
  totalEnrolled: record.total_enrolled,
  apaarVerifiedCount: record.apaar_verified_count,
  verificationRate: record.verification_rate,
  anomalyScore: record.anomaly_score,
  anomalySummary: record.anomaly_summary,
  duplicateAlerts: record.duplicate_alerts,
  complianceStatus: record.compliance_status,
  facultyStudentRatio: record.faculty_student_ratio,
  programs: record.programs.map((program) => ({
    programCode: program.program_code,
    programName: program.program_name,
    sanctionedIntake: program.sanctioned_intake,
    additionalSeats: program.additional_seats || 0,
    actualEnrolled: program.actual_enrolled,
    apaarVerified: program.apaar_verified,
    pendingVerification: program.pending_verification,
    discrepanciesCount: program.discrepancies_count,
  })),
});

export const institutionService = {
  async getInstitutions(search = '', region = 'ALL', category = 'ALL'): Promise<Institution[]> {
    const response = await apiClient.get<InstitutionApiRecord[]>('/dashboard/institutions');
    const institutions = response.data.map(toInstitution);

    return institutions.filter((inst) => {
      const q = search.toLowerCase();
      const matchesSearch =
        inst.name.toLowerCase().includes(q) ||
        inst.code.toLowerCase().includes(q) ||
        inst.city.toLowerCase().includes(q) ||
        inst.aictePermanentId.includes(q);

      const matchesRegion = region === 'ALL' || inst.region === region;
      const matchesCategory = category === 'ALL' || inst.category === category;

      return matchesSearch && matchesRegion && matchesCategory;
    });
  },

  async getInstitutionById(id: string): Promise<Institution | null> {
    const institutions = await this.getInstitutions();
    return institutions.find((i) => i.id === id || i.code === id) || null;
  },

  async getDuplicates(): Promise<DuplicateCase[]> {
    await simulateLatency(250);
    return [...localDuplicates];
  },

  async resolveDuplicate(caseId: string, action: string, notes: string): Promise<DuplicateCase> {
    await simulateLatency(300);
    const index = localDuplicates.findIndex((d) => d.id === caseId);
    if (index === -1) throw new Error('Duplicate case not found');
    localDuplicates[index] = {
      ...localDuplicates[index],
      status: 'RESOLVED_VERIFIED',
      actionHistory: [
        {
          date: new Date().toLocaleString(),
          action,
          performedBy: 'Authorized Officer',
          notes
        },
        ...localDuplicates[index].actionHistory
      ]
    };
    return localDuplicates[index];
  },

  // ---------------------------------------------------- ERP integration (PRD F7)
  // The API key is entered once, stored encrypted on the server, and is never
  // returned — only a masked hint (********XXXX) comes back.

  async getErpConfig(): Promise<ErpConfig> {
    const response = await apiClient.get<ErpConfig>('/institutions/me/erp');
    return response.data;
  },

  async saveErpConfig(erpBaseUrl: string, erpApiKey: string): Promise<ErpConfig> {
    try {
      const response = await apiClient.put<ErpConfig>('/institutions/me/erp', {
        erp_base_url: erpBaseUrl,
        erp_api_key: erpApiKey,
      });
      return response.data;
    } catch (err) {
      throw new Error(errDetail(err));
    }
  },

  async disconnectErp(): Promise<ErpConfig> {
    try {
      const response = await apiClient.delete<ErpConfig>('/institutions/me/erp');
      return response.data;
    } catch (err) {
      throw new Error(errDetail(err));
    }
  },

  async runErpCrossCheck(): Promise<ErpCrossCheckReport> {
    try {
      const response = await apiClient.post<ErpCrossCheckReport>('/institutions/me/erp/cross-check');
      return response.data;
    } catch (err) {
      throw new Error(errDetail(err));
    }
  },

  exportInstitutionsCsv(data: Institution[]): void {
    const headers = ['Institution Name', 'AICTE Permanent ID', 'Region', 'State', 'Sanctioned Intake', 'Enrolled', 'Verified Rate %', 'Anomaly Score', 'Compliance Status'];
    const rows = data.map((i) => [
      `"${i.name}"`,
      i.aictePermanentId,
      i.region,
      i.state,
      i.totalSanctionedIntake,
      i.totalEnrolled,
      i.verificationRate,
      i.anomalyScore,
      i.complianceStatus
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aicte_institutions_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
