/**
 * รับเฉพาะ path ภายในเว็บเรา (เช่น "/dashboard") กันการถูกหลอกให้ redirect ไปเว็บอื่น
 * ปฏิเสธ "//evil.com", "/\evil.com", "https://evil.com"
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
