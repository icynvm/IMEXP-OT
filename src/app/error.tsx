"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// แสดงเมื่อเกิดข้อผิดพลาดที่ไม่คาดคิดในหน้าใดก็ตาม
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="text-destructive size-10" />
      <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="text-muted-foreground text-sm">{error.message || "กรุณาลองใหม่อีกครั้ง"}</p>
      {error.digest && <p className="text-muted-foreground text-xs">รหัสอ้างอิง: {error.digest}</p>}
      <Button onClick={reset}>
        <RotateCcw />
        ลองใหม่
      </Button>
    </main>
  );
}
