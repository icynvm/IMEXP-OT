/**
 * fetch ที่มีเวลาจำกัด สำหรับเรียก Supabase
 * ทำไม: ถ้า Supabase ช้าผิดปกติ/ล่ม คำขอจะค้างไม่มีกำหนด ผู้ใช้เห็นหน้าโหลด (skeleton) ไปเรื่อย ๆ
 * จำกัดไว้ 15 วินาที -> เกินแล้วแสดงหน้า "เกิดข้อผิดพลาด" พร้อมปุ่มลองใหม่แทน
 */
const TIMEOUT_MS = 15_000;

export const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};
