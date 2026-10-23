import { UserProfile, UserRole } from '../types';
import { apiClient, simulateLatency } from './apiClient';

const TOKEN_KEY = 'apaar_auth_token';
const USER_KEY = 'apaar_auth_user';

export const ROLE_HOME_PATHS: Record<UserRole, string> = {
  institution_admin: '/institution/dashboard',
  aicte_officer: '/aicte/dashboard',
  aicte_admin: '/aicte/admin',
  verifier: '/verifier/portal'
};

export const ROLE_PRESETS: { email: string; role: UserRole; name: string; org: string; aicteId: string }[] = [
  {
    email: 'admin@dtu.ac.in',
    role: 'institution_admin',
    name: 'Dr. Rajiv Menon (Registrar)',
    org: 'Delhi Technological University (DTU)',
    aicteId: '1-432890123'
  },
  {
    email: 'officer.north@aicte-india.org',
    role: 'aicte_officer',
    name: 'Dr. Anita Verma (Regional Officer)',
    org: 'AICTE Northern Regional Inspection Cell',
    aicteId: 'AICTE-RO-NORTH'
  },
  {
    email: 'admin.director@aicte-india.org',
    role: 'aicte_admin',
    name: 'Prof. T. G. Sitharam (AICTE Chairman Desk)',
    org: 'AICTE Apex Council & Regulatory Headquarters',
    aicteId: 'AICTE-HQ-CENTRAL'
  },
  {
    email: 'verifier.desk@dtu.ac.in',
    role: 'verifier',
    name: 'K. S. Sundaram (Verification Officer)',
    org: 'DTU Central Academic & Admission Desk',
    aicteId: '1-432890123/VERIF'
  }
];

// Helper to generate simulated mock JWT token
function createMockJwt(user: UserProfile): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      aicteId: user.aicteId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    })
  );
  const signature = btoa('mock-sih-2026-sha256-signature');
  return `${header}.${payload}.${signature}`;
}

export const authService = {
  async login(email: string, role?: UserRole): Promise<{ user: UserProfile; token: string }> {
    await simulateLatency(400);

    // Find preset or create dynamic profile
    const preset = ROLE_PRESETS.find((p) => p.email.toLowerCase() === email.toLowerCase()) || 
                   ROLE_PRESETS.find((p) => p.role === role) || 
                   ROLE_PRESETS[0];

    const actualRole: UserRole = role || preset.role;

    const user: UserProfile = {
      id: `USR-${Date.now()}`,
      name: preset.name,
      email: email || preset.email,
      role: actualRole,
      institutionName: preset.org,
      aicteId: preset.aicteId,
      avatarSeed: preset.name.split(' ')[0]
    };

    const token = createMockJwt(user);

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { user, token };
  },

  getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getDefaultPathForRole(role: UserRole): string {
    return ROLE_HOME_PATHS[role] || '/institution/dashboard';
  }
};
