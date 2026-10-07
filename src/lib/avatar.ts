/**
 * ลิงก์รูปโปรไฟล์ (bucket "avatars" เป็นแบบสาธารณะ จึงสร้างลิงก์ได้เลยไม่ต้องขอสิทธิ์)
 * ใช้ได้ทั้งฝั่ง server และหน้าเว็บ
 */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}
