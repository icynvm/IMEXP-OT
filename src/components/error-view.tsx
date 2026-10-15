"use client";

import { House, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * หน้าจอ "เกิดข้อผิดพลาด" (ใช้ใน error.tsx)
 * - ไม่แสดง error.message: ตอนใช้งานจริง Next.js ซ่อนข้อความจริงไว้ (เป็นภาษาอังกฤษยาว ๆ) เพื่อความปลอดภัย
 * - "ลองใหม่" ใช้ retry() = โหลดข้อมูลจาก server ใหม่ (reset() แค่วาดหน้าเดิมซ้ำ ไม่ได้โหลดข้อมูลใหม่)
 * - รหัสอ้างอิง (digest) ใช้ค้น log ใน Vercel ว่าเกิดอะไรขึ้น
 */
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="text-destructive size-10" />
      <h1 className="text-xl font-semibold">โหลดข้อมูลไม่สำเร็จ</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        อาจเป็นเพราะอินเทอร์เน็ตหรือระบบขัดข้องชั่วคราว กรุณากดลองใหม่ ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบพร้อมรหัสอ้างอิงด้านล่าง
      </p>
      {error.digest && <p className="text-muted-foreground text-xs">รหัสอ้างอิง: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => startTransition(() => retry())} disabled={pending}>
          <RotateCcw className={pending ? "animate-spin" : undefined} />
          {pending ? "กำลังลองใหม่..." : "ลองใหม่"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <House />
            หน้าหลัก
          </Link>
        </Button>
      </div>
    </div>
  );
}
