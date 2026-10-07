import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="ลืมรหัสผ่าน"
      description="กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้"
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
