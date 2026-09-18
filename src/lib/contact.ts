import { Linking } from "react-native";

export function sanitizePhone(raw?: string): string {
  return (raw || "").replace(/[^\d+]/g, "");
}

export function hasPhone(raw?: string): boolean {
  return sanitizePhone(raw).replace(/\D/g, "").length >= 6;
}

export async function callNumber(raw?: string): Promise<boolean> {
  const p = sanitizePhone(raw);
  if (!p) return false;
  try {
    await Linking.openURL(`tel:${p}`);
    return true;
  } catch {
    return false;
  }
}

// wa.me needs a country-coded number without '+'. Assume India (+91) for bare
// 10-digit numbers, which is what the CRM data uses.
export function waNumber(raw?: string): string {
  let p = sanitizePhone(raw).replace(/^\+/, "").replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return p;
}

export async function openWhatsApp(raw?: string, text?: string): Promise<boolean> {
  const p = waNumber(raw);
  if (!p) return false;
  const url = `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
