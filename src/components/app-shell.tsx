"use client";

import {
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PartyPopper,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/user-avatar";
import { APPROVER_ROLES, ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const isApprover = (user: Profile) => APPROVER_ROLES.includes(user.role);

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };

/** เมนูตามบทบาท (แก้ชื่อเมนู / ไอคอน ได้ที่นี่ — ไอคอนดูได้ที่ https://lucide.dev/icons) */
function navItems(user: Profile, pendingCount: number): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
    { href: "/ot-requests", label: "คำขอทำ OT", icon: Clock3 },
    { href: "/ot-usages", label: "ใช้ชั่วโมง OT", icon: CalendarClock },
    { href: "/calendar", label: "ตารางวันหยุด", icon: CalendarDays },
    { href: "/profile", label: "โปรไฟล์", icon: UserRound },
  ];
  if (isApprover(user)) {
    const overviewLabel =
      user.role === "admin" ? "ภาพรวมทั้งหมด" : user.role === "department_head" ? "ภาพรวมแผนก" : "ภาพรวมทีม";
    items.push(
      { href: "/approvals", label: "รออนุมัติ", icon: ClipboardCheck, badge: pendingCount },
      { href: "/overview", label: overviewLabel, icon: History },
    );
  }
  if (user.role === "admin") {
    items.push(
      { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
      { href: "/admin/departments", label: "แผนก", icon: Building2 },
      { href: "/admin/holidays", label: "วันหยุดนักขัตฤกษ์", icon: PartyPopper },
    );
  }
  return items;
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <Clock3 className="size-4" />
      </span>
      ระบบขอ OT
    </Link>
  );
}

/** ไอคอนเมนู: ระหว่างกำลังเปิดหน้า จะเปลี่ยนเป็นวงหมุนให้รู้ว่ากดแล้ว */
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />;
}

function Nav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {items.map(({ href, label, icon, badge }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <NavIcon icon={icon} />
            <span className="flex-1">{label}</span>
            {badge ? (
              <span className="bg-destructive rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBox({ user, onNavigate }: { user: Profile; onNavigate?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      {/* กดที่รูป/ชื่อ -> หน้าโปรไฟล์ */}
      <Link href="/profile" onClick={onNavigate} className="hover:bg-muted/60 -m-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition-colors">
        <UserAvatar firstName={user.first_name} avatarPath={user.avatar_path} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {user.employee_code} · {ROLE_LABELS[user.role]}
          </p>
        </div>
      </Link>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="ออกจากระบบ" title="ออกจากระบบ">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

/** โครงหน้าหลังเข้าสู่ระบบ: แถบเมนูซ้าย (จอใหญ่) / เมนูแบบเลื่อนออก (มือถือ) */
export function AppShell({
  user,
  pendingCount,
  children,
}: {
  user: Profile;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const items = navItems(user, pendingCount);
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-muted/40 min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* จอใหญ่: แถบเมนูซ้าย */}
      <aside className="bg-background sticky top-0 hidden h-screen flex-col border-r lg:flex">
        <div className="flex h-16 items-center px-6">
          <Brand />
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4">
          <Nav items={items} />
        </div>
        <Separator />
        <div className="p-4">
          <UserBox user={user} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* มือถือ: แถบด้านบน + ปุ่มเปิดเมนู */}
        <header className="bg-background sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <Brand />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="เปิดเมนู" className="relative">
                <Menu />
                {pendingCount > 0 && <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 p-0">
              <SheetHeader className="h-14 justify-center px-6">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <Separator />
              <div className="flex-1 p-4">
                <Nav items={items} onNavigate={() => setOpen(false)} />
              </div>
              <Separator />
              <div className="p-4">
                <UserBox user={user} onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
