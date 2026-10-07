import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { message, next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">เข้าสู่ระบบ</h1>
      <div className="mb-4 space-y-2">
        {typeof message === "string" && <Alert tone="success">{message}</Alert>}
        {typeof error === "string" && <Alert tone="error">{error}</Alert>}
      </div>
      <LoginForm next={typeof next === "string" ? next : ""} />
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-blue-700 hover:underline">
          ลืมรหัสผ่าน?
        </Link>
        <Link href="/register" className="text-blue-700 hover:underline">
          สมัครสมาชิก
        </Link>
      </div>
    </>
  );
}
