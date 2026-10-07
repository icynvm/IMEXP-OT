import type { Metadata } from "next";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "บัญชีถูกปิดการใช้งาน" };

export default function InactivePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">บัญชีของคุณถูกปิดการใช้งาน</h1>
        <p className="text-sm text-gray-600">กรุณาติดต่อผู้ดูแลระบบ (admin) หากคิดว่าเป็นความผิดพลาด</p>
        <form action={logout}>
          <SubmitButton variant="secondary" pendingText="กำลังออก...">
            ออกจากระบบ
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
