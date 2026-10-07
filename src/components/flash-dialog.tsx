"use client";

import { CircleCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * กล่องแจ้งเตือน (Radix Dialog) หลังบันทึกสำเร็จ
 * อ่านข้อความจาก URL (?message=...) แล้วลบออกจาก URL เมื่อปิด เพื่อไม่ให้เด้งซ้ำตอนรีเฟรช
 */
export function FlashDialog() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const message = params.get("message");
  const [dismissed, setDismissed] = useState<string | null>(null);

  function close() {
    setDismissed(message);
    const next = new URLSearchParams(params);
    next.delete("message");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Dialog open={Boolean(message) && dismissed !== message} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleCheck className="size-6" />
          </div>
          <DialogTitle>สำเร็จ</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={close} className="w-full sm:w-auto">
            ตกลง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
