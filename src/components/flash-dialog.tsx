"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Flash } from "@/lib/flash";
import { cn } from "@/lib/utils";

/**
 * กล่องแจ้งผล (Radix Dialog) หลังบันทึก
 * ข้อความมาจาก cookie "flash" (ดู src/lib/flash.ts) — แสดงครั้งเดียวแล้วลบ cookie ทิ้ง
 */
export function FlashDialog({ flash }: { flash: Flash | null }) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // ลบ cookie ทันทีที่ได้รับข้อความ ป้องกันกล่องเด้งซ้ำตอนเปลี่ยนหน้า/รีเฟรช
  useEffect(() => {
    if (flash) document.cookie = "flash=; Max-Age=0; path=/";
  }, [flash]);

  const open = Boolean(flash) && flash?.id !== dismissedId;
  const isError = flash?.type === "error";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setDismissedId(flash?.id ?? null)}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center sm:text-center">
          <div
            className={cn(
              "mb-2 flex size-12 items-center justify-center rounded-full",
              isError ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
            )}
          >
            {isError ? <CircleAlert className="size-6" /> : <CircleCheck className="size-6" />}
          </div>
          <DialogTitle>{isError ? "เกิดข้อผิดพลาด" : "สำเร็จ"}</DialogTitle>
          <DialogDescription>{flash?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => setDismissedId(flash?.id ?? null)} className="w-full sm:w-auto">
            ตกลง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
