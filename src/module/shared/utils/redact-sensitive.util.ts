const SENSITIVE_KEY_PATTERN =
  /password|secret|token|otp|pin|apikey|api_key|authorization/i;

const REDACTED = '***REDACTED***';

/**
 * Menyalin objek sambil menyamarkan nilai field yang namanya cocok dengan
 * pola data sensitif (password, OTP, token, secret, dst.) — dipakai sebelum
 * data request/response disimpan ke audit trail, supaya kredensial tidak
 * ikut tersimpan sebagai teks polos dan bisa dibaca lewat log audit.
 */
export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    const items = value as unknown[];
    return items.map((item) => redactSensitive(item)) as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : redactSensitive(val);
    }
    return result as T;
  }

  return value;
}
