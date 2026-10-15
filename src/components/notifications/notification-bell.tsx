"use client";

import { Bell, CalendarClock, Clock3, Inbox } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatHours } from "@/lib/format";
import type { ApprovalNotifications } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PushToggle } from "./push-toggle";
import { notificationKey } from "./use-approval-notifications";

const SEEN_KEY = "ot-bell-seen-at"; // เวลาที่เปิดดูกระดิ่งล่าสุด (เก็บในเครื่อง) ใช้ทำเครื่องหมาย "ใหม่"
const SEEN_EVENT = "ot-bell-seen";

function subscribeSeen(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SEEN_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SEEN_EVENT, callback);
  };
}

function readSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return formatDate(iso.slice(0, 10));
}

/** กระดิ่งแจ้งเตือนของหัวหน้า/admin: คำขอที่รออนุมัติ + ปุ่มเปิดแจ้งเตือนบนอุปกรณ์ */
export function NotificationBell({ data }: { data: ApprovalNotifications }) {
  const [open, setOpen] = useState(false);
  // ค่าในเครื่อง (ตอน render บน server ถือว่าเห็นหมดแล้ว "9999" กัน hydration ไม่ตรง)
  const storedSeenAt = useSyncExternalStore(subscribeSeen, readSeenAt, () => "9999");
  // ระหว่างเปิดกระดิ่ง ใช้ค่าก่อนเปิด เพื่อยังเห็นว่ารายการไหน "ใหม่"
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const lastSeen = seenAt ?? storedSeenAt;
  const unseen = data.items.filter((n) => n.createdAt > lastSeen).length;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSeenAt(storedSeenAt);
      try {
        localStorage.setItem(SEEN_KEY, new Date().toISOString());
        window.dispatchEvent(new Event(SEEN_EVENT));
      } catch {
        // โหมดไม่ระบุตัวตน ฯลฯ: ไม่จำก็ไม่เป็นไร
      }
    } else {
      setSeenAt(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={data.total > 0 ? `การแจ้งเตือน: รออนุมัติ ${data.total} รายการ` : "การแจ้งเตือน"}
          data-testid="notification-bell"
        >
          <Bell />
          {data.total > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums",
                unseen > 0 ? "bg-destructive" : "bg-muted-foreground",
              )}
            >
              {data.total > 99 ? "99+" : data.total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">การแจ้งเตือน</p>
          {data.total > 0 && <span className="text-muted-foreground text-xs">รออนุมัติ {data.total} รายการ</span>}
        </div>
        <Separator />
        {data.items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-8 text-sm">
            <Inbox className="size-6" />
            ไม่มีคำขอรออนุมัติ
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {data.items.map((n) => {
              const isNew = n.createdAt > lastSeen;
              const Icon = n.kind === "request" ? Clock3 : CalendarClock;
              return (
                <li key={notificationKey(n)}>
                  <Link
                    href="/approvals"
                    onClick={() => setOpen(false)}
                    className={cn("hover:bg-muted/60 flex gap-3 px-4 py-3 transition-colors", isNew && "bg-primary/5")}
                  >
                    <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate">
                        <span className="font-medium">{n.employeeName}</span>{" "}
                        {n.kind === "request" ? "ขอทำ OT" : "ขอใช้ชั่วโมง OT"}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {formatDate(n.date)} · {formatHours(n.hours)} · {timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {isNew && <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" aria-label="ใหม่" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Separator />
        <div className="grid gap-3 p-4">
          <Button asChild size="sm" variant="secondary" className="w-full">
            <Link href="/approvals" onClick={() => setOpen(false)}>
              ไปหน้ารออนุมัติ
            </Link>
          </Button>
          <PushToggle compact />
        </div>
      </PopoverContent>
    </Popover>
  );
}
