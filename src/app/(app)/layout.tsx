import { AppShell } from "@/components/app-shell";
import { FlashDialog } from "@/components/flash-dialog";
import { isApprover, requireUser } from "@/lib/auth";
import { readFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

/** จำนวนรายการที่รออนุมัติ (แสดงเป็นตัวเลขสีแดงบนเมนู) */
async function countPendingApprovals(userId: string) {
  const supabase = await createClient();
  const [r, u] = await Promise.all([
    supabase.from("ot_requests").select("id", { count: "exact", head: true }).eq("status", "pending").neq("employee_id", userId),
    supabase.from("ot_usages").select("id", { count: "exact", head: true }).eq("status", "pending").neq("employee_id", userId),
  ]);
  return (r.count ?? 0) + (u.count ?? 0);
}

// โครงหน้าสำหรับทุกหน้าที่ต้อง login: เมนู + เนื้อหา + กล่องแจ้งเตือนหลังบันทึกสำเร็จ
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const pendingCount = isApprover(user) ? await countPendingApprovals(user.id) : 0;

  return (
    <AppShell user={user} pendingCount={pendingCount}>
      {children}
      <FlashDialog flash={await readFlash()} />
    </AppShell>
  );
}
