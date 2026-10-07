"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toThaiMessage } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { adminUserSchema, departmentSchema, formValues, invalid } from "@/lib/validation";

/** admin แก้ไขข้อมูลผู้ใช้: ชื่อ, รหัสพนักงาน, บทบาท, หัวหน้า, แผนก, เปิด/ปิดการใช้งาน */
export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["admin"]);
  const values = formValues(formData);
  const parsed = adminUserSchema.safeParse({
    ...Object.fromEntries(formData),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) return invalid(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_user", {
    p_user_id: d.user_id,
    p_first_name: d.first_name,
    p_last_name: d.last_name,
    p_employee_code: d.employee_code,
    p_role: d.role,
    p_supervisor_id: d.supervisor_id,
    p_department_id: d.department_id,
    p_is_active: d.is_active,
  });
  if (error) return { ok: false, message: toThaiMessage(error), values };

  revalidatePath("/", "layout");
  await setFlash("บันทึกข้อมูลผู้ใช้เรียบร้อย");
  redirect("/admin/users");
}

/** admin สร้าง / แก้ไขแผนก (ฟอร์มส่ง id ว่าง = สร้างใหม่) */
export async function saveDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["admin"]);
  const values = formValues(formData);
  const parsed = departmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_department", {
    p_id: d.id,
    p_name: d.name,
    p_head_id: d.head_id,
  });
  if (error) return { ok: false, message: toThaiMessage(error), values };

  revalidatePath("/", "layout");
  await setFlash(d.id ? "บันทึกข้อมูลแผนกเรียบร้อย" : "สร้างแผนกเรียบร้อย");
  redirect("/admin/departments");
}

/** admin ลบแผนก (สมาชิกจะเป็น "ไม่มีแผนก" ข้อมูล OT ไม่หาย) — ฟอร์มส่งช่อง id มา */
export async function deleteDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_department", { p_id: String(formData.get("id")) });
  if (error) return { ok: false, message: toThaiMessage(error) };

  revalidatePath("/", "layout");
  await setFlash("ลบแผนกเรียบร้อย");
  redirect("/admin/departments");
}
