import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentProfile } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่" };

export default async function ResetPasswordPage() {
  const profile = await getCurrentProfile();
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <AuthCard title="ตั้งรหัสผ่านใหม่">
          {profile ? (
            <ResetPasswordForm />
          ) : (
            <div className="grid gap-4">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <CircleAlert />
                <AlertDescription>ลิงก์หมดอายุหรือไม่ถูกต้อง</AlertDescription>
              </Alert>
              <Link href="/forgot-password" className="text-primary text-sm hover:underline">
                ขอลิงก์ตั้งรหัสผ่านใหม่
              </Link>
            </div>
          )}
        </AuthCard>
      </div>
    </main>
  );
}
