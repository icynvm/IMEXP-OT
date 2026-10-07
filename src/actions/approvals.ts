"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { notifyOtRequestReviewed, notifyOtUsageReviewed } from "@/lib/email/notify";
import { toThaiMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { invalid, reviewSchema } from "@/lib/validation";

/**
 * อนุมัติ / ไม่อนุมัติ  (kind = "request" คำขอทำ OT, "usage" คำขอใช้ OT)
 * สิทธิ์ถูกตรวจซ้ำในฐานข้อมูล: หัวหน้าอนุมัติได้เฉพาะลูกทีม / อนุมัติของตัวเองไม่ได้
 */
export async function review(
  kind: "request" | "usage",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser(["admin", "supervisor"]);
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, decision, note } = parsed.data;

  if (decision === "reject" && !note) {
    return { ok: false, errors: { note: ["กรุณาระบุเหตุผลที่ไม่อนุมัติ"] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(kind === "request" ? "review_ot_request" : "review_ot_usage", {
    p_id: id,
    p_approve: decision === "approve",
    p_note: note ?? null,
  });
  if (error) return { ok: false, message: toThaiMessage(error) };

  after(() => (kind === "request" ? notifyOtRequestReviewed(id) : notifyOtUsageReviewed(id)));

  revalidatePath("/", "layout");
  const message = decision === "approve" ? "อนุมัติเรียบร้อย ระบบแจ้งพนักงานทางอีเมลแล้ว" : "บันทึกการไม่อนุมัติเรียบร้อย ระบบแจ้งพนักงานทางอีเมลแล้ว";
  redirect(`/approvals?message=${encodeURIComponent(message)}`);
}
