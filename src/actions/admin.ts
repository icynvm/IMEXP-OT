"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toThaiMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { adminUserSchema, formValues, invalid } from "@/lib/validation";

/** admin แก้ไขข้อมูลผู้ใช้: ชื่อ, รหัสพนักงาน, บทบาท, หัวหน้า, เปิด/ปิดการใช้งาน */
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
    p_is_active: d.is_active,
  });
  if (error) return { ok: false, message: toThaiMessage(error), values };

  revalidatePath("/", "layout");
  redirect(`/admin/users?message=${encodeURIComponent("บันทึกข้อมูลผู้ใช้เรียบร้อย")}`);
}
