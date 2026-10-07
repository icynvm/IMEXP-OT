"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toThaiMessage } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, formValues, invalid, profileSchema } from "@/lib/validation";

/** แก้ชื่อ-นามสกุลของตัวเอง */
export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_profile", {
    p_first_name: parsed.data.first_name,
    p_last_name: parsed.data.last_name,
  });
  if (error) return { ok: false, message: toThaiMessage(error), values };

  revalidatePath("/", "layout"); // ชื่อในเมนูซ้ายเปลี่ยนตาม
  await setFlash("บันทึกข้อมูลส่วนตัวเรียบร้อย");
  redirect("/profile");
}

/**
 * อัปโหลดรูปโปรไฟล์ — ฟอร์มส่งไฟล์ช่อง "avatar" (หน้าเว็บตัดเป็นสี่เหลี่ยมจัตุรัส + ย่อไว้แล้ว)
 * 1) อัปโหลดไฟล์ไปที่ avatars/<id ผู้ใช้>/<ชื่อสุ่ม>  (Storage อนุญาตเฉพาะโฟลเดอร์ของตัวเอง)
 * 2) บันทึกลงโปรไฟล์ผ่านฟังก์ชันในฐานข้อมูล set_my_avatar
 * 3) ลบไฟล์รูปเก่าทิ้ง
 */
export async function uploadAvatar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "กรุณาเลือกรูป" };
  const ext = AVATAR_TYPES[file.type];
  if (!ext) return { ok: false, message: "รองรับเฉพาะไฟล์รูป JPG, PNG หรือ WebP" };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, message: "รูปใหญ่เกินไป (ไม่เกิน 1 MB)" };

  const supabase = await createClient();
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) {
    console.error("[avatar] upload", upload.error);
    return { ok: false, message: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  const { data: oldPath, error } = await supabase.rpc("set_my_avatar", { p_path: path });
  if (error) {
    await supabase.storage.from("avatars").remove([path]); // ไม่ทิ้งไฟล์ค้างไว้
    return { ok: false, message: toThaiMessage(error) };
  }
  if (oldPath) await supabase.storage.from("avatars").remove([oldPath as string]);

  revalidatePath("/", "layout");
  await setFlash("เปลี่ยนรูปโปรไฟล์เรียบร้อย");
  redirect("/profile");
}

/** ลบรูปโปรไฟล์ (กลับไปแสดงตัวอักษรแรกของชื่อ) */
export async function removeAvatar(): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { data: oldPath, error } = await supabase.rpc("set_my_avatar", { p_path: null });
  if (error) return { ok: false, message: toThaiMessage(error) };
  if (oldPath) await supabase.storage.from("avatars").remove([oldPath as string]);

  revalidatePath("/", "layout");
  await setFlash("ลบรูปโปรไฟล์เรียบร้อย");
  redirect("/profile");
}
