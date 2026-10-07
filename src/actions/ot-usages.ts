"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { notifyOtUsageSubmitted } from "@/lib/email/notify";
import { toThaiMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { formValues, invalid, otUsageSchema } from "@/lib/validation";

/**
 * ยื่นคำขอใช้ชั่วโมง OT
 * ฟอร์มส่งช่อง "alloc:<id คำขอ OT>" = จำนวนชั่วโมงที่จะตัดจากคำขอนั้น
 */
export async function submitOtUsage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const values = formValues(formData);

  const allocations: { ot_request_id: string; hours: number }[] = [];
  formData.forEach((value, key) => {
    if (!key.startsWith("alloc:") || typeof value !== "string" || value.trim() === "") return;
    const hours = Number(value);
    if (hours !== 0) allocations.push({ ot_request_id: key.slice("alloc:".length), hours });
  });

  const parsed = otUsageSchema.safeParse({
    use_date: formData.get("use_date"),
    reason: formData.get("reason") ?? undefined,
    allocations,
  });
  if (!parsed.success) return invalid(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("submit_ot_usage", {
    p_use_date: d.use_date,
    p_reason: d.reason ?? null,
    p_allocations: d.allocations,
  });
  if (error) return { ok: false, message: toThaiMessage(error), values };

  after(() => notifyOtUsageSubmitted(id as string));

  revalidatePath("/", "layout");
  redirect(`/ot-usages?message=${encodeURIComponent("ส่งคำขอใช้ OT เรียบร้อย รอหัวหน้าอนุมัติ")}`);
}

/** ยกเลิกคำขอใช้ OT (ชั่วโมงที่จองไว้จะคืนเข้ายอดคงเหลือ) — ฟอร์มส่งช่อง id มา */
export async function cancelOtUsage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_ot_usage", { p_id: String(formData.get("id")) });
  if (error) return { ok: false, message: toThaiMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/ot-usages?message=${encodeURIComponent("ยกเลิกคำขอแล้ว ชั่วโมงที่จองไว้คืนเข้ายอดคงเหลือ")}`);
}
