import { VerificationSession, Student } from '../types';
import { validateVerhoeffChecksum, formatApaarId } from '../utils/apaarValidator';
import { maskApaarId } from '../utils/formatters';
import { INITIAL_STUDENTS } from '../data/mockData';
import { simulateLatency } from './apiClient';

let activeSessions: Record<string, VerificationSession> = {};

export const verificationService = {
  validateFormat(apaar: string): { isValidLength: boolean; isValidChecksum: boolean; cleanDigits: string } {
    const cleanDigits = apaar.replace(/\D/g, '');
    const isValidLength = cleanDigits.length === 12;
    const isValidChecksum = isValidLength ? validateVerhoeffChecksum(cleanDigits) : false;
    return { isValidLength, isValidChecksum, cleanDigits };
  },

  async startVerification(apaarInput: string): Promise<VerificationSession> {
    await simulateLatency(300);
    const { isValidLength, isValidChecksum, cleanDigits } = this.validateFormat(apaarInput);

    if (!isValidLength || !isValidChecksum) {
      throw new Error('Invalid APAAR ID format or Verhoeff checksum failure.');
    }

    const formatted = formatApaarId(cleanDigits);
    const sessionToken = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Match or create mock student
    const match = INITIAL_STUDENTS.find(
      (s) => s.apaarId === formatted || s.apaarId.replace(/\D/g, '') === cleanDigits
    );

    const session: VerificationSession = {
      apaarId: formatted,
      maskedApaarId: maskApaarId(formatted),
      studentName: match?.name || 'Aadhaar Verified Candidate',
      step: 'OTP_WAIT',
      attemptsLeft: 5,
      otpCountdown: 60,
      sessionToken
    };

    activeSessions[sessionToken] = session;
    return session;
  },

  async verifyOtp(sessionToken: string, otpCode: string): Promise<VerificationSession> {
    await simulateLatency(400);
    const session = activeSessions[sessionToken];
    if (!session) throw new Error('Verification session expired or invalid.');

    if (session.attemptsLeft <= 0) {
      session.step = 'FAILED';
      throw new Error('Maximum OTP verification attempts exceeded (5/5). Session locked for 15 minutes.');
    }

    // Default valid mock OTPs for test demo: '482910' or '123456' or any 6 digit starting with 1
    const isValidOtp = otpCode === '482910' || otpCode === '123456' || otpCode.length === 6;

    if (!isValidOtp) {
      session.attemptsLeft -= 1;
      if (session.attemptsLeft === 0) {
        session.step = 'FAILED';
      }
      throw new Error(`Incorrect 6-digit OTP code. ${session.attemptsLeft} attempts remaining.`);
    }

    // Check for simulated tampered case
    if (session.apaarId.includes('9999') || session.apaarId.includes('0000')) {
      session.step = 'TAMPERED';
      session.result = {
        verified: false,
        tamperReason: 'CRITICAL SECURITY ALERT: Cryptographic digital signature mismatch! Academic marksheet certificate hash has been altered.',
        timestamp: new Date().toLocaleString()
      };
      return session;
    }

    const studentMatch = INITIAL_STUDENTS.find((s) => s.apaarId === session.apaarId) || {
      id: 'STU-VERIFIED',
      apaarId: session.apaarId,
      maskedApaarId: session.maskedApaarId,
      name: session.studentName || 'Verified Candidate',
      dob: '2004-06-18',
      gender: 'Male',
      email: 'verified.student@institution.ac.in',
      phone: '+91 98112 00000',
      maskedPhone: '+91 98*** **000',
      rollNumber: '2024/ADM/771',
      institutionId: 'INST-DTU-01',
      institutionName: 'Delhi Technological University (DTU)',
      aictePermanentId: '1-432890123',
      program: 'B.Tech Computer Science & Engineering',
      department: 'Computer Science & Engineering',
      batchYear: '2024-2028',
      currentSemester: 2,
      quota: 'AICTE Sanctioned',
      verificationStatus: 'VERIFIED',
      aadhaarLinked: true,
      digiLockerSynced: true,
      abcAccountId: `ABC-${session.apaarId.slice(0, 4)}-8819`,
      abcCreditsEarned: 44,
      verificationTimestamp: new Date().toLocaleString(),
      avatarSeed: 'verified'
    };

    session.step = 'SUCCESS';
    session.result = {
      verified: true,
      student: studentMatch,
      digiLockerSignature: '0x9e4b7c1a82f304d9a184e6... [VALID W3C VC]',
      timestamp: new Date().toLocaleString()
    };

    return session;
  },

  async resendOtp(sessionToken: string): Promise<number> {
    await simulateLatency(250);
    const session = activeSessions[sessionToken];
    if (!session) throw new Error('Session invalid');
    session.otpCountdown = 60;
    return 60;
  }
};
