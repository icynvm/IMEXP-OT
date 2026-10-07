"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { notifyOtRequestSubmitted } from "@/lib/email/notify";
import { toThaiMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { formValues, invalid, otRequestSchema } from "@/lib/validation";

/** ยื่นคำขอทำ OT */
export async function submitOtRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const values = formValues(formData);
  const parsed = otRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("submit_ot_request", {
    p_request_date: d.request_date,
    p_work_date: d.work_date,
    p_period: d.period,
    p_start_time: d.start_time,
    p_end_time: d.end_time,
    p_description: d.description,
  });
  if (error) return { ok: false, message: toThaiMessage(error), values };

  // ส่งอีเมลแจ้งหัวหน้า หลังตอบกลับผู้ใช้แล้ว (ไม่ต้องรอ)
  after(() => notifyOtRequestSubmitted(id as string));

  revalidatePath("/", "layout");
  redirect(`/ot-requests?message=${encodeURIComponent("ส่งคำขอทำ OT เรียบร้อย รอหัวหน้าอนุมัติ")}`);
}

/** ยกเลิกคำขอทำ OT (ได้เฉพาะที่ยังรออนุมัติ) */
export async function cancelOtRequest(id: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_ot_request", { p_id: id });
  if (error) return { ok: false, message: toThaiMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true, message: "ยกเลิกคำขอแล้ว" };
}
