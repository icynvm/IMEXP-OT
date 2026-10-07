import Link from "next/link";
import { logout } from "@/actions/auth";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { SubmitButton } from "@/components/ui/submit-button";
import { isApprover, requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
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

// โครงหน้าสำหรับทุกหน้าที่ต้อง login: แถบเมนูด้านบน + เนื้อหา
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  const items: NavItem[] = [
    { href: "/dashboard", label: "หน้าหลัก" },
    { href: "/ot-requests", label: "คำขอทำ OT" },
    { href: "/ot-usages", label: "ใช้ชั่วโมง OT" },
  ];
  if (isApprover(user)) {
    items.push(
      { href: "/approvals", label: "รออนุมัติ", badge: await countPendingApprovals(user.id) },
      { href: "/overview", label: user.role === "admin" ? "ภาพรวมทั้งหมด" : "ภาพรวมทีม" },
    );
  }
  if (user.role === "admin") {
    items.push({ href: "/admin/users", label: "จัดการผู้ใช้" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link href="/dashboard" className="text-lg font-bold text-blue-700">
              ระบบขอ OT
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm leading-tight">
                <p className="font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {user.employee_code} · {ROLE_LABELS[user.role]}
                </p>
              </div>
              <form action={logout}>
                <SubmitButton variant="secondary" size="sm" pendingText="...">
                  ออกจากระบบ
                </SubmitButton>
              </form>
            </div>
          </div>
          <NavLinks items={items} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
