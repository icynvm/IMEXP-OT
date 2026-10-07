import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="สมัครสมาชิก"
      description="หลังสมัคร กรุณากดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ"
      footer={
        <>
          มีบัญชีแล้ว?&nbsp;
          <Link href="/login" className="text-primary font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
