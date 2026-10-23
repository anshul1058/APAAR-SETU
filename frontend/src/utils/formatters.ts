// Format dates as DD MMM YYYY (e.g. 22 Oct 2026)
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      // In case date string is already in formatted style, return as is
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

// Thousands separator for numbers (e.g. 12,480)
export function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '0';
  const val = Number(num);
  if (isNaN(val)) return String(num);
  return val.toLocaleString('en-IN');
}

// Mask APAAR ID: 9042-3819-5502 -> 9042-****-5502
export function maskApaarId(apaarId: string | undefined | null): string {
  if (!apaarId) return '••••-••••-••••';
  const clean = apaarId.replace(/\D/g, '');
  if (clean.length < 12) return '••••-••••-••••';
  return `${clean.slice(0, 4)}-****-${clean.slice(8, 12)}`;
}

// Mask Phone: +91 98112 45901 -> +91 98*** **901
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '+91 ••••• •••••';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.length < 10) return '+91 ••••• •••••';
  return `${clean.slice(0, 5)}*** **${clean.slice(-3)}`;
}

// Mask Aadhaar: 1234 5678 9012 -> XXXX-XXXX-9012
export function maskAadhaar(aadhaar: string | undefined | null): string {
  if (!aadhaar) return 'XXXX-XXXX-••••';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 12) return 'XXXX-XXXX-••••';
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

// Mask Email: aarav.sharma@dtu.ac.in -> aa***@dtu.ac.in
export function maskEmail(email: string | undefined | null): string {
  if (!email || !email.includes('@')) return '••••@••••.ac.in';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}
