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
    email: 'aicte.officer@gov.in',
    role: 'aicte_officer',
    name: 'Dr. Anita Verma (Regional Officer)',
    org: 'AICTE Northern Regional Inspection Cell',
    aicteId: 'AICTE-RO-NORTH'
  },
  {
    email: 'aicte.admin@gov.in',
    role: 'aicte_admin',
    name: 'Prof. T. G. Sitharam (AICTE Chairman Desk)',
    org: 'AICTE Apex Council & Regulatory Headquarters',
    aicteId: 'AICTE-HQ-CENTRAL'
  },
  {
    email: 'verifier@verify.in',
    role: 'verifier',
    name: 'K. S. Sundaram (Verification Officer)',
    org: 'DTU Central Academic & Admission Desk',
    aicteId: '1-432890123/VERIF'
  }
];

// Institution-admin profiles mirror the ten college accounts created by the
// backend seed script. They are used to hydrate the header with the selected
// college instead of falling back to the DTU demo profile.
export const INSTITUTION_ADMIN_PRESETS: { email: string; role: UserRole; name: string; org: string; aicteId: string }[] = [
  {
    email: 'admin@coep_technological_university.in',
    role: 'institution_admin',
    name: 'COEP Institution Administrator',
    org: 'COEP Technological University',
    aicteId: 'IC-0001'
  },
  {
    email: 'admin@dr_d_y_patil_college_of_engineering_dypcoe.in',
    role: 'institution_admin',
    name: 'DYPCOE Institution Administrator',
    org: 'Dr. D. Y. Patil College of Engineering (DYPCOE)',
    aicteId: 'IC-0002'
  },
  {
    email: 'admin@dr_d_y_patil_institute_of_technology_dypit.in',
    role: 'institution_admin',
    name: 'DYPIT Institution Administrator',
    org: 'Dr. D. Y. Patil Institute of Technology (DYPIT)',
    aicteId: 'IC-0003'
  },
  {
    email: 'admin@mit_academy_of_engineering_mitaoe.in',
    role: 'institution_admin',
    name: 'MITAOE Institution Administrator',
    org: 'MIT Academy of Engineering (MITAOE)',
    aicteId: 'IC-0004'
  },
  {
    email: 'admin@mit_arts_commerce_science_college_mit_acsc.in',
    role: 'institution_admin',
    name: 'MIT ACSC Institution Administrator',
    org: 'MIT Arts, Commerce & Science College (MIT ACSC)',
    aicteId: 'IC-0005'
  },
  {
    email: 'admin@mksss_s_cummins_college_of_engineering_for_women.in',
    role: 'institution_admin',
    name: 'Cummins College Institution Administrator',
    org: "MKSSS's Cummins College of Engineering for Women",
    aicteId: 'IC-0006'
  },
  {
    email: 'admin@mmcoe.in',
    role: 'institution_admin',
    name: 'MMCOE Institution Administrator',
    org: 'MMCOE',
    aicteId: 'IC-0007'
  },
  {
    email: 'admin@pune_institute_of_computer_technology_pict.in',
    role: 'institution_admin',
    name: 'PICT Institution Administrator',
    org: 'Pune Institute of Computer Technology (PICT)',
    aicteId: 'IC-0008'
  },
  {
    email: 'admin@rmd_sinhgad_technical_institutes_campus.in',
    role: 'institution_admin',
    name: 'RMD Sinhgad Institution Administrator',
    org: 'RMD Sinhgad Technical Institutes Campus',
    aicteId: 'IC-0009'
  },
  {
    email: 'admin@zeal_college_of_engineering_and_research_zcoer.in',
    role: 'institution_admin',
    name: 'ZCOER Institution Administrator',
    org: 'Zeal College of Engineering and Research (ZCOER)',
    aicteId: 'IC-0010'
  }
];

const ALL_PRESETS = [...ROLE_PRESETS, ...INSTITUTION_ADMIN_PRESETS];

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
  async login(email: string, role?: UserRole, password = 'password123'): Promise<{ user: UserProfile; token: string }> {
    await simulateLatency(400);

    const preset = ALL_PRESETS.find((p) => p.email.toLowerCase() === email.toLowerCase()) ||
      ROLE_PRESETS.find((p) => p.role === role) || ROLE_PRESETS[0];

    // Use the real backend JWT whenever the account exists in the database.
    // Demo-only profiles continue to work through the local fallback below.
    try {
      const form = new URLSearchParams();
      form.set('username', email);
      form.set('password', password);
      const response = await apiClient.post<{ access_token: string; role: UserRole; institution_id?: number }>(
        '/auth/login',
        form,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const actualRole = response.data.role;
      const user: UserProfile = {
        id: String(response.data.institution_id || `USR-${Date.now()}`),
        name: preset.name,
        email,
        role: actualRole,
        institutionName: preset.org,
        aicteId: preset.aicteId,
        avatarSeed: preset.name.split(' ')[0]
      };
      localStorage.setItem(TOKEN_KEY, response.data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user, token: response.data.access_token };
    } catch (error: any) {
      // Do not convert rejected backend credentials into a fake JWT. That
      // token cannot be accepted by protected API routes and causes a
      // misleading "session expired" redirect. Keep the local fallback only
      // for an unavailable backend.
      if (error?.response) {
        throw error;
      }
    }

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
