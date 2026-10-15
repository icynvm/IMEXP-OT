import { AppShell } from "@/components/app-shell";
import { FlashDialog } from "@/components/flash-dialog";
import { isApprover, requireUser } from "@/lib/auth";
import { readFlash } from "@/lib/flash";
import { getApprovalNotifications } from "@/lib/data";

// โครงหน้าสำหรับทุกหน้าที่ต้อง login: เมนู + เนื้อหา + กล่องแจ้งเตือนหลังบันทึกสำเร็จ
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // กระดิ่งแจ้งเตือน + ตัวเลขบนเมนู "รออนุมัติ" (เฉพาะหัวหน้า/admin)
  const notifications = isApprover(user)
    ? await getApprovalNotifications(user.id)
    : null;

  return (
    <AppShell user={user} notifications={notifications}>
      {children}
      <FlashDialog flash={await readFlash()} />
    </AppShell>
  );
}
