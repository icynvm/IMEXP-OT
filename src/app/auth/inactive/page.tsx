import { LogOut, UserX } from "lucide-react";
import type { Metadata } from "next";
import { logout } from "@/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "บัญชีถูกปิดการใช้งาน" };

export default function InactivePage() {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AuthCard title="บัญชีของคุณถูกปิดการใช้งาน" description="กรุณาติดต่อผู้ดูแลระบบ (admin) หากคิดว่าเป็นความผิดพลาด">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
              <UserX className="size-6" />
            </div>
            <form action={logout}>
              <SubmitButton variant="outline" pendingText="กำลังออก...">
                <LogOut />
                ออกจากระบบ
              </SubmitButton>
            </form>
          </div>
        </AuthCard>
      </div>
    </main>
  );
}
