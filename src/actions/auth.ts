"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { toThaiAuthMessage } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LIMITS, clientIp, isRateLimited, recordAttempt } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import {
  forgotPasswordSchema,
  formValues,
  invalid,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";

const PASSWORD_FIELDS = ["password", "confirm_password"];

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData, PASSWORD_FIELDS);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const { identifier, password } = parsed.data;

  // กันเดารหัสผ่าน: ผิดเกินกำหนด -> ต้องรอ (นับเฉพาะครั้งที่ผิด)
  const ip = await clientIp();
  const limits = [LIMITS.loginPerAccount(ip, identifier), LIMITS.loginPerIp(ip)];
  if (await isRateLimited(limits)) {
    return { ok: false, message: "กรอกรหัสผ่านผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่ หรือกด \"ลืมรหัสผ่าน?\"", values };
  }
  const fail = async (message: string) => {
    await recordAttempt(limits);
    return { ok: false, message, values };
  };

  // กรอกรหัสพนักงาน -> หาอีเมลของรหัสนั้นก่อน (Supabase Auth login ได้ด้วยอีเมลเท่านั้น)
  // รหัสพนักงานเก็บเป็นตัวพิมพ์ใหญ่เสมอ จึงแปลงก่อนค้น ("emp001" = "EMP001")
  let email = identifier.toLowerCase();
  if (!identifier.includes("@")) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("employee_code", identifier.toUpperCase())
      .maybeSingle();
    // ไม่พบรหัส -> ตอบข้อความเดียวกับรหัสผ่านผิด (ไม่บอกว่ารหัสพนักงานนี้มีในระบบหรือไม่)
    if (!data) return fail(toThaiAuthMessage({ code: "invalid_credentials" }));
    email = data.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // ยังไม่ยืนยันอีเมล ไม่ใช่การเดารหัส -> ไม่นับ
    if (error.code === "email_not_confirmed") return { ok: false, message: toThaiAuthMessage(error), values };
    return fail(toThaiAuthMessage(error));
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData, PASSWORD_FIELDS);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);
  const { email, password, first_name, last_name, employee_code } = parsed.data;

  // กันสมัครถี่ ๆ (บอท / สแปม)
  const ip = await clientIp();
  if (await isRateLimited([LIMITS.signupPerIp(ip)])) {
    return { ok: false, message: "มีการสมัครจากเครือข่ายนี้มากเกินไป กรุณาลองใหม่ภายหลัง", values };
  }
  await recordAttempt([LIMITS.signupPerIp(ip)]);

  const supabase = await createClient();
  // โดเมนอีเมลที่ admin อนุญาต (ฐานข้อมูลตรวจซ้ำตอนสร้างบัญชี กันการสมัครผ่าน API ตรง)
  const { data: emailAllowed } = await supabase.rpc("signup_email_allowed", { p_email: email });
  if (emailAllowed === false) {
    return { ok: false, errors: { email: ["อีเมลโดเมนนี้สมัครใช้งานไม่ได้ กรุณาใช้อีเมลของบริษัท"] }, values };
  }

  // เช็กรหัสพนักงานซ้ำก่อน เพื่อแจ้ง error ที่ชัดเจน (ฐานข้อมูลกันซ้ำอีกชั้นด้วย unique)
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("employee_code", employee_code);
  if (count) {
    return { ok: false, errors: { employee_code: ["รหัสพนักงานนี้ถูกใช้สมัครแล้ว"] }, values };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ข้อมูลนี้จะถูกคัดลอกไปตาราง profiles โดย trigger ในฐานข้อมูล
      data: { first_name, last_name, employee_code },
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/dashboard`,
    },
  });
  if (error) return { ok: false, message: toThaiAuthMessage(error), values };

  // ถ้าปิดการยืนยันอีเมลใน Supabase จะได้ session ทันที
  if (data.session) redirect("/dashboard");

  await setFlash("สมัครสำเร็จ! กรุณากดลิงก์ยืนยันในอีเมลของคุณก่อนเข้าสู่ระบบ");
  // หน้า สมัคร → login ใช้ layout เดียวกัน ต้องสั่งโหลด layout ใหม่เพื่อให้อ่านข้อความแจ้งผล
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  // กันยิงอีเมลลืมรหัสผ่านถี่ ๆ (ทั้งจากเครื่องเดียว และใส่อีเมลคนอื่นซ้ำ ๆ)
  const ip = await clientIp();
  if (await isRateLimited([LIMITS.resetPerIp(ip)])) {
    return { ok: false, message: "ขอลิงก์บ่อยเกินไป กรุณาลองใหม่ภายหลัง", values };
  }
  const perEmail = LIMITS.resetPerEmail(parsed.data.email);
  const emailBlocked = await isRateLimited([perEmail]);
  await recordAttempt([LIMITS.resetPerIp(ip), perEmail]);

  // อีเมลนี้ขอบ่อยเกินไป -> ไม่ส่ง แต่ตอบเหมือนเดิม (ไม่บอกว่าอีเมลมีในระบบหรือถูกจำกัด)
  if (!emailBlocked) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.siteUrl}/auth/confirm?next=/auth/reset-password`,
    });
    if (error && error.code?.startsWith("over_")) {
      return { ok: false, message: toThaiAuthMessage(error), values };
    }
  }
  // ตอบเหมือนกันเสมอ ไม่บอกว่าอีเมลมีในระบบหรือไม่ (กันการสุ่มเดาอีเมล)
  return {
    ok: true,
    message: "หากอีเมลนี้มีในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจสอบกล่องจดหมาย",
  };
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { ok: false, message: "ลิงก์หมดอายุ กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: toThaiAuthMessage(error) };

  await setFlash("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
  redirect("/dashboard");
}
