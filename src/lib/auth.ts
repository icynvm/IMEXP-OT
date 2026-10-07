import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APPROVER_ROLES } from "@/lib/constants";
import type { Profile, Role } from "@/lib/types";

/**
 * ดึงข้อมูลผู้ใช้ที่ login อยู่ (เรียกกี่ครั้งใน 1 request ก็ query แค่ครั้งเดียว)
 * คืน null ถ้ายังไม่ login
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  // getClaims() ตรวจลายเซ็น token จริง (ปลอดภัยกว่า getSession())
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, employee_code, first_name, last_name, email, role, supervisor_id, department_id, is_active")
    .eq("id", userId)
    .maybeSingle<Profile>();

  return profile ?? null;
});

/**
 * ใช้ที่หัวทุกหน้า/ทุก Server Action ที่ต้อง login
 *   requireUser()                       -> ทุกบทบาท
 *   requireUser(["admin"])              -> เฉพาะ admin
 *   requireUser(APPROVER_ROLES)          -> admin, หัวหน้าแผนก, หัวหน้าทีม
 * ถ้าไม่มีสิทธิ์ จะถูกพาไปหน้าอื่นอัตโนมัติ
 */
export async function requireUser(roles?: Role[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/auth/inactive");
  if (roles && !roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

/** หัวหน้าทีม / หัวหน้าแผนก / admin: อนุมัติคำขอของคนอื่นได้ และคำขอของตัวเองอนุมัติอัตโนมัติ */
export function isApprover(profile: Pick<Profile, "role">): boolean {
  return APPROVER_ROLES.includes(profile.role);
}
