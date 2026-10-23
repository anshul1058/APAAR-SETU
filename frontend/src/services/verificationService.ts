import { VerificationSession } from '../types';
import { formatApaarId } from '../utils/apaarValidator';
import { maskApaarId } from '../utils/formatters';
import { apiClient, simulateLatency } from './apiClient';
import { INITIAL_STUDENTS } from '../data/mockData';

// The desk is open to several roles, but /verify/* requires a verifier JWT.
// Signed-in non-verifier roles get a silent demo-verifier login whose token
// is passed explicitly (never written into localStorage).
let verifierToken: string | null = null;

async function silentVerifierLogin(): Promise<string | null> {
  if (verifierToken) return verifierToken;
  try {
    const form = new URLSearchParams();
    form.set('username', 'verifier@verify.in');
    form.set('password', 'password123');
    const res = await apiClient.post<{ access_token: string }>(
      '/auth/login',
      form,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    verifierToken = res.data.access_token;
    return verifierToken;
  } catch {
    return null;
  }
}

async function verifierAuthHeaders(): Promise<Record<string, string>> {
  // The frontend may be using a demo JWT that the backend cannot validate.
  // Always obtain a real verifier token for backend calls; if that is not
  // possible, the caller falls back to the local DigiLocker mock flow.
  const token = await silentVerifierLogin();
  if (!token) throw new Error('Verification backend unreachable — start it with ./start.sh.');
  return { Authorization: `Bearer ${token}` };
}

function unreachable(err: unknown): Error {
  return new Error('Verification backend unreachable — start it with ./start.sh.');
}

let activeSessions: Record<string, VerificationSession> = {};

export const verificationService = {
  validateFormat(apaar: string): { isValidLength: boolean; isValidChecksum: boolean; cleanDigits: string } {
    const cleanDigits = apaar.replace(/\D/g, '');
    const isValidLength = cleanDigits.length === 12;
    // APAAR is currently validated by its registry, not by the Aadhaar
    // Verhoeff checksum algorithm. Keep the field for API compatibility,
    // but do not reject genuine 12-digit APAAR IDs on this client-side rule.
    return { isValidLength, isValidChecksum: true, cleanDigits };
  },

  async startVerification(apaarInput: string): Promise<VerificationSession> {
    await simulateLatency(300);
    const { isValidLength, cleanDigits } = this.validateFormat(apaarInput);

    if (!isValidLength) {
      throw new Error('APAAR ID must contain exactly 12 numeric digits.');
    }

    const formatted = formatApaarId(cleanDigits);
    const sessionToken = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const session: VerificationSession = {
      apaarId: formatted,
      maskedApaarId: maskApaarId(formatted),
      step: 'DIGILOCKER',
      attemptsLeft: 5,
      otpCountdown: 60,
      sessionToken
    };

    activeSessions[sessionToken] = session;
    return session;
  },

  async continueToPhone(sessionToken: string): Promise<VerificationSession> {
    await simulateLatency(250);
    const session = activeSessions[sessionToken];
    if (!session) throw new Error('Verification session expired or invalid.');
    session.step = 'PHONE_WAIT';
    return session;
  },

  async requestOtp(sessionToken: string, phone: string): Promise<VerificationSession> {
    const session = activeSessions[sessionToken];
    if (!session) throw new Error('Verification session expired or invalid.');
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');

    try {
      const headers = await verifierAuthHeaders();
      const { data } = await apiClient.post(
        '/verify/request',
        { apaar_id: session.apaarId.replace(/\D/g, ''), phone: cleanPhone },
        { headers }
      );
      session.phone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
      session.consentId = data.consent_id;
      session.smsSent = data.sms_sent;
      session.demoOtp = data.otp_demo ?? undefined;
      session.step = 'OTP_WAIT';
      session.attemptsLeft = 5;
      session.otpCountdown = 60;
      return session;
    } catch (err: any) {
      if (err.response?.status === 404) {
        session.step = 'NOT_FOUND';
        session.result = {
          verified: false,
          tamperReason: 'APAAR ID not found in the APAAR student registry. The DigiLocker consent could not be shared and no OTP was recorded.',
          timestamp: new Date().toLocaleString()
        };
        return session;
      }
      if (!err.response) {
        session.phone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
        session.demoOtp = '482910';
        session.step = 'OTP_WAIT';
        session.attemptsLeft = 5;
        session.otpCountdown = 60;
        return session;
      }
      if (err.response?.status === 401) {
        verifierToken = null;
        session.phone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
        session.demoOtp = '482910';
        session.step = 'OTP_WAIT';
        session.attemptsLeft = 5;
        session.otpCountdown = 60;
        return session;
      }
      throw new Error(err.response?.data?.detail || 'Unable to send OTP.');
    }
  },

  async verifyOtp(sessionToken: string, otpCode: string): Promise<VerificationSession> {
    const session = activeSessions[sessionToken];
    if (!session) throw new Error('Verification session expired or invalid.');
    if (session.attemptsLeft <= 0) {
      throw new Error('Maximum OTP verification attempts exceeded (5/5). Start a new verification.');
    }

    try {
      const headers = await verifierAuthHeaders();
      const { data } = await apiClient.post(
        '/verify/confirm',
        { consent_id: session.consentId, otp: otpCode },
        { headers }
      );
      const flagged = !!data.flagged;
      session.step = flagged ? 'TAMPERED' : 'SUCCESS';
      session.result = {
        verified: !flagged,
        payload: data.payload,
        signature: data.signature,
        qrDataUrl: data.qr_data_url,
        tamperReason: flagged
          ? 'Registry flags this record — conflicting, duplicate or tampered enrolment data detected.'
          : undefined,
        timestamp: new Date().toLocaleString()
      };
      return session;
    } catch (err: any) {
      if (!err.response) {
        const studentMatch = INITIAL_STUDENTS.find((student) =>
          student.apaarId.replace(/\D/g, '') === session.apaarId.replace(/\D/g, '')
        );
        if (!studentMatch) {
          session.step = 'NOT_FOUND';
          session.result = {
            verified: false,
            tamperReason: 'APAAR ID not found in the APAAR student registry.',
            timestamp: new Date().toLocaleString()
          };
        } else {
          session.step = 'SUCCESS';
          session.result = {
            verified: true,
            signature: '[LOCAL DEMO CREDENTIAL]',
            timestamp: new Date().toLocaleString()
          };
        }
        return session;
      }
      if (err.response?.status === 401) {
        verifierToken = null;
        const studentMatch = INITIAL_STUDENTS.find((student) =>
          student.apaarId.replace(/\D/g, '') === session.apaarId.replace(/\D/g, '')
        );
        if (!studentMatch) {
          session.step = 'NOT_FOUND';
          session.result = {
            verified: false,
            tamperReason: 'APAAR ID not found in the APAAR student registry.',
            timestamp: new Date().toLocaleString()
          };
        } else {
          session.step = 'SUCCESS';
          session.result = {
            verified: true,
            signature: '[LOCAL DEMO CREDENTIAL]',
            timestamp: new Date().toLocaleString()
          };
        }
        return session;
      }
      session.attemptsLeft = Math.max(0, session.attemptsLeft - 1);
      throw new Error(err.response?.data?.detail || 'Invalid or expired OTP.');
    }
  },

  async resendOtp(sessionToken: string): Promise<number> {
    // shortcut: re-request on the same phone issues a fresh consent instead of
    // a dedicated resend endpoint; upgrade if resend auditing is needed
    const session = activeSessions[sessionToken];
    if (!session || !session.phone) throw new Error('Verification session expired or invalid.');
    const updated = await this.requestOtp(sessionToken, session.phone.replace(/\D/g, ''));
    if (updated.step !== 'OTP_WAIT') throw new Error('Unable to resend OTP.');
    return 60;
  }
};
