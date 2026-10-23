import { AiChatMessage } from '../types';
import { simulateLatency } from './apiClient';

export const aiAssistantService = {
  async getResponse(prompt: string, context?: { page?: string; entityId?: string }): Promise<string> {
    await simulateLatency(500);

    const p = prompt.toLowerCase();

    // 1. Explaining validation flags
    if (p.includes('explain') || p.includes('flag') || p.includes('duplicate') || p.includes('why')) {
      if (p.includes('9124') || p.includes('rohan') || p.includes('concurrent') || p.includes('srm')) {
        return `**AI Anomaly Explanation for Flag #DUP-2026-891 (Student: Rohan Verma):**
- **Violation:** Section 4.2 of the AICTE Approval Process Handbook (APH 2026-27) prohibits concurrent full-time degree enrollment.
- **Evidence:** APAAR ID \`9124-****-1928\` is registered simultaneously in B.Tech CSE (Regular) at Delhi Technological University (DTU) and B.Tech IT at SRM Institute Chennai.
- **Anomaly Score:** 94 / 100 (Critical).
- **Recommended Action:** Issue an official AICTE Show-Cause Notice requiring submission of an institutional migration certificate or seat relinquishment within 7 working days.`;
      }

      if (p.includes('verhoeff') || p.includes('checksum') || p.includes('malformed')) {
        return `**AI Explanation — Verhoeff Checksum Failure:**
- The 12th digit of an APAAR ID is calculated using the Dihedral Group $D_5$ permutation algorithm.
- Single-digit typos and adjacent transposition errors (e.g., swapping 42 to 24) are detected with 100% mathematical certainty.
- The input string failed the dihedral check, which indicates either an accidental digit transposition or an invalid simulated test number.`;
      }

      return `**AI Analysis of Flagged Discrepancy:**
The central verification engine identified a conflict between the institutional record and the DigiLocker Aadhaar KYC repository. Typical causes include:
1. Mismatched spelling between 10th Board certificate and Aadhaar.
2. Single-digit date of birth disparity.
3. Lack of student consent token for DigiLocker synchronization.
Resolution: Request the candidate to update their Aadhaar portal or provide a verified affidavit to the academic registrar.`;
    }

    // 2. Answering dashboard questions
    if (p.includes('intake') || p.includes('quota') || p.includes('matrix') || p.includes('seat')) {
      return `**AI Institutional Seat Matrix Guide (AICTE Guidelines 2026):**
- **Sanctioned Quota (85%):** Centralized state/national counseling merit list.
- **Management Quota (15% Cap):** Must adhere strictly to qualifying exam merit cutoffs.
- **Lateral Entry (+10% Supernumerary):** Direct admission to 2nd year for diploma holders.
- **PMSSS (Supernumerary):** Prime Minister's Special Scholarship Scheme seats for Jammu & Kashmir and Ladakh students do not consume general sanctioned intake capacity.`;
    }

    // 3. Generating report summaries
    if (p.includes('summary') || p.includes('report') || p.includes('audit') || p.includes('generate')) {
      return `**AI Executive Summary — Institutional APAAR Verification Audit (Cycle 2026-27):**
- **Institution:** Delhi Technological University (DTU, New Delhi)
- **Sanctioned Capacity:** 930 UG Seats
- **Active Enrollments:** 916 Students (98.5% occupancy)
- **APAAR Verification Adherence:** 873 Verified (95.3%)
- **ABC Credit Synchronization:** 62,480 NEP credits securely deposited in National Academic Depository.
- **Compliance Grade:** **A+ (Exemplary)**.
- **Outstanding Items:** 3 duplicate cross-institution alerts currently under show-cause notice. Overall risk to institutional AICTE grant funding is low.`;
    }

    // Default general assistant response
    return `**AICTE Virtual Assistant (SIH Problem Statement 26263):**
I can assist you with:
- **Explaining validation flags & anomaly scores** for any candidate or batch error.
- **Explaining AICTE seat matrix guidelines**, PMSSS supernumerary rules, and ABC credit transfers under NEP 2020.
- **Drafting executive compliance summaries** for institutional audit dossiers.

How can I assist your verification workflow today?`;
  }
};
