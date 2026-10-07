import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * แสดงทันทีที่กดเปลี่ยนหน้า ระหว่างรอข้อมูลจาก server
 * (Next.js ใช้ไฟล์ loading.tsx นี้กับทุกหน้าในกลุ่ม (app) อัตโนมัติ)
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        กำลังโหลดข้อมูล...
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="gap-0 py-0">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
