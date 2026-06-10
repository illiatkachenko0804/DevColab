/**
 * Mirrors the backend PasswordPolicy so the live strength meter matches what
 * the server will accept. The server remains the source of truth.
 */

export type Strength = "weak" | "medium" | "strong";

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

const COMMON = new Set([
  "password", "passw0rd", "password1", "qwerty", "qwerty123", "123456",
  "12345678", "123456789", "111111", "abc123", "letmein", "welcome",
  "admin", "iloveyou", "monkey", "dragon", "football", "login",
  "starwars", "master", "hello", "freedom", "whatever", "trustno1",
]);

const hasLower = (p: string) => /[a-z]/.test(p);
const hasUpper = (p: string) => /[A-Z]/.test(p);
const hasDigit = (p: string) => /[0-9]/.test(p);
const hasSymbol = (p: string) => /[^A-Za-z0-9\s]/.test(p);
const hasSpace = (p: string) => /\s/.test(p);

function hasRepeat(p: string): boolean {
  for (let i = 0; i + 2 < p.length; i++) {
    if (p[i] === p[i + 1] && p[i + 1] === p[i + 2]) return true;
  }
  return false;
}

function hasSequential(p: string): boolean {
  for (let i = 0; i + 2 < p.length; i++) {
    const a = p.charCodeAt(i), b = p.charCodeAt(i + 1), c = p.charCodeAt(i + 2);
    if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) return true;
  }
  return false;
}

function hasKeyboardRun(p: string): boolean {
  const lower = p.toLowerCase();
  for (let i = 0; i + 2 < lower.length; i++) {
    const sub = lower.slice(i, i + 3);
    const rev = sub.split("").reverse().join("");
    if (KEYBOARD_ROWS.some((row) => row.includes(sub) || row.includes(rev))) return true;
  }
  return false;
}

function isCommon(p: string): boolean {
  const lower = p.toLowerCase();
  return COMMON.has(lower) || lower.includes("password") || lower.includes("qwerty");
}

export interface PwCheck {
  id: string;
  label: string;
  ok: boolean;
}

export interface PwResult {
  valid: boolean;
  strength: Strength;
  checks: PwCheck[];
}

export function strengthOf(p: string): Strength {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (p.length >= 16) score++;
  if (hasLower(p)) score++;
  if (hasUpper(p)) score++;
  if (hasDigit(p)) score++;
  if (hasSymbol(p)) score++;
  if (hasRepeat(p) || hasSequential(p) || hasKeyboardRun(p) || isCommon(p)) {
    score = Math.min(score, 3);
  }
  if (score <= 3) return "weak";
  if (score <= 5) return "medium";
  return "strong";
}

export function evaluatePassword(p: string): PwResult {
  const checks: PwCheck[] = [
    { id: "len", label: "12+ characters", ok: p.length >= 12 },
    { id: "lower", label: "Lowercase letter", ok: hasLower(p) },
    { id: "upper", label: "Uppercase letter", ok: hasUpper(p) },
    { id: "digit", label: "Number", ok: hasDigit(p) },
    { id: "symbol", label: "Symbol", ok: hasSymbol(p) },
    { id: "space", label: "No spaces", ok: p.length > 0 && !hasSpace(p) },
    { id: "repeat", label: "No 3 repeats (aaa)", ok: p.length > 0 && !hasRepeat(p) },
    { id: "seq", label: "No sequences (abc, 123)", ok: p.length > 0 && !hasSequential(p) },
    { id: "kbd", label: "No keyboard runs (qwe)", ok: p.length > 0 && !hasKeyboardRun(p) },
    { id: "common", label: "Not a common password", ok: p.length > 0 && !isCommon(p) },
  ];
  const strength = strengthOf(p);
  // Hard rules: 8+ chars, all classes, no whitespace/repeat/sequence/keyboard/common.
  const hardOk =
    p.length >= 8 &&
    hasLower(p) && hasUpper(p) && hasDigit(p) && hasSymbol(p) &&
    !hasSpace(p) && !hasRepeat(p) && !hasSequential(p) && !hasKeyboardRun(p) && !isCommon(p);
  return { valid: hardOk && strength === "strong", strength, checks };
}
