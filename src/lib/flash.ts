import "server-only";
import { cookies } from "next/headers";

/**
 * ข้อความแจ้งผลหลังบันทึก ("สำเร็จ" / "เกิดข้อผิดพลาด")
 *
 * ส่งผ่าน cookie อายุสั้นแทนการต่อท้าย URL (?message=...) เพื่อให้ URL สะอาด
 * ขั้นตอน: Server Action เรียก setFlash() → redirect() → layout อ่านด้วย readFlash()
 *         → FlashDialog แสดงกล่องแล้วลบ cookie ทิ้ง (แสดงครั้งเดียว)
 */
export const FLASH_COOKIE = "flash";

export type Flash = { id: string; type: "success" | "error"; message: string };

export function flashCookie(message: string, type: Flash["type"] = "success") {
  const value: Flash = { id: crypto.randomUUID(), type, message };
  return {
    name: FLASH_COOKIE,
    value: encodeURIComponent(JSON.stringify(value)),
    // ไม่ใช่ httpOnly เพราะหน้าเว็บต้องลบ cookie นี้ได้หลังแสดงผล (ไม่มีข้อมูลลับอยู่ข้างใน)
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  };
}

/** ใช้ใน Server Action ก่อน redirect() */
export async function setFlash(message: string, type: Flash["type"] = "success") {
  (await cookies()).set(flashCookie(message, type));
}

/** ใช้ใน layout เพื่อส่งให้ FlashDialog */
export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Flash;
    return typeof parsed.message === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}
