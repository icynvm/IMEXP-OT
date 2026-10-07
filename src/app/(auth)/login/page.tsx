import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <AuthCard
      title="เข้าสู่ระบบ"
      description="ใช้อีเมลและรหัสผ่านที่สมัครไว้"
      footer={
        <>
          ยังไม่มีบัญชี?&nbsp;
          <Link href="/register" className="text-primary font-medium hover:underline">
            สมัครสมาชิก
          </Link>
        </>
      }
    >
      <LoginForm next={typeof next === "string" ? next : ""} />
    </AuthCard>
  );
}
