import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <SearchX className="text-muted-foreground size-10" />
      <h1 className="text-2xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
      <Button asChild>
        <Link href="/dashboard">กลับหน้าหลัก</Link>
      </Button>
    </main>
  );
}
