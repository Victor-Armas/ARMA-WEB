export function getWhatsAppUrl(phone: string): string | null {
  const normalized = phone.trim();
  if (!/^[+\d\s().-]+$/.test(normalized)) return null;

  const digits = normalized.replace(/\D/g, "");
  const international = normalized.startsWith("+")
    ? digits
    : normalized.startsWith("00")
      ? digits.slice(2)
      : digits.length === 10
        ? `52${digits}`
        : digits.length === 12 && digits.startsWith("52")
          ? digits
          : null;

  if (!international || !/^[1-9]\d{7,14}$/.test(international)) return null;
  return `https://wa.me/${international}`;
}
