import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { getCurrentProfile } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่" };

export default async function ResetPasswordPage() {
  const profile = await getCurrentProfile();
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold">ตั้งรหัสผ่านใหม่</h1>
        {profile ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-4">
            <Alert tone="error">ลิงก์หมดอายุหรือไม่ถูกต้อง</Alert>
            <Link href="/forgot-password" className="text-sm text-blue-700 hover:underline">
              ขอลิงก์ตั้งรหัสผ่านใหม่
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
