import { Institution, DuplicateCase } from '../types';
import { AICTE_INSTITUTIONS, INITIAL_DUPLICATES } from '../data/mockData';
import { simulateLatency } from './apiClient';

let localInstitutions: Institution[] = [...AICTE_INSTITUTIONS];
let localDuplicates: DuplicateCase[] = [...INITIAL_DUPLICATES];

export const institutionService = {
  async getInstitutions(search = '', region = 'ALL', category = 'ALL'): Promise<Institution[]> {
    await simulateLatency(250);
    return localInstitutions.filter((inst) => {
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
    await simulateLatency(200);
    return localInstitutions.find((i) => i.id === id || i.code === id) || null;
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
