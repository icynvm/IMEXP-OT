import { Clock3 } from "lucide-react";
import { FlashDialog } from "@/components/flash-dialog";
import { readFlash } from "@/lib/flash";

// โครงหน้าสำหรับ หน้า login / สมัคร / ลืมรหัสผ่าน
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl shadow-sm">
            <Clock3 className="size-5" />
          </span>
          <p className="text-xl font-semibold tracking-tight">ระบบขอ OT</p>
          <p className="text-muted-foreground text-sm">ขอทำ OT · ใช้ชั่วโมงสะสม · ติดตามยอดคงเหลือ</p>
        </div>
        {children}
      </div>
      <FlashDialog flash={await readFlash()} />
    </main>
  );
}
